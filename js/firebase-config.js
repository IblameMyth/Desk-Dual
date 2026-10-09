
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "desk-dual.firebaseapp.com",
  projectId: "desk-dual",
  storageBucket: "desk-dual.firebasestorage.app",
  messagingSenderId: "235869021159",
  appId: "1:235869021159:web:bad4613fd12cd538155342"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export default app;