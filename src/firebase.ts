import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// IMPORTANT: Replace these empty strings with your actual Firebase project configuration
// You can find this in your Firebase Console -> Project Settings -> General -> Your apps
const firebaseConfig = {
  apiKey: "AIzaSyChA-ARp2EPhpH5T7g3psogkKZ9FXK8y9A",
  authDomain: "personal-18920.firebaseapp.com",
  projectId: "personal-18920",
  storageBucket: "personal-18920.firebasestorage.app",
  messagingSenderId: "770869333283",
  appId: "1:770869333283:web:a1c33474a8ad5940e41096",
  measurementId: "G-R6STQ93LCV"
};


// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Firebase Authentication and get a reference to the service (optional but recommended)
export const auth = getAuth(app);
