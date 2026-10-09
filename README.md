# Desk Duel

**Flick. Fight. Win.** A browser pen-fight game inspired by the school-desk classic.

> Status: classroom edition with offline AI/local play (vs AI, local 2-player, best-of-5, settings). Online play, MongoDB and stats come next.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000

To test on a phone, put it on the same Wi-Fi and open `http://<your-computer-LAN-IP>:3000`.

The game loads Matter.js and Google Fonts from a CDN, so you need an internet connection.
If fonts are blocked the game falls back to system fonts. If Matter.js is blocked the game shows an error.

## Controls

Press your pen, drag backwards, release. Farther pull = stronger flick. A pen that leaves the desk loses the round; first to 3 round wins takes the match.

## Tuning the feel

Everything lives in `CONFIG` at the top of `js/physics.js`
(`maxSpeed`, `maxPull`, `deskFriction`, `frictionAir`, `spinFactor`, ...).


### Physics update
The current build uses a higher full-power launch speed, reduced air drag, more realistic desk friction/static friction, softer pen-to-pen impacts, and a Trimax-style procedural ballpoint model.

### Shot speed & pen progression

- Base shot speed is **50% faster** than the previous tuning.
- Higher-level pens have progressively higher launch strength.
- Level 1 is about **31% weaker than Level 10**, with smooth increases between levels.
- The same strength values are used by AI and Friends mode, so pen power stays consistent across modes.


## Account sign-in (Google + mobile OTP)

The classroom-themed **SIGN IN / ACCOUNT** page supports Google sign-in and phone-number SMS verification through Firebase Authentication. To activate it:

1. Create a Firebase project at https://console.firebase.google.com/ and register a Web app.
2. Copy the Web app config into `js/firebase-config.js`, replacing all `YOUR_...` placeholders.
3. In Firebase Console → Authentication → Sign-in method, enable **Email/Password**, **Google**, and **Phone**.
4. Add your deployed site domain under Authentication → Settings → Authorized domains. Email/password sign-in lets players create an account with a Gmail address and password. Indian phone sign-in always prepends **+91** and accepts a 10-digit local number. Phone sign-in (removed; Google and email/password only) uses Firebase's reCAPTCHA verifier and may require billing/quota configuration depending on your Firebase plan and region.
5. Deploy the updated project over HTTPS.

Game settings, player names, friends setup, and pen progression are stored in separate browser-local storage namespaces for each Firebase UID (plus a separate guest namespace). This prevents accounts from overwriting one another on the same browser. This version does **not** sync game progress across devices; cloud sync would require adding Firestore persistence. Authentication is not active until the Firebase config and providers are set up.


## 🔐 Google Sign-In Setup

The top-right **SIGN IN** link opens `signin.html`, which uses Firebase Authentication's Google provider. Before sign-in can work:

1. Register a Web app in Firebase project `deskdual-d9443`.
2. Copy the Web App `apiKey` and `appId` into `js/firebase-config.js`. The `apiKey` and `appId` placeholders must be replaced with your real values.
3. In Firebase Console → Authentication → Sign-in method, enable **Google**.
4. In Authentication → Settings → Authorized domains, add your Vercel hostname.
5. Deploy the updated files. Firebase's client web config is intended for browser apps; never place service-account private keys in this project.
