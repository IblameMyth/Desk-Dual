/* Firebase web config for Desk Dual.
   Plain browser module: no bundler, no imports. cloud.js loads the Firebase SDK from the CDN
   and reads `firebaseConfig` / `isFirebaseConfigured` from here.
   (The apiKey of a Firebase web app is not a secret; access is controlled by firestore.rules
   and the Authorized domains list in Firebase Authentication.) */
export const firebaseConfig = {
  apiKey: "AIzaSyDuqpSGUSgVXOEJaVY6I14wQ7k8uF5rjr0",
  authDomain: "desk-dual.firebaseapp.com",
  projectId: "desk-dual",
  storageBucket: "desk-dual.firebasestorage.app",
  messagingSenderId: "235869021159",
  appId: "1:235869021159:web:bad4613fd12cd538155342"
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey);
