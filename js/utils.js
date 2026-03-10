export const STORAGE_KEY = 'dashboard-raccourcis-locaux-v6';

export const defaultPalette = [
  '#7dd3fc',
  '#a78bfa',
  '#4ade80',
  '#fbbf24',
  '#fb7185',
  '#2dd4bf',
  '#c084fc',
  '#f472b6'
];

export const demoData = {
  categories: [
    { id: crypto.randomUUID(), name: 'Travail', color: '#7dd3fc', parentId: null, order: 0 },
    { id: crypto.randomUUID(), name: 'Communication', color: '#4ade80', parentId: null, order: 1 },
    { id: crypto.randomUUID(), name: 'Outils', color: '#a78bfa', parentId: null, order: 2 },
    { id: crypto.randomUUID(), name: 'Loisirs', color: '#fbbf24', parentId: null, order: 3 }
  ],
  shortcuts: []
};

const travailId = demoData.categories[0].id;
const communicationId = demoData.categories[1].id;
const outilsId = demoData.categories[2].id;
const loisirsId = demoData.categories[3].id;

const clientsId = crypto.randomUUID();
demoData.categories.push({
  id: clientsId,
  name: 'Clients',
  color: '#7dd3fc',
  parentId: travailId,
  order: 4
});

demoData.shortcuts = [
  {
    id: crypto.randomUUID(),
    name: 'Gmail',
    url: 'https://mail.google.com',
    categoryId: communicationId,
    description: 'Messagerie rapide',
    order: 0
  },
  {
    id: crypto.randomUUID(),
    name: 'Google Drive',
    url: 'https://drive.google.com',
    categoryId: clientsId,
    description: 'Documents clients',
    order: 1
  },
  {
    id: crypto.randomUUID(),
    name: 'YouTube',
    url: 'https://www.youtube.com',
    categoryId: loisirsId,
    description: 'Vidéos et abonnements',
    order: 2
  },
  {
    id: crypto.randomUUID(),
    name: 'Notion',
    url: 'https://www.notion.so',
    categoryId: outilsId,
    description: 'Notes et organisation',
    order: 3
  }
];

export function normalizeUrl(url) {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function cloneDemoData() {
  return structuredClone(demoData);
}

export function loadLegacyLocalState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.categories) || !Array.isArray(parsed.shortcuts)) return null;

    const categories = parsed.categories.map((category, index) => {
      if (typeof category === 'string') {
        return {
          id: crypto.randomUUID(),
          name: category,
          color: defaultPalette[index % defaultPalette.length],
          parentId: null,
          order: index
        };
      }

      return {
        id: crypto.randomUUID(),
        name: category.name,
        color: category.color || defaultPalette[index % defaultPalette.length],
        parentId: category.parentId ?? null,
        order: index
      };
    });

    const categoryByName = new Map(categories.map(category => [category.name, category.id]));

    const shortcuts = parsed.shortcuts.map((shortcut, index) => ({
      id: shortcut.id || crypto.randomUUID(),
      name: shortcut.name || '',
      url: shortcut.url || '',
      categoryId: shortcut.categoryId || categoryByName.get(shortcut.category) || categories[0]?.id || '',
      description: shortcut.description || '',
      order: index
    }));

    return { categories, shortcuts };
  } catch {
    return null;
  }
}

export function exportState(state) {
  const payload = {
    categories: state.categories,
    shortcuts: state.shortcuts
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'mes-raccourcis-web.json';
  link.click();
  URL.revokeObjectURL(url);
}

export async function importStateFromFile(file) {
  const text = await file.text();
  const data = JSON.parse(text);

  if (!Array.isArray(data.categories) || !Array.isArray(data.shortcuts)) {
    throw new Error('Format invalide');
  }

  const categories = data.categories.map((category, index) => {
    if (typeof category === 'string') {
      return {
        id: crypto.randomUUID(),
        name: category,
        color: defaultPalette[index % defaultPalette.length],
        parentId: null,
        order: index
      };
    }

    return {
      id: category.id || crypto.randomUUID(),
      name: category.name || `Section ${index + 1}`,
      color: category.color || defaultPalette[index % defaultPalette.length],
      parentId: category.parentId ?? null,
      order: Number.isFinite(category.order) ? category.order : index
    };
  });

  const categoryByName = new Map(categories.map(category => [category.name, category.id]));

  const shortcuts = data.shortcuts.map((shortcut, index) => ({
    id: shortcut.id || crypto.randomUUID(),
    name: shortcut.name || '',
    url: normalizeUrl(shortcut.url || ''),
    categoryId: shortcut.categoryId || categoryByName.get(shortcut.category) || categories[0]?.id || '',
    description: shortcut.description || '',
    order: Number.isFinite(shortcut.order) ? shortcut.order : index
  }));

  return { categories, shortcuts };
}

export function getChildrenCategories(categories, parentId = null) {
  return categories
    .filter(category => (category.parentId ?? null) === parentId)
    .sort((a, b) => a.order - b.order);
}

export function getCategoryPath(categories, categoryId) {
  const path = [];
  let current = categories.find(cat => cat.id === categoryId);

  while (current) {
    path.unshift(current);
    current = categories.find(cat => cat.id === current.parentId);
  }

  return path;
}

export function getDescendantCategoryIds(categories, rootId) {
  const ids = [rootId];
  const walk = parentId => {
    categories
      .filter(cat => cat.parentId === parentId)
      .forEach(child => {
        ids.push(child.id);
        walk(child.id);
      });
  };
  walk(rootId);
  return ids;
}
