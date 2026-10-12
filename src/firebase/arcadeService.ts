import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot
} from 'firebase/firestore';
import { db } from './config';
import { handleFirestoreError, OperationType } from './errors';
import { GameId, PlayerRecord, ScoreRecord, MatchRecord } from '../types/arcade';

const PLAYER_ID_KEY = 'arcade_club_player_id';
const USERNAME_KEY = 'arcade_club_username';
const AVATAR_KEY = 'arcade_club_avatar';

export class ArcadeService {
  /**
   * Get or create a persistent, browser-specific Player ID (no account/login required)
   */
  static getOrCreatePlayerId(): string {
    let id = localStorage.getItem(PLAYER_ID_KEY);
    if (!id) {
      id = `plyr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(PLAYER_ID_KEY, id);
    }
    return id;
  }

  /**
   * Get locally saved username or default
   */
  static getStoredUsername(): string | null {
    return localStorage.getItem(USERNAME_KEY);
  }

  /**
   * Set and save username locally
   */
  static setStoredUsername(username: string): void {
    localStorage.setItem(USERNAME_KEY, username.trim());
  }

  /**
   * Get stored avatar
   */
  static getStoredAvatar(): string {
    return localStorage.getItem(AVATAR_KEY) || 'cyber_ninja';
  }

  static setStoredAvatar(avatarId: string): void {
    localStorage.setItem(AVATAR_KEY, avatarId);
  }

  /**
   * Fetch player profile from Firestore, or initialize if doesn't exist yet
   */
  static async getOrInitPlayer(username: string, avatarId: string = 'cyber_ninja'): Promise<PlayerRecord> {
    const playerId = this.getOrCreatePlayerId();
    const cleanUsername = username.trim() || 'Player_1';
    const now = new Date().toISOString();
    const path = `players/${playerId}`;

    try {
      const snap = await getDoc(doc(db, 'players', playerId));
      if (snap.exists()) {
        const data = snap.data() as PlayerRecord;
        // Keep updated username if changed
        if (data.username !== cleanUsername) {
          await updateDoc(doc(db, 'players', playerId), {
            username: cleanUsername,
            updatedAt: now,
          });
          data.username = cleanUsername;
        }
        return data;
      }

      // Initial record
      const initial: PlayerRecord = {
        playerId,
        username: cleanUsername,
        avatarId,
        gamesPlayed: 0,
        totalWins: 0,
        totalScore: 0,
        highScores: {},
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'players', playerId), initial);
      return initial;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
      // Fallback local return if offline
      return {
        playerId,
        username: cleanUsername,
        avatarId,
        gamesPlayed: 0,
        totalWins: 0,
        totalScore: 0,
        highScores: {},
        createdAt: now,
        updatedAt: now,
      };
    }
  }

  /**
   * Update display username in Firestore and localStorage
   */
  static async updateUsername(newUsername: string): Promise<void> {
    const playerId = this.getOrCreatePlayerId();
    const clean = newUsername.trim();
    if (!clean) return;
    this.setStoredUsername(clean);

    const path = `players/${playerId}`;
    try {
      await updateDoc(doc(db, 'players', playerId), {
        username: clean,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Could not sync username to Firestore:', err);
    }
  }

  /**
   * Update chosen avatar in Firestore and localStorage
   */
  static async updateAvatar(avatarId: string): Promise<void> {
    const playerId = this.getOrCreatePlayerId();
    this.setStoredAvatar(avatarId);
    const path = `players/${playerId}`;
    try {
      await updateDoc(doc(db, 'players', playerId), {
        avatarId,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Could not sync avatar to Firestore:', err);
    }
  }

  /**
   * Record a completed game score & match result to Firestore
   */
  static async recordGameResult(params: {
    gameId: GameId;
    score: number;
    mode: 'solo' | 'versus_ai';
    result?: 'win' | 'loss' | 'draw' | 'solo';
    aiScore?: number;
    detail?: string;
    player: PlayerRecord;
  }): Promise<{ isNewHighScore: boolean; scoreId: string }> {
    const { gameId, score, mode, result, aiScore, detail, player } = params;
    const playerId = player.playerId;
    const now = new Date().toISOString();
    const scoreId = `sc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const matchId = `mt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const currentBest = player.highScores[gameId] || 0;
    const isNewHighScore = score > currentBest;

    try {
      // 1. Write to /scores/{scoreId}
      const scoreDoc: ScoreRecord = {
        id: scoreId,
        playerId,
        username: player.username,
        gameId,
        score,
        mode,
        result: result || 'solo',
        detail: detail || `${score} pts`,
        createdAt: now,
      };
      await setDoc(doc(db, 'scores', scoreId), scoreDoc);

      // 2. Write to /matches/{matchId}
      const matchDoc: MatchRecord = {
        id: matchId,
        gameId,
        playerId,
        username: player.username,
        mode,
        playerScore: score,
        aiScore: aiScore || 0,
        winner: result === 'win' ? 'player' : result === 'loss' ? 'ai' : result === 'draw' ? 'draw' : 'solo',
        createdAt: now,
      };
      await setDoc(doc(db, 'matches', matchId), matchDoc);

      // 3. Update player aggregate profile
      const newHighScores = { ...player.highScores };
      if (isNewHighScore) {
        newHighScores[gameId] = score;
      }

      await updateDoc(doc(db, 'players', playerId), {
        gamesPlayed: (player.gamesPlayed || 0) + 1,
        totalScore: (player.totalScore || 0) + score,
        totalWins: result === 'win' ? (player.totalWins || 0) + 1 : (player.totalWins || 0),
        highScores: newHighScores,
        updatedAt: now,
      });
    } catch (err) {
      console.error('Error saving score to Firestore:', err);
    }

    return { isNewHighScore, scoreId };
  }

  /**
   * Fetch top leaderboard scores for a game with optional time filter
   */
  static async getLeaderboard(
    gameId: GameId,
    timeFilter: 'all' | 'daily' | 'weekly' = 'all',
    maxResults: number = 10
  ): Promise<ScoreRecord[]> {
    const path = 'scores';
    try {
      let records: ScoreRecord[] = [];

      try {
        // Preferred index query: where gameId == gameId, order by score desc
        const q = query(
          collection(db, 'scores'),
          where('gameId', '==', gameId),
          orderBy('score', 'desc'),
          limit(50)
        );
        const snap = await getDocs(q);
        snap.forEach((d) => {
          records.push(d.data() as ScoreRecord);
        });
      } catch (queryErr) {
        // If composite index is building or missing across new devices, fallback to client-side filtered query
        console.warn('Index query falling back to gameId-filtered snapshot:', queryErr);
        const fallbackQ = query(
          collection(db, 'scores'),
          where('gameId', '==', gameId),
          limit(100)
        );
        const snap = await getDocs(fallbackQ);
        snap.forEach((d) => {
          records.push(d.data() as ScoreRecord);
        });
        records.sort((a, b) => (b.score || 0) - (a.score || 0));
      }

      const nowMs = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      const oneWeekMs = 7 * oneDayMs;

      let filtered = records;
      if (timeFilter === 'daily') {
        filtered = filtered.filter((sc) => {
          const createdMs = new Date(sc.createdAt).getTime();
          return nowMs - createdMs <= oneDayMs;
        });
      } else if (timeFilter === 'weekly') {
        filtered = filtered.filter((sc) => {
          const createdMs = new Date(sc.createdAt).getTime();
          return nowMs - createdMs <= oneWeekMs;
        });
      }

      return filtered.slice(0, maxResults);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
      return [];
    }
  }

  /**
   * Realtime subscription to game leaderboard
   */
  static subscribeLeaderboard(
    gameId: GameId,
    callback: (scores: ScoreRecord[]) => void,
    maxResults: number = 10
  ): () => void {
    const path = 'scores';
    try {
      const q = query(
        collection(db, 'scores'),
        where('gameId', '==', gameId),
        limit(50)
      );

      return onSnapshot(
        q,
        (snap) => {
          const list: ScoreRecord[] = [];
          snap.forEach((d) => list.push(d.data() as ScoreRecord));
          list.sort((a, b) => (b.score || 0) - (a.score || 0));
          callback(list.slice(0, maxResults));
        },
        (err) => {
          console.warn('Realtime subscription error:', err);
          handleFirestoreError(err, OperationType.LIST, path);
        }
      );
    } catch (err) {
      console.warn('Failed to subscribe to leaderboard:', err);
      return () => {};
    }
  }

  /**
   * Fetch recent scores for the current player's browser
   */
  static async getPlayerScores(playerId: string): Promise<ScoreRecord[]> {
    const path = 'scores';
    try {
      let list: ScoreRecord[] = [];
      try {
        const q = query(
          collection(db, 'scores'),
          where('playerId', '==', playerId),
          orderBy('createdAt', 'desc'),
          limit(20)
        );
        const snap = await getDocs(q);
        snap.forEach((d) => list.push(d.data() as ScoreRecord));
      } catch (subErr) {
        // Fallback without orderBy if index is absent
        const fallbackQ = query(
          collection(db, 'scores'),
          where('playerId', '==', playerId),
          limit(30)
        );
        const snap = await getDocs(fallbackQ);
        snap.forEach((d) => list.push(d.data() as ScoreRecord));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      return list.slice(0, 20);
    } catch (err) {
      console.warn('Could not fetch player scores:', err);
      return [];
    }
  }
}
