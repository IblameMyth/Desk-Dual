// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB4FJYwyFmJUHhXA2q7BF2n4Hqp4H8UzdU",
  authDomain: "deskdual-d9443.firebaseapp.com",
  projectId: "deskdual-d9443",
  storageBucket: "deskdual-d9443.firebasestorage.app",
  messagingSenderId: "193321157572",
  appId: "1:193321157572:web:c20d0eb47b7a26e7eeda91",
  measurementId: "G-L7GGH59VSY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);