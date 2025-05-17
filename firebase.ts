// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";

import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDYMX05WcigtNyEwb0igqI7KFrVN4CgaKY",
  authDomain: "skillswap-b2f4e.firebaseapp.com",
  projectId: "skillswap-b2f4e",
  storageBucket: "skillswap-b2f4e.firebasestorage.app",
  messagingSenderId: "229354161220",
  appId: "1:229354161220:web:41aa60210da79c4d166811",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
