import {
  escapeHtml,
  getCategoryPath,
  getChildrenCategories,
  getDescendantCategoryIds
} from './utils.js';

export function getElements() {
  return {
    sectionsContainer: document.getElementById('sectionsContainer'),
    searchInput: document.getElementById('searchInput'),
    categoryFilter: document.getElementById('categoryFilter'),
    clearFiltersBtn: document.getElementById('clearFiltersBtn'),
    addShortcutBtn: document.getElementById('addShortcutBtn'),
    addCategoryBtn: document.getElementById('addCategoryBtn'),
    exportBtn: document.getElementById('exportBtn'),
    importInput: document.getElementById('importInput'),
    resetDemoBtn: document.getElementById('resetDemoBtn'),
    shortcutCount: document.getElementById('shortcutCount'),
    categoryCount: document.getElementById('categoryCount'),
    visibleCount: document.getElementById('visibleCount'),
    shortcutDialog: document.getElementById('shortcutDialog'),
    categoryDialog: document.getElementById('categoryDialog'),
    categoryDialogTitle: document.getElementById('categoryDialogTitle'),
    shortcutForm: document.getElementById('shortcutForm'),
    categoryForm: document.getElementById('categoryForm'),
    shortcutDialogTitleText: document.getElementById('shortcutDialogTitle'),
    shortcutId: document.getElementById('shortcutId'),
    siteName: document.getElementById('siteName'),
    siteUrl: document.getElementById('siteUrl'),
    siteCategory: document.getElementById('siteCategory'),
    siteDescription: document.getElementById('siteDescription'),
    categoryEditId: document.getElementById('categoryEditId'),
    categoryName: document.getElementById('categoryName'),
    categoryColor: document.getElementById('categoryColor'),
    categoryParent: document.getElementById('categoryParent'),
    closeShortcutDialog: document.getElementById('closeShortcutDialog'),
    cancelShortcutBtn: document.getElementById('cancelShortcutBtn'),
    closeCategoryDialog: document.getElementById('closeCategoryDialog'),
    cancelCategoryBtn: document.getElementById('cancelCategoryBtn'),
    loginBtn: document.getElementById('loginBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    userInfo: document.getElementById('userInfo'),
    userAvatar: document.getElementById('userAvatar'),
    userName: document.getElementById('userName'),
    userEmail: document.getElementById('userEmail'),
    subtitleText: document.getElementById('subtitleText'),
    syncStatus: document.getElementById('syncStatus'),
    topUsedSection: document.getElementById('topUsedSection'),
    topUsedContainer: document.getElementById('topUsedContainer')
  };
}

export function setUserUi(elements, user) {
  const loggedIn = Boolean(user);

  elements.loginBtn.classList.toggle('hidden', loggedIn);
  elements.logoutBtn.classList.toggle('hidden', !loggedIn);
  elements.userInfo.classList.toggle('hidden', !loggedIn);

  if (loggedIn) {
    elements.userAvatar.src = user.photoURL || 'https://placehold.co/88x88?text=U';
    elements.userName.textContent = user.displayName || 'Utilisateur';
    elements.userEmail.textContent = user.email || '';
    elements.subtitleText.textContent = 'Tes raccourcis sont synchronisés avec ton compte Google.';
    elements.syncStatus.textContent = 'Synchronisé avec Firebase';
  } else {
    elements.userAvatar.removeAttribute('src');
    elements.userName.textContent = '';
    elements.userEmail.textContent = '';
    elements.subtitleText.textContent =
      'Connecte-toi avec Google pour retrouver tes raccourcis partout.';
    elements.syncStatus.textContent = 'Mode local de démonstration';
  }
}

function getCategoryLabel(categories, category) {
  const path = getCategoryPath(categories, category.id);
  return path.map(item => item.name).join(' > ');
}

function renderTopUsed(state, elements) {
  if (!elements.topUsedSection || !elements.topUsedContainer) {
    return;
  }

  const topShortcuts = [...state.shortcuts]
    .filter(item => (item.usageCount || 0) > 0)
    .sort((a, b) => {
      const usageDiff = (b.usageCount || 0) - (a.usageCount || 0);
      if (usageDiff !== 0) return usageDiff;
      return (b.lastUsedAt || 0) - (a.lastUsedAt || 0);
    })
    .slice(0, 10);

  if (!topShortcuts.length) {
    elements.topUsedSection.classList.add('hidden');
    elements.topUsedContainer.innerHTML = '';
    return;
  }

  elements.topUsedSection.classList.remove('hidden');
  elements.topUsedContainer.innerHTML = topShortcuts
    .map(shortcut => {
      const category = state.categories.find(item => item.id === shortcut.categoryId);
      const categoryLabel = category ? getCategoryLabel(state.categories, category) : 'Sans section';

      return `
        <article class="top-used-card">
          <h3>${escapeHtml(shortcut.name)}</h3>
          <div class="top-used-meta">
            ${escapeHtml(categoryLabel)} · ${escapeHtml(String(shortcut.usageCount || 0))} ouverture(s)
          </div>
          <a
            class="btn primary"
            href="${escapeHtml(shortcut.url)}"
            target="_blank"
            rel="noopener noreferrer"
            data-open-id="${escapeHtml(shortcut.id)}"
          >
            Ouvrir
          </a>
        </article>
      `;
    })
    .join('');
}

export function getFilteredShortcuts(state, elements) {
  const query = elements.searchInput.value.trim().toLowerCase();
  const selectedCategory = elements.categoryFilter.value;

  let allowedCategoryIds = null;
  if (selectedCategory !== 'all') {
    allowedCategoryIds = getDescendantCategoryIds(state.categories, selectedCategory);
  }

  return state.shortcuts.filter(shortcut => {
    const category = state.categories.find(item => item.id === shortcut.categoryId);
    const categoryName = category ? getCategoryLabel(state.categories, category) : '';

    const matchesCategory =
      selectedCategory === 'all' || allowedCategoryIds.includes(shortcut.categoryId);

    const haystack =
      `${shortcut.name} ${shortcut.url} ${shortcut.description || ''} ${categoryName}`.toLowerCase();

    const matchesQuery = !query || haystack.includes(query);

    return matchesCategory && matchesQuery;
  });
}

export function refreshCategoryOptions(state, elements) {
  const currentFilter = elements.categoryFilter.value || 'all';

  const categoriesSorted = [...state.categories].sort((a, b) => a.order - b.order);

  const optionsHtml = categoriesSorted
    .map(category => {
      const label = getCategoryLabel(state.categories, category);
      return `<option value="${escapeHtml(category.id)}">${escapeHtml(label)}</option>`;
    })
    .join('');

  elements.siteCategory.innerHTML = optionsHtml;
  elements.categoryFilter.innerHTML =
    `<option value="all">Toutes les sections</option>${optionsHtml}`;

  elements.categoryParent.innerHTML =
    `<option value="">Aucune (section principale)</option>${optionsHtml}`;

  if ([...elements.categoryFilter.options].some(option => option.value === currentFilter)) {
    elements.categoryFilter.value = currentFilter;
  } else {
    elements.categoryFilter.value = 'all';
  }
}

function renderCard(shortcut, color) {
  return `
    <article
      class="card"
      style="--section-color:${escapeHtml(color)}"
      draggable="true"
      data-shortcut-id="${escapeHtml(shortcut.id)}"
      data-shortcut-category-id="${escapeHtml(shortcut.categoryId)}"
    >
      <div class="site-info">
        <h3>${escapeHtml(shortcut.name)}</h3>
      </div>

      ${shortcut.description ? `<div class="site-description">${escapeHtml(shortcut.description)}</div>` : ''}

      <div class="card-actions">
        <a
          class="btn primary"
          href="${escapeHtml(shortcut.url)}"
          target="_blank"
          rel="noopener noreferrer"
          data-open-id="${escapeHtml(shortcut.id)}"
        >
          Ouvrir
        </a>
        <button class="btn secondary" data-edit-id="${escapeHtml(shortcut.id)}" type="button">Modifier</button>
        <button class="btn danger" data-delete-id="${escapeHtml(shortcut.id)}" type="button">Supprimer</button>
      </div>
    </article>
  `;
}

function renderCategoryNode(state, category, filteredShortcuts, depth = 0) {
  const items = filteredShortcuts.filter(item => item.categoryId === category.id);
  const children = getChildrenCategories(state.categories, category.id);
  const childHtml = children.map(child => renderCategoryNode(state, child, filteredShortcuts, depth + 1)).join('');

  const hasSearchOrFilter =
    document.getElementById('searchInput')?.value ||
    document.getElementById('categoryFilter')?.value !== 'all';

  if (items.length === 0 && childHtml === '' && hasSearchOrFilter) {
    return '';
  }

  return `
    <section
      class="category-section glass"
      style="--section-color:${escapeHtml(category.color)}; margin-left:${depth * 18}px"
      draggable="true"
      data-category-id="${escapeHtml(category.id)}"
    >
      <div class="section-header">
        <div class="section-title-wrap">
          <span class="section-dot"></span>
          <span class="section-title">${escapeHtml(category.name)}</span>
          <span class="section-badge">${items.length} site(s)</span>
        </div>

        <div class="section-actions">
          <button class="btn secondary" data-add-subcategory="${escapeHtml(category.id)}" type="button">
            + Sous-section
          </button>
          <button class="btn secondary" data-edit-category="${escapeHtml(category.id)}" type="button">
            Modifier
          </button>
          <button class="btn danger" data-delete-category="${escapeHtml(category.id)}" type="button">
            Supprimer
          </button>
        </div>
      </div>

      <div class="cards shortcut-drop-zone" data-category-id="${escapeHtml(category.id)}">
        ${items.map(item => renderCard(item, category.color)).join('')}
      </div>

      ${childHtml ? `<div class="subsections">${childHtml}</div>` : ''}
    </section>
  `;
}

export function render(state, elements) {
  refreshCategoryOptions(state, elements);
  renderTopUsed(state, elements);

  const filtered = getFilteredShortcuts(state, elements);
  const roots = getChildrenCategories(state.categories, null);

  elements.sectionsContainer.innerHTML = roots
    .map(root => renderCategoryNode(state, root, filtered, 0))
    .join('');

  if (!elements.sectionsContainer.innerHTML.trim()) {
    elements.sectionsContainer.innerHTML = `
      <div class="empty-state">
        Aucun raccourci trouvé avec ces filtres. Essaie une autre recherche ou ajoute un nouveau site.
      </div>
    `;
  }

  elements.shortcutCount.textContent = String(state.shortcuts.length);
  elements.categoryCount.textContent = String(state.categories.length);
  elements.visibleCount.textContent = String(filtered.length);
}

export function openShortcutDialog(elements, state, shortcut = null) {
  elements.shortcutForm.reset();
  elements.shortcutId.value = '';
  elements.shortcutDialogTitleText.textContent = shortcut ? 'Modifier un raccourci' : 'Ajouter un raccourci';

  if (shortcut) {
    elements.shortcutId.value = shortcut.id;
    elements.siteName.value = shortcut.name;
    elements.siteUrl.value = shortcut.url;
    elements.siteCategory.value = shortcut.categoryId;
    elements.siteDescription.value = shortcut.description || '';
  } else if (state.categories[0]) {
    elements.siteCategory.value = state.categories[0].id;
  }

  elements.shortcutDialog.showModal();
}

export function closeShortcutDialog(elements) {
  elements.shortcutDialog.close();
}

export function openCategoryDialog(elements, color, parentId = '') {
  elements.categoryForm.reset();
  elements.categoryEditId.value = '';
  elements.categoryDialogTitle.textContent = parentId ? 'Ajouter une sous-section' : 'Ajouter une section';
  elements.categoryColor.value = color;
  elements.categoryParent.value = parentId;
  elements.categoryDialog.showModal();
}

export function openEditCategoryDialog(elements, category) {
  elements.categoryForm.reset();
  elements.categoryEditId.value = category.id;
  elements.categoryDialogTitle.textContent = 'Modifier la section';
  elements.categoryName.value = category.name || '';
  elements.categoryColor.value = category.color || '#7dd3fc';
  elements.categoryParent.value = category.parentId ?? '';
  elements.categoryDialog.showModal();
}

export function closeCategoryDialog(elements) {
  elements.categoryDialog.close();
}
