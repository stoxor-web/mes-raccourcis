import { loginWithGoogle, logoutUser, observeAuthState } from './auth.js';
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

      state.shortcuts = state.shortcuts.filter(shortcut => shortcut.id !== item.id)
        .map((shortcut, index) => ({ ...shortcut, order: index }));

      try {
        if (currentUser) {
          await deleteShortcutInCloud(currentUser.uid, item.id);
          await saveFullState(currentUser.uid, state);
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

      const related = state.shortcuts.filter(item => item.categoryId === categoryId).length;
      const ok = confirm(`Supprimer la section « ${category.name} » et ses ${related} raccourci(s) ?`);
      if (!ok) return;

      state.categories = state.categories.filter(item => item.id !== categoryId)
        .map((item, index) => ({ ...item, order: index }));
      state.shortcuts = state.shortcuts.filter(item => item.categoryId !== categoryId)
        .map((item, index) => ({ ...item, order: index }));

      if (elements.categoryFilter.value === categoryId) {
        elements.categoryFilter.value = 'all';
      }

      try {
        if (currentUser) {
          await deleteCategoryAndShortcuts(currentUser.uid, categoryId, state.shortcuts);
          await saveFullState(currentUser.uid, state);
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
  sta
