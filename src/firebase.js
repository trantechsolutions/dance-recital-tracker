import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyA0arXDa5VPDNWsPDAh2Z8QP_KmqIZgG38",
    authDomain: "dancers-pointe-recital-app.firebaseapp.com",
    projectId: "dancers-pointe-recital-app",
    storageBucket: "dancers-pointe-recital-app.appspot.com",
    messagingSenderId: "212532918929",
    appId: "1:212532918929:web:3f0d4d028b2b585f545d30"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const authorizedUsers = ["jonny5v@gmail.com", "bdwill@gmail.com"]; // From config.js