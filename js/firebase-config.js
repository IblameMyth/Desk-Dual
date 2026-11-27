/* Firebase web config for Desk Dual.
   Plain browser module: no bundler, no imports. cloud.js loads the Firebase SDK from the CDN
   and reads `firebaseConfig` / `isFirebaseConfigured` from here.
   (The apiKey of a Firebase web app is not a secret; access is controlled by firestore.rules
   and the Authorized domains list in Firebase Authentication.) */
/* On the live site, sign-in runs through this site's own address (vercel.json proxies /__/auth to
   Firebase). Mobile browsers block the login redirect when it goes to a different domain. */
const host = location.hostname;
/* Only hosts whose /__/auth/handler is registered in Google Cloud (OAuth client -> Authorized redirect URIs)
   may be used here. Preview URLs and LAN IPs (192.168.x.x) are NOT registered, so they use the default domain. */
const OWN_DOMAINS = ['desk-dual.vercel.app'];
const useOwnDomain = OWN_DOMAINS.includes(host);

export const firebaseConfig = {
  apiKey: "AIzaSyDuqpSGUSgVXOEJaVY6I14wQ7k8uF5rjr0",
  authDomain: useOwnDomain ? host : "desk-dual.firebaseapp.com",
  projectId: "desk-dual",
  storageBucket: "desk-dual.firebasestorage.app",
  messagingSenderId: "235869021159",
  appId: "1:235869021159:web:bad4613fd12cd538155342"
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey);
