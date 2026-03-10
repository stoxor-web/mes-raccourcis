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

function userDoc(uid) {
  return doc(db, 'users', uid);
}

function categoriesCollection(uid) {
  return collection(db, 'users', uid, 'categories');
}

function shortcutsCollection(uid) {
  return collection(db, 'users', uid, 'shortcuts');
}

function categoryDoc(uid, categoryId) {
  return doc(db, 'users', uid, 'categories', categoryId);
}

function shortcutDoc(uid, shortcutId) {
  return doc(db, 'users', uid, 'shortcuts', shortcutId);
}

export async function upsertUserProfile(user) {
  if (!user?.uid) {
    throw new Error('Utilisateur invalide');
  }

  await setDoc(
    userDoc(user.uid),
    {
      displayName: user.displayName || '',
      email: user.email || '',
      photoURL: user.photoURL || '',
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

export async function loadCloudState(uid) {
  if (!uid) {
    throw new Error('UID manquant');
  }

  const categoriesQuery = query(categoriesCollection(uid), orderBy('order', 'asc'));
  const shortcutsQuery = query(shortcutsCollection(uid), orderBy('order', 'asc'));

  const [categoriesSnap, shortcutsSnap] = await Promise.all([
    getDocs(categoriesQuery),
    getDocs(shortcutsQuery)
  ]);

  return {
    categories: categoriesSnap.docs.map(item => ({
      id: item.id,
      ...item.data()
    })),
    shortcuts: shortcutsSnap.docs.map(item => ({
      id: item.id,
      ...item.data()
    }))
  };
}

export async function hasCloudData(uid) {
  if (!uid) {
    throw new Error('UID manquant');
  }

  const [categoriesSnap, shortcutsSnap] = await Promise.all([
    getDocs(categoriesCollection(uid)),
    getDocs(shortcutsCollection(uid))
  ]);

  return !categoriesSnap.empty || !shortcutsSnap.empty;
}

export async function saveFullState(uid, state) {
  if (!uid) {
    throw new Error('UID manquant');
  }

  if (!state || !Array.isArray(state.categories) || !Array.isArray(state.shortcuts)) {
    throw new Error('État invalide');
  }

  const batch = writeBatch(db);

  const existingCategories = await getDocs(categoriesCollection(uid));
  existingCategories.forEach(item => {
    batch.delete(item.ref);
  });

  const existingShortcuts = await getDocs(shortcutsCollection(uid));
  existingShortcuts.forEach(item => {
    batch.delete(item.ref);
  });

  state.categories.forEach((category, index) => {
    const ref = categoryDoc(uid, category.id);

    batch.set(ref, {
      name: category.name || '',
      color: category.color || '#7dd3fc',
      order: index,
      createdAt: category.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  });

  state.shortcuts.forEach((shortcut, index) => {
    const ref = shortcutDoc(uid, shortcut.id);

    batch.set(ref, {
      name: shortcut.name || '',
      url: shortcut.url || '',
      categoryId: shortcut.categoryId || '',
      description: shortcut.description || '',
      order: index,
      createdAt: shortcut.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  });

  await batch.commit();
}

export async function migrateLocalStateToCloud(uid, localState) {
  if (!uid || !localState) {
    return;
  }

  const alreadyHasData = await hasCloudData(uid);
  if (alreadyHasData) {
    return;
  }

  await saveFullState(uid, localState);
}

export async function deleteCategoryAndShortcuts(uid, categoryId, shortcuts = []) {
  if (!uid || !categoryId) {
    throw new Error('Paramètres manquants');
  }

  const batch = writeBatch(db);

  batch.delete(categoryDoc(uid, categoryId));

  shortcuts
    .filter(item => item.categoryId === categoryId)
    .forEach(item => {
      batch.delete(shortcutDoc(uid, item.id));
    });

  await batch.commit();
}

export async function deleteShortcut(uid, shortcutId) {
  if (!uid || !shortcutId) {
    throw new Error('Paramètres manquants');
  }

  await deleteDoc(shortcutDoc(uid, shortcutId));
}
