# Neon Arcade Universe 🕹️

Retro-modern arcade gaming platform with 6 playable games, username-based player profiles, AI opponents, saved scores, and global leaderboards.

---

## 🚀 How to Launch on GitHub Pages

This repository is already configured with automated GitHub Actions deployment and relative asset bundling (`base: './'`).

### Step 1: Push or Export to GitHub
If you haven't yet created your repository on GitHub:
1. In AI Studio, click the **Export** or **GitHub** button in the header and choose **Push to GitHub**.
2. Or in your terminal:
   ```bash
   git init
   git add .
   git commit -m "feat: initial arcade release"
   git branch -M main
   git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO_NAME>.git
   git push -u origin main
   ```

### Step 2: Enable GitHub Pages in Repository Settings
1. Go to your repository on GitHub.
2. Click **Settings** (top navigation tab).
3. On the left sidebar, click **Pages**.
4. Under **Build and deployment** > **Source**, select **GitHub Actions**.
5. Once selected, pushing to `main` will automatically build and publish your site!
6. Your live arcade URL will be:
   ```
   https://<YOUR_USERNAME>.github.io/<YOUR_REPO_NAME>/
   ```

### Step 3: Authorize Domain in Firebase (For Logins)
To allow Firebase Authentication (Google Sign-In, Email Sign-in) on your GitHub Pages URL:
1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Select your project: `gen-lang-client-0240288195`.
3. In the left menu, go to **Authentication** > **Settings** > **Authorized domains**.
4. Click **Add domain** and enter:
   ```
   <YOUR_USERNAME>.github.io
   ```
5. Save. Your players can now log in, claim unique gamer tags, and save their scores to the global leaderboard from GitHub Pages!

---

## 🎮 Included Games
1. **Cyber Claw Machine**: Precision robotic crane grabber with skill-based drops and AI opponent (RoboClaw 3000).
2. **Neon Maze Runner**: Grid-based cyber maze with 4 unique AI ghost hunter behaviors and power pellets.
3. **Galactic Cyber Defender**: Top-down starfighter shooter with weapon upgrades and rival pilot Viper-7 Ace.
4. **Neon Cyber Bricks**: High-velocity breakout with multiballs, lasers, paddle expanders, and combo multipliers.
5. **Synthwave Highway 84**: Pseudo-3D neon highway racer with nitro boost and street rival Shadow-GT.
6. **Astro Gravity Lander**: Physics vector orbital lander with landing pad multipliers and Apollo-Drone 9.
