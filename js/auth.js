import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { auth, provider } from './firebase-config.js';

export async function loginWithGoogle() {
  return signInWithPopup(auth, provider);
}

export async function logoutUser() {
  return signOut(auth);
}

export function observeAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}
