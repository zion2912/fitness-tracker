// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCUe-vM78LYxTLt5QMgwN01KjNWzZ3xCLA",
  authDomain: "fitness-tracker-16b52.firebaseapp.com",
  projectId: "fitness-tracker-16b52",
  storageBucket: "fitness-tracker-16b52.firebasestorage.app",
  messagingSenderId: "1017549431286",
  appId: "1:1017549431286:web:8044c81de25e7406da67d7",
  measurementId: "G-MEX47ZQ68T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };