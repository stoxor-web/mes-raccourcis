import { loginWithGoogle, logoutUser, observeAuthState } from './auth.js';
import {
  loadCloudState,
  migrateLocalStateToCloud,
  saveFullState,
  upsertUserProfile,
  deleteCategoryAndShortcuts,
  deleteShortcut as deleteShortcutInCloud
} from './store.js';
import {
  cloneDemoData,
  defaultPalette,
  exportState,
  importStateFromFile,
  loadLegacyLocalState,
  normalizeUrl,
  getDescendantCategoryIds
} from './utils.js';
import {
  closeCategoryDialog,
  closeShortcutDialog,
  getElements,
  openCategoryDialog,
  openShortcutDialog,
  render,
  setUserUi
} from './ui.js';

const elements = getElements();

let state = cloneDemoData();
let currentUser = null;
let draggedCategoryId = null;
let draggedShortcutId = null;

async function persistState() {
  if (!currentUser) {
    localStorage.setItem('dashboard-raccourcis-cache', JSON.stringify(state));
    return;
  }
  await saveFullState(currentUser.uid, state);
}

function clearSectionDragStates() {
  document.querySelectorAll('.category-section').forEach(section => {
    section.classList.remove('dragging', 'drag-over-top', 'drag-over-bottom');
  });
}

function clearShortcutDragStates() {
  document.querySelectorAll('.card').forEach(card => {
    card.classList.remove('dragging-shortcut', 'shortcut-over-top', 'shortcut-over-bottom');
  });

  document.querySelectorAll('.shortcut-drop-zone').forEach(zone => {
    zone.classList.remove('shortcut-zone-active');
  });
}

function rerender() {
  render(state, elements);
  attachCardEvents();
  attachSectionDragEvents();
  attachShortcutDragEvents();
}

function moveCategory(fromId, toId, placeBefore) {
  if (!fromId || !toId || fromId === toId) return;

  const fromIndex = state.categories.findIndex(category => category.id === fromId);
  const toIndex = state.categories.findIndex(category => category.id === toId);
  if (fromIndex === -1 || toIndex === -1) return;

  const moved = state.categories[fromIndex];
  const target = state.categories[toIndex];

  if (moved.parentId !== target.parentId) return;

  const [movedCategory] = state.categories.splice(fromIndex, 1);
  let newIndex = state.categories.findIndex(category => category.id === toId);
  if (!placeBefore) newIndex += 1;

  state.categories.splice(newIndex, 0, movedCategory);
  state.categories = state.categories.map((category, index) => ({ ...category, order: index }));

  persistState().then(rerender).catch(error => {
    console.error(error);
    alert('Impossible d’enregistrer le nouvel ordre des sections.');
  });
}

function moveShortcut(shortcutId, targetCategoryId, targetShortcutId = null, placeBefore = false) {
  if (!shortcutId || !targetCategoryId) return;

  const draggedShortcut = state.shortcuts.find(item => item.id === shortcutId);
  if (!draggedShortcut) return;

  const remaining = state.shortcuts.filter(item => item.id !== shortcutId);
  draggedShortcut.categoryId = targetCategoryId;

  if (!targetShortcutId) {
    const insertIndex = remaining.reduce((lastIndex, item, index) => {
      return item.categoryId === targetCategoryId ? index + 1 : lastIndex;
    }, 0);

    remaining.splice(insertIndex, 0, draggedShortcut);
    state.shortcuts = remaining.map((item, index) => ({ ...item, order: index }));
    persistState().then(rerender).catch(error => {
      console.error(error);
      alert('Impossible d’enregistrer le déplacement du raccourci.');
    });
    return;
  }

  const targetIndex = remaining.findIndex(item => item.id === targetShortcutId);
  const insertIndex = targetIndex === -1 ? remaining.length : placeBefore ? targetIndex : targetIndex + 1;

  remaining.splice(insertIndex, 0, draggedShortcut);
  state.shortcuts = remaining.map((item, index) => ({ ...item, order: index }));

  persistState().then(rerender).catch(error => {
    console.error(error);
    alert('Impossible d’enregistrer le déplacement du raccourci.');
  });
}

function attachSectionDragEvents() {
  const sections = document.querySelectorAll('.category-section');

  sections.forEach(section => {
    section.addEventListener('dragstart', event => {
      if (draggedShortcutId) {
        event.preventDefault();
        return;
      }

      const target = event.target;
      if (target.closest('.card') || target.closest('button') || target.closest('a')) {
        event.preventDefault();
        return;
      }

      draggedCategoryId = section.dataset.categoryId;
      section.classList.add('dragging');
    });

    section.addEventListener('dragend', () => {
      draggedCategoryId = null;
      clearSectionDragStates();
    });

    section.addEventListener('dragover', event => {
      if (draggedShortcutId) return;
      event.preventDefault();

      if (!draggedCategoryId || draggedCategoryId === section.dataset.categoryId) return;

      const dragged = state.categories.find(cat => cat.id === draggedCategoryId);
      const target = state.categories.find(cat => cat.id === section.dataset.categoryId);
      if (!dragged || !target || dragged.parentId !== target.parentId) return;

      const rect = section.getBoundingClientRect();
      const offsetY = event.clientY - rect.top;
      const isTopHalf = offsetY < rect.height / 2;

      section.classList.remove('drag-over-top', 'drag-over-bottom');
      section.classList.add(isTopHalf ? 'drag-over-top' : 'drag-over-bottom');
    });

    section.addEventListener('dragleave', () => {
      section.classList.remove('drag-over-top', 'drag-over-bottom');
    });

    section.addEventListener('drop', event => {
      if (draggedShortcutId) return;
      event.preventDefault();

      if (!draggedCategoryId || draggedCategoryId === section.dataset.categoryId) return;

      const dragged = state.categories.find(cat => cat.id === draggedCategoryId);
      const target = state.categories.find(cat => cat.id === section.dataset.categoryId);
      if (!dragged || !target || dragged.parentId !== target.parentId) return;

      const rect = section.getBoundingClientRect();
      const offsetY = event.clientY - rect.top;
      const isTopHalf = offsetY < rect.height / 2;

      moveCategory(draggedCategoryId, section.dataset.categoryId, isTopHalf);
    });
  });
}

function attachShortcutDragEvents() {
  const cards = document.querySelectorAll('.card');
  const zones = document.querySelectorAll('.shortcut-drop-zone');

  cards.forEach(card => {
    card.addEventListener('dragstart', event => {
      const target = event.target;
      if (target.closest('button') || target.closest('a')) {
        event.preventDefault();
        return;
      }

      draggedShortcutId = card.dataset.shortcutId;
      card.classList.add('dragging-shortcut');
      event.stopPropagation();
    });

    card.addEventListener('dragend', () => {
      draggedShortcutId = null;
      clearShortcutDragStates();
    });

    card.addEventListener('dragover', event => {
      if (!draggedShortcutId || draggedShortcutId === card.dataset.shortcutId) return;

      event.preventDefault();
      event.stopPropagation();

      const rect = card.getBoundingClientRect();
      const offsetY = event.clientY - rect.top;
      const isTopHalf = offsetY < rect.height / 2;

      card.classList.remove('shortcut-over-top', 'shortcut-over-bottom');
      card.classList.add(isTopHalf ? 'shortcut-over-top' : 'shortcut-over-bottom');
    });

    card.addEventListener('dragleave', () => {
      card.classList.remove('shortcut-over-top', 'shortcut-over-bottom');
    });

    card.addEventListener('drop', event => {
      if (!draggedShortcutId || draggedShortcutId === card.dataset.shortcutId) return;

      event.preventDefault();
      event.stopPropagation();

      const rect = card.getBoundingClientRect();
      const offsetY = event.clientY - rect.top;
      const isTopHalf = offsetY < rect.height / 2;

      moveShortcut(
        draggedShortcutId,
        card.dataset.shortcutCategoryId,
        card.dataset.shortcutId,
        isTopHalf
      );
    });
  });

  zones.forEach(zone => {
    zone.addEventListener('dragover', event => {
      if (!draggedShortcutId) return;
      event.preventDefault();
      event.stopPropagation();
      zone.classList.add('shortcut-zone-active');
    });

    zone.addEventListener('dragleave', event => {
      if (event.currentTarget.contains(event.relatedTarget)) return;
      zone.classList.remove('shortcut-zone-active');
    });

    zone.addEventListener('drop', event => {
      if (!draggedShortcutId) return;

      event.preventDefault();
      event.stopPropagation();
      zone.classList.remove('shortcut-zone-active');

      const card = event.target.closest('.card');
      if (card) return;

      moveShortcut(draggedShortcutId, zone.dataset.categoryId);
    });
  });
}

function attachCardEvents() {
  document.querySelectorAll('[data-edit-id]').forEach(button => {
    button.onclick = () => {
      const item = state.shortcuts.find(shortcut => shortcut.id === button.dataset.editId);
      if (item) openShortcutDialog(elements, state, item);
    };
  });

  document.querySelectorAll('[data-delete-id]').forEach(button => {
    button.onclick = async () => {
      const item = state.shortcuts.find(shortcut => shortcut.id === button.dataset.deleteId);
      if (!item) return;

      const ok = confirm(`Supprimer le raccourci « ${item.name} » ?`);
      if (!ok) return;

      state.shortcuts = state.shortcuts
        .filter(shortcut => shortcut.id !== item.id)
        .map((shortcut, index) => ({ ...shortcut, order: index }));

      try {
        if (currentUser) {
          await deleteShortcutInCloud(currentUser.uid, item.id);
          await saveFullState(currentUser.uid, state);
        } else {
          localStorage.setItem('dashboard-raccourcis-cache', JSON.stringify(state));
        }

        rerender();
      } catch (error) {
        console.error(error);
        alert('Impossible de supprimer ce raccourci.');
      }
    };
  });

  document.querySelectorAll('[data-delete-category]').forEach(button => {
    button.onclick = async () => {
      const categoryId = button.dataset.deleteCategory;
      const category = state.categories.find(item => item.id === categoryId);
      if (!category) return;

      const descendantIds = getDescendantCategoryIds(state.categories, categoryId);
      const relatedShortcuts = state.shortcuts.filter(item => descendantIds.includes(item.categoryId)).length;

      const ok = confirm(
        `Supprimer la section « ${category.name} », ses sous-sections et ses ${relatedShortcuts} raccourci(s) ?`
      );
      if (!ok) return;

      const oldShortcuts = [...state.shortcuts];

      state.categories = state.categories
        .filter(item => !descendantIds.includes(item.id))
        .map((item, index) => ({ ...item, order: index }));

      state.shortcuts = state.shortcuts
        .filter(item => !descendantIds.includes(item.categoryId))
        .map((item, index) => ({ ...item, order: index }));

      if (descendantIds.includes(elements.categoryFilter.value)) {
        elements.categoryFilter.value = 'all';
      }

      try {
        if (currentUser) {
          await deleteCategoryAndShortcuts(currentUser.uid, descendantIds, oldShortcuts);
          await saveFullState(currentUser.uid, state);
        } else {
          localStorage.setItem('dashboard-raccourcis-cache', JSON.stringify(state));
        }

        rerender();
      } catch (error) {
        console.error(error);
        alert('Impossible de supprimer cette section.');
      }
    };
  });
}

async function initializeAuthenticatedState(user) {
  currentUser = user;
  setUserUi(elements, user);

  await upsertUserProfile(user);

  const legacyState = loadLegacyLocalState();
  await migrateLocalStateToCloud(user.uid, legacyState);

  const cloudState = await loadCloudState(user.uid);

  state = (cloudState.categories.length || cloudState.shortcuts.length)
    ? cloudState
    : cloneDemoData();

  rerender();
}

function initializeGuestState() {
  currentUser = null;
  setUserUi(elements, null);

  const cache = localStorage.getItem('dashboard-raccourcis-cache');
  state = cache ? JSON.parse(cache) : cloneDemoData();

  rerender();
}

async function replaceState(nextState) {
  state = {
    categories: [...nextState.categories].sort((a, b) => a.order - b.order),
    shortcuts: [...nextState.shortcuts].sort((a, b) => a.order - b.order)
  };

  if (currentUser) {
    await saveFullState(currentUser.uid, state);
  } else {
    localStorage.setItem('dashboard-raccourcis-cache', JSON.stringify(state));
  }

  rerender();
}

function bindEvents() {
  elements.addShortcutBtn.addEventListener('click', () => {
    openShortcutDialog(elements, state);
  });

  elements.addCategoryBtn.addEventListener('click', () => {
    openCategoryDialog(elements, defaultPalette[state.categories.length % defaultPalette.length], '');
  });

  elements.closeShortcutDialog.addEventListener('click', () => closeShortcutDialog(elements));
  elements.cancelShortcutBtn.addEventListener('click', () => closeShortcutDialog(elements));
  elements.closeCategoryDialog.addEventListener('click', () => closeCategoryDialog(elements));
  elements.cancelCategoryBtn.addEventListener('click', () => closeCategoryDialog(elements));

  elements.searchInput.addEventListener('input', rerender);
  elements.categoryFilter.addEventListener('change', rerender);

  elements.clearFiltersBtn.addEventListener('click', () => {
    elements.searchInput.value = '';
    elements.categoryFilter.value = 'all';
    rerender();
  });

  elements.loginBtn.addEventListener('click', async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error('Firebase login error:', error);
      alert(`Connexion Google impossible : ${error.code || 'erreur inconnue'}`);
    }
  });

  elements.logoutBtn.addEventListener('click', async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error(error);
      alert('Déconnexion impossible.');
    }
  });

  elements.shortcutForm.addEventListener('submit', async event => {
    event.preventDefault();

    const id = elements.shortcutId.value || crypto.randomUUID();
    const shortcut = {
      id,
      name: elements.siteName.value.trim(),
      url: normalizeUrl(elements.siteUrl.value),
      categoryId: elements.siteCategory.value,
      description: elements.siteDescription.value.trim()
    };

    if (!shortcut.name || !shortcut.url || !shortcut.categoryId) {
      alert('Merci de remplir les champs obligatoires.');
      return;
    }

    const existingIndex = state.shortcuts.findIndex(item => item.id === id);

    if (existingIndex >= 0) {
      state.shortcuts[existingIndex] = { ...state.shortcuts[existingIndex], ...shortcut };
    } else {
      state.shortcuts.push({ ...shortcut, order: state.shortcuts.length });
    }

    state.shortcuts = state.shortcuts.map((item, index) => ({ ...item, order: index }));

    try {
      await persistState();
      rerender();
      closeShortcutDialog(elements);
    } catch (error) {
      console.error(error);
      alert('Impossible d’enregistrer ce raccourci.');
    }
  });

  elements.categoryForm.addEventListener('submit', async event => {
    event.preventDefault();

    const name = elements.categoryName.value.trim();
    const color = elements.categoryColor.value;
    const parentId = elements.categoryParent.value || null;

    if (!name) return;

    if (
      state.categories.some(
        category =>
          category.name.toLowerCase() === name.toLowerCase() &&
          (category.parentId ?? null) === parentId
      )
    ) {
      alert('Cette section existe déjà à cet endroit.');
      return;
    }

    state.categories.push({
      id: crypto.randomUUID(),
      name,
      color,
      parentId,
      order: state.categories.length
    });

    try {
      await persistState();
      rerender();
      closeCategoryDialog(elements);
    } catch (error) {
      console.error(error);
      alert('Impossible de créer cette section.');
    }
  });

  elements.exportBtn.addEventListener('click', () => {
    exportState(state);
  });

  elements.importInput.addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const importedState = await importStateFromFile(file);
      await replaceState(importedState);
      alert('Import réussi.');
    } catch (error) {
      console.error(error);
      alert('Impossible d’importer ce fichier JSON.');
    } finally {
      event.target.value = '';
    }
  });

  elements.resetDemoBtn.addEventListener('click', async () => {
    const ok = confirm('Restaurer les données d’exemple ? Cela remplacera les raccourcis actuels.');
    if (!ok) return;

    try {
      await replaceState(cloneDemoData());
    } catch (error) {
      console.error(error);
      alert('Impossible de restaurer les données d’exemple.');
    }
  });
}

bindEvents();

observeAuthState(async user => {
  try {
    if (user) {
      await initializeAuthenticatedState(user);
    } else {
      initializeGuestState();
    }
  } catch (error) {
    console.error(error);
    alert('Erreur au chargement de tes données.');
    initializeGuestState();
  }
});
