import {
  const categoriesQuery = query(categoriesCollection(uid), orderBy('order', 'asc'));
  const shortcutsQuery = query(shortcutsCollection(uid), orderBy('order', 'asc'));

  const [categoriesSnap, shortcutsSnap] = await Promise.all([
    getDocs(categoriesQuery),
    getDocs(shortcutsQuery)
  ]);

  return {
    categories: categoriesSnap.docs.map(item => ({ id: item.id, ...item.data() })),
    shortcuts: shortcutsSnap.docs.map(item => ({ id: item.id, ...item.data() }))
  };
}

export async function hasCloudData(uid) {
  const [categoriesSnap, shortcutsSnap] = await Promise.all([
    getDocs(query(categoriesCollection(uid))),
    getDocs(query(shortcutsCollection(uid)))
  ]);

  return !categoriesSnap.empty || !shortcutsSnap.empty;
}

export async function saveFullState(uid, state) {
  const batch = writeBatch(db);

  const existingCategories = await getDocs(categoriesCollection(uid));
  existingCategories.forEach(item => batch.delete(item.ref));

  const existingShortcuts = await getDocs(shortcutsCollection(uid));
  existingShortcuts.forEach(item => batch.delete(item.ref));

  state.categories.forEach((category, index) => {
    const ref = doc(categoriesCollection(uid), category.id);
    batch.set(ref, {
      name: category.name,
      color: category.color,
      order: index,
      createdAt: category.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  });

  state.shortcuts.forEach((shortcut, index) => {
    const ref = doc(shortcutsCollection(uid), shortcut.id);
    batch.set(ref, {
      name: shortcut.name,
      url: shortcut.url,
      categoryId: shortcut.categoryId,
      description: shortcut.description || '',
      order: index,
      createdAt: shortcut.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  });

  await batch.commit();
}

export async function migrateLocalStateToCloud(uid, localState) {
  if (!localState) return;
  const alreadyHasData = await hasCloudData(uid);
  if (alreadyHasData) return;
  await saveFullState(uid, localState);
}

export async function deleteCategoryAndShortcuts(uid, categoryId, shortcuts) {
  const batch = writeBatch(db);
  batch.delete(doc(categoriesCollection(uid), categoryId));

  shortcuts
    .filter(item => item.categoryId === categoryId)
    .forEach(item => batch.delete(doc(shortcutsCollection(uid), item.id)));

  await batch.commit();
}

export async function deleteShortcut(uid, shortcutId) {
  await deleteDoc(doc(shortcutsCollection(uid), shortcutId));
}
