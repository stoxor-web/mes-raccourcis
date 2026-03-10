import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyDIBkKxqnP3sQmDjNL2Dik7NBMhtPBZiKM",
  authDomain: "mes-raccourcis.firebaseapp.com",
  projectId: "mes-raccourcis",
  storageBucket: "mes-raccourcis.firebasestorage.app",
  messagingSenderId: "954336668667",
  appId: "1:954336668667:web:391ec66170f5472a87f95e",
  measurementId: "G-M4NTTWMC1H"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
