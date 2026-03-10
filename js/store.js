import {
  collection,
  doc,
  getDocs,
  query,
  orderBy,
  writeBatch,
  serverTimestamp,
  setDoc,
  deleteDoc
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { db } from './firebase-config.js';
