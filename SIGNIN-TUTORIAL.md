# Firebase Google Sign-In Tutorial

This guide configures the **CONTINUE WITH GOOGLE** button on Desk Duel's
[sign-in page](./auth.html). The project uses the Firebase Web SDK loaded from
Google's CDN, so no Firebase npm package is required.

## 1. Create or open a Firebase project

1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Create a project, or select the project used for Desk Duel.
3. In **Project settings**, select **Your apps**.
4. Click the **Web** (`</>`) icon, enter a nickname such as `Desk Duel Web`,
   and register the app.
5. Keep the Firebase configuration visible for the next step.

Do not download a service-account key for this browser app. Service-account
keys are private server credentials and must never be committed to this
repository.

## 2. Add the Web app configuration

Open [`js/firebase-config.js`](./js/firebase-config.js) and replace the
`YOUR_FIREBASE_API_KEY` and `YOUR_FIREBASE_APP_ID` placeholders with the values
from the Firebase Web app configuration:

```js
export const firebaseConfig = {
  apiKey: 'your-api-key',
  authDomain: 'your-project.firebaseapp.com',
  projectId: 'your-project-id',
  appId: 'your-web-app-id'
};
```

Keep the existing `isFirebaseConfigured` export. The sign-in page uses it to
show a clear configuration error instead of attempting to initialize Firebase
with placeholder values.

Firebase Web app configuration values are intended to be present in frontend
code. They do not grant database access by themselves. Protect any Firestore,
Storage, or other backend resources with Firebase Security Rules.

## 3. Enable Google as a sign-in provider

1. In Firebase Console, open **Authentication**.
2. Select **Sign-in method** (or **Sign-in providers** in the newer console UI).
3. Choose **Google**.
4. Turn on **Enable**.
5. Select a project support email if Firebase asks for one.
6. Save the provider.

This project calls `signInWithPopup()` with `GoogleAuthProvider`, so Google
must be enabled before the button can complete sign-in.

## 4. Add authorized domains

In **Authentication → Settings → Authorized domains**, add every hostname
where the site will run:

- `localhost` for local development (Firebase commonly includes this by
  default)
- your Vercel or other hosting domain
- any custom production domain

Do not add a protocol, path, or port. For example, add
`desk-duel.vercel.app`, not `https://desk-duel.vercel.app/game.html`.

If the hostname is missing, the page reports
`auth/unauthorized-domain`.

## 5. Run and test locally

From the project directory:

```bash
npm install
npm run dev
```

Open [http://localhost:3000/auth.html](http://localhost:3000/auth.html) and
click **CONTINUE WITH GOOGLE**. Select a Google account and confirm that the
page displays the account name or email.

Use a local HTTP server rather than opening `auth.html` directly with a
`file://` URL. ES modules and Firebase authentication require a web origin.

## 6. Deploy and test production

Deploy the project to the hosting service configured for the repository. Then:

1. Add the production hostname to Firebase's **Authorized domains**.
2. Open the deployed `/auth.html` page.
3. Test the Google button in a normal browser window.
4. Check **Authentication → Users** in Firebase Console for the new user.

The site must be served over HTTPS in production. Keep
`js/firebase-config.js` included in the deployment, but never commit a
Firebase service-account JSON file or any private server credential.

## How the existing integration works

The implementation in [`js/auth.js`](./js/auth.js) follows this flow:

1. It checks `isFirebaseConfigured`.
2. It dynamically loads `firebase-app.js` and `firebase-auth.js` version
   `10.14.1` from `gstatic.com`.
3. It initializes Firebase with the values from
   [`js/firebase-config.js`](./js/firebase-config.js).
4. Clicking the Google button creates a `GoogleAuthProvider` and calls
   `signInWithPopup()`.
5. `onAuthStateChanged()` updates the account status and stores the Firebase
   UID in `localStorage` so each account gets its own local game namespace.

Authentication does not sync game progress between devices. Cross-device
progress would require a database such as Cloud Firestore and appropriate
Security Rules.

## Troubleshooting

### “Firebase configuration is missing”

One or more values in `js/firebase-config.js` still starts with `YOUR_`.
Copy the Web app values from **Project settings → Your apps** and reload.

### `auth/operation-not-allowed`

Google is not enabled. Open **Authentication → Sign-in method**, enable
Google, and save.

### `auth/unauthorized-domain`

The current hostname is not in **Authentication → Settings → Authorized
domains**. Add the hostname without `https://`, a path, or a port.

### `auth/popup-blocked`

Allow popups for the site and click the button again. Avoid triggering the
sign-in action from a delayed callback; the current button handler is designed
to open the popup directly from the click.

### The popup closes or sign-in fails immediately

Check the browser Console and Network panel, confirm the browser is online,
and verify that the page is running from an HTTP(S) web server. Also confirm
that the Firebase project in `firebase-config.js` is the same project where
Google authentication was enabled.
