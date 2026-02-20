import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyD3haVoQOgh3mqdh6S-JvskXAj4cv3lK4w",
    authDomain: "chargeway-c3739.firebaseapp.com",
    projectId: "chargeway-c3739",
    storageBucket: "chargeway-c3739.firebasestorage.app",
    messagingSenderId: "208439064937",
    appId: "1:208439064937:web:5c909ae4cdeb4b1d1b65f8",
    measurementId: "G-6LKHYP4LYJ"
};

// Initialize Firebase only if it hasn't been initialized yet
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
