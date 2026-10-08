/* Firebase web app configuration for DeskDual.
   Replace the two remaining placeholders with values from Firebase Console > Project settings > Your apps. */
export const firebaseConfig = {
  apiKey: 'YOUR_FIREBASE_API_KEY',
  authDomain: 'deskdual-d9443.firebaseapp.com',
  projectId: 'deskdual-d9443',
  appId: 'YOUR_FIREBASE_APP_ID'
};
export const isFirebaseConfigured = !Object.values(firebaseConfig).some(v => String(v).startsWith('YOUR_'));
