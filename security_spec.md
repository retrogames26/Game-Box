# Security Specification: Neon Arcade Universe

## 1. Data Invariants
1. **User Identity Invariant**: A user document in `/users/{userId}` can only be created or updated if `request.auth.uid == userId`.
2. **Username Claim Invariant**: A username record `/usernames/{username}` can only be created if `request.auth.uid == incoming().uid`, the document does not exist yet, and the username matches lowercase alphanumeric/underscores (`^[a-z0-9_]{3,24}$`).
3. **Score Provenance Invariant**: Any score submitted to `/leaderboards/{gameId}/scores/{scoreId}` must have `incoming().userId == request.auth.uid` and valid numeric score bounded to non-negative numbers.
4. **History Isolation Invariant**: Personal match history `/users/{userId}/history/{historyId}` belongs strictly to the parent user `userId == request.auth.uid`.
5. **No Spoofing Invariant**: Users cannot modify another player's profile, overwrite claimed usernames, or alter another player's submitted scores.

## 2. The "Dirty Dozen" Malicious Payloads
1. **Payload 1: Impersonate user profile create**
   `POST /users/victim-uid` by `attacker-uid` with `{ "userId": "victim-uid", "username": "victim" }` -> EXPECT: REJECTED.
2. **Payload 2: Shadow field injection in UserProfile**
   `POST /users/my-uid` with `{ "userId": "my-uid", "username": "goodguy", "isAdmin": true, "superHacker": true }` -> EXPECT: REJECTED.
3. **Payload 3: Username stealing**
   `SET /usernames/pro_gamer` by `attacker-uid` when already claimed by `orig-uid` -> EXPECT: REJECTED.
4. **Payload 4: Invalid username format (XSS/SQLi attempt)**
   `SET /usernames/<script>alert(1)</script>` -> EXPECT: REJECTED.
5. **Payload 5: Negative or corrupt score submission**
   `POST /leaderboards/claw/scores/sc1` with `{ "score": -999999 }` -> EXPECT: REJECTED.
6. **Payload 6: Giant payload DoS attack**
   `POST /leaderboards/claw/scores/sc2` with a 2MB string in `detail` -> EXPECT: REJECTED.
7. **Payload 7: Score author spoofing**
   `POST /leaderboards/claw/scores/sc3` by `attacker-uid` claiming `userId: "leaderboard-champ"` -> EXPECT: REJECTED.
8. **Payload 8: Modify existing leaderboard score by non-owner**
   `UPDATE /leaderboards/claw/scores/champ_score` by `other-uid` setting score to 0 -> EXPECT: REJECTED.
9. **Payload 9: Write to unrelated root collection**
   `POST /admin_passwords` -> EXPECT: REJECTED (Global Deny-All).
10. **Payload 10: Inject unauthenticated match history**
   Unauthenticated `POST /users/some-uid/history/h1` -> EXPECT: REJECTED.
11. **Payload 11: Write history to another user's subcollection**
   `POST /users/victim-uid/history/h2` with `request.auth.uid == attacker-uid` -> EXPECT: REJECTED.
12. **Payload 12: Delete someone else's user profile**
   `DELETE /users/victim-uid` by `attacker-uid` -> EXPECT: REJECTED.

## 3. Test Matrix
All 12 attacks are blocked by the Master Gate, `isValidId`, `incoming().userId == request.auth.uid`, strict key allowlists, and global deny-all.
