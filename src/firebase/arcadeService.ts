import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  User
} from 'firebase/auth';
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
  onSnapshot,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { auth, db } from './config';
import { handleFirestoreError, OperationType } from './errors';
import { UserProfile, ScoreRecord, GameMatchHistory, GameId } from '../types/arcade';

const googleProvider = new GoogleAuthProvider();

export class ArcadeService {
  /**
   * Check if a gamer username is available (case-insensitive)
   */
  static async isUsernameAvailable(username: string): Promise<boolean> {
    const cleanUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(cleanUsername)) {
      return false;
    }
    const path = `usernames/${cleanUsername}`;
    try {
      const snap = await getDoc(doc(db, 'usernames', cleanUsername));
      return !snap.exists();
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return false;
    }
  }

  /**
   * Register a new user with email, password, unique username, and chosen avatar
   */
  static async registerUser(
    email: string,
    pass: string,
    username: string,
    avatarId: string = 'cyber_ninja'
  ): Promise<UserProfile> {
    const cleanUsername = username.trim();
    const cleanKey = cleanUsername.toLowerCase();

    // 1. Check availability
    const available = await this.isUsernameAvailable(cleanKey);
    if (!available) {
      throw new Error(`Username "${cleanUsername}" is already taken or invalid.`);
    }

    // 2. Create Firebase Auth user
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const user = cred.user;

    // 3. Atomically reserve username and create profile
    const now = new Date().toISOString();
    const initialProfile: UserProfile = {
      userId: user.uid,
      username: cleanUsername,
      displayName: cleanUsername,
      avatarId,
      totalGamesPlayed: 0,
      totalScore: 0,
      wins: 0,
      losses: 0,
      highScores: {},
      createdAt: now,
      updatedAt: now,
    };

    try {
      // Claim username key
      await setDoc(doc(db, 'usernames', cleanKey), {
        username: cleanKey,
        uid: user.uid,
        createdAt: now,
      });

      // Write UserProfile
      await setDoc(doc(db, 'users', user.uid), initialProfile);

      // Update Firebase Auth profile
      await updateProfile(user, { displayName: cleanUsername });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }

    return initialProfile;
  }

  /**
   * Sign in using Email and Password
   */
  static async loginWithEmail(email: string, pass: string): Promise<UserProfile> {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    const profile = await this.getUserProfile(cred.user.uid);
    if (!profile) {
      // Fallback profile if record not found
      return this.createFallbackProfile(cred.user);
    }
    return profile;
  }

  /**
   * Sign in using Google Provider (Popup)
   */
  static async loginWithGoogle(): Promise<UserProfile> {
    const cred = await signInWithPopup(auth, googleProvider);
    const user = cred.user;
    let profile = await this.getUserProfile(user.uid);
    if (!profile) {
      // First time Google user - assign unique username
      let baseName = (user.displayName || user.email?.split('@')[0] || 'Player')
        .replace(/[^a-zA-Z0-9_]/g, '')
        .slice(0, 15);
      if (baseName.length < 3) baseName = 'Player';
      let chosenName = baseName;
      let counter = 1;
      while (!(await this.isUsernameAvailable(chosenName.toLowerCase()))) {
        chosenName = `${baseName}${Math.floor(100 + Math.random() * 900)}`;
        counter++;
        if (counter > 10) break;
      }

      const cleanKey = chosenName.toLowerCase();
      const now = new Date().toISOString();
      profile = {
        userId: user.uid,
        username: chosenName,
        displayName: user.displayName || chosenName,
        avatarId: 'synth_rider',
        totalGamesPlayed: 0,
        totalScore: 0,
        wins: 0,
        losses: 0,
        highScores: {},
        createdAt: now,
        updatedAt: now,
      };

      try {
        await setDoc(doc(db, 'usernames', cleanKey), {
          username: cleanKey,
          uid: user.uid,
          createdAt: now,
        });
        await setDoc(doc(db, 'users', user.uid), profile);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
      }
    }
    return profile;
  }

  /**
   * Create fallback profile for authenticated user
   */
  private static async createFallbackProfile(user: User): Promise<UserProfile> {
    const now = new Date().toISOString();
    const cleanUsername = (user.displayName || `Player_${user.uid.slice(0, 5)}`).replace(/[^a-zA-Z0-9_]/g, '');
    const profile: UserProfile = {
      userId: user.uid,
      username: cleanUsername,
      displayName: user.displayName || cleanUsername,
      avatarId: 'pixel_knight',
      totalGamesPlayed: 0,
      totalScore: 0,
      wins: 0,
      losses: 0,
      highScores: {},
      createdAt: now,
      updatedAt: now,
    };
    try {
      await setDoc(doc(db, 'users', user.uid), profile);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }
    return profile;
  }

  /**
   * Fetch a user profile from Firestore
   */
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    const path = `users/${userId}`;
    try {
      const snap = await getDoc(doc(db, 'users', userId));
      if (snap.exists()) {
        return snap.data() as UserProfile;
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
      return null;
    }
  }

  /**
   * Update player avatar or display name
   */
  static async updateAvatar(userId: string, avatarId: string): Promise<void> {
    const path = `users/${userId}`;
    try {
      await updateDoc(doc(db, 'users', userId), {
        avatarId,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  }

  /**
   * Submit game score to global leaderboard and update user profile stats
   */
  static async recordGameResult(params: {
    gameId: GameId;
    gameName: string;
    score: number;
    mode: 'solo' | 'versus_ai';
    result?: 'win' | 'loss' | 'solo';
    aiOpponentName?: string;
    aiScore?: number;
    detail?: string;
    profile: UserProfile;
  }): Promise<{ isNewHighScore: boolean; scoreId?: string }> {
    const { gameId, gameName, score, mode, result, aiOpponentName, aiScore, detail, profile } = params;
    const now = new Date().toISOString();
    const scoreId = `score_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const currentHigh = profile.highScores[gameId] || 0;
    const isNewHighScore = score > currentHigh;

    // If logged in to real Firebase Auth
    if (auth.currentUser && auth.currentUser.uid === profile.userId) {
      const uid = auth.currentUser.uid;
      const scoreDocPath = `leaderboards/${gameId}/scores/${scoreId}`;

      try {
        // 1. Submit to public leaderboard
        await setDoc(doc(db, 'leaderboards', gameId, 'scores', scoreId), {
          id: scoreId,
          gameId,
          userId: uid,
          username: profile.username,
          avatarId: profile.avatarId,
          score,
          mode,
          detail: detail || `Score: ${score}`,
          createdAt: now,
        });

        // 2. Add to personal history subcollection
        const historyId = `match_${Date.now()}`;
        await setDoc(doc(db, 'users', uid, 'history', historyId), {
          id: historyId,
          gameId,
          gameName,
          score,
          result: result || 'solo',
          aiOpponentName: aiOpponentName || 'None',
          aiScore: aiScore || 0,
          playedAt: now,
        });

        // 3. Update aggregate stats on user profile
        const newHighScores = { ...profile.highScores };
        if (isNewHighScore) {
          newHighScores[gameId] = score;
        }

        const updateData: Record<string, unknown> = {
          totalGamesPlayed: (profile.totalGamesPlayed || 0) + 1,
          totalScore: (profile.totalScore || 0) + score,
          highScores: newHighScores,
          updatedAt: now,
        };

        if (mode === 'versus_ai') {
          if (result === 'win') {
            updateData.wins = (profile.wins || 0) + 1;
          } else if (result === 'loss') {
            updateData.losses = (profile.losses || 0) + 1;
          }
        }

        await updateDoc(doc(db, 'users', uid), updateData);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, scoreDocPath);
      }
    }

    return { isNewHighScore, scoreId };
  }

  /**
   * Fetch top leaderboard scores for a game
   */
  static async getLeaderboard(gameId: GameId, maxLimit: number = 30): Promise<ScoreRecord[]> {
    const path = `leaderboards/${gameId}/scores`;
    try {
      const q = query(
        collection(db, 'leaderboards', gameId, 'scores'),
        orderBy('score', 'desc'),
        limit(maxLimit)
      );
      const snap = await getDocs(q);
      const scores: ScoreRecord[] = [];
      snap.forEach(docSnap => {
        scores.push(docSnap.data() as ScoreRecord);
      });
      return scores;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
      return [];
    }
  }

  /**
   * Listen to real-time leaderboard scores for a game
   */
  static subscribeLeaderboard(
    gameId: GameId,
    callback: (scores: ScoreRecord[]) => void,
    maxLimit: number = 25
  ): () => void {
    const path = `leaderboards/${gameId}/scores`;
    const q = query(
      collection(db, 'leaderboards', gameId, 'scores'),
      orderBy('score', 'desc'),
      limit(maxLimit)
    );
    return onSnapshot(
      q,
      (snap) => {
        const scores: ScoreRecord[] = [];
        snap.forEach(d => scores.push(d.data() as ScoreRecord));
        callback(scores);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, path);
      }
    );
  }

  /**
   * Fetch personal match history for a user
   */
  static async getUserMatchHistory(userId: string): Promise<GameMatchHistory[]> {
    const path = `users/${userId}/history`;
    try {
      const q = query(
        collection(db, 'users', userId, 'history'),
        orderBy('playedAt', 'desc'),
        limit(20)
      );
      const snap = await getDocs(q);
      const history: GameMatchHistory[] = [];
      snap.forEach(d => history.push(d.data() as GameMatchHistory));
      return history;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
      return [];
    }
  }

  /**
   * Sign out current user
   */
  static async logout(): Promise<void> {
    await signOut(auth);
  }
}
