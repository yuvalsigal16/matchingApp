import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAbK-zdzGuBrZG_9CtigHjA9BJ2Jn4V8lI",
  authDomain: "matchingapp-46e9a.firebaseapp.com",
  projectId: "matchingapp-46e9a",
  storageBucket: "matchingapp-46e9a.firebasestorage.app",
  messagingSenderId: "206187235347",
  appId: "1:206187235347:web:903b58d41f6ee01f1717e6",
  measurementId: "G-8RGERXR5ZL"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);