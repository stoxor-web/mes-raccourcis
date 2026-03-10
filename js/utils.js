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
    { id: crypto.randomUUID(), name: 'Travail', color: '#7dd3fc', order: 0 },
    { id: crypto.randomUUID(), name: 'Communication', color: '#4ade80', order: 1 },
    { id: crypto.randomUUID(), name: 'Outils', color: '#a78bfa', order: 2 },
    { id: crypto.randomUUID(), name: 'Loisirs', color: '#fbbf24', order: 3 }
  ],
  shortcuts: []
};

demoData.shortcuts = [
  {
    id: crypto.randomUUID(),
    name: 'Gmail',
    url: 'https://mail.google.com',
    categoryId: demoData.categories[1].id,
    description: 'Messagerie rapide',
    order: 0
  },
  {
    id: crypto.randomUUID(),
    name: 'Google Drive',
    url: 'https://drive.google.com',
    categoryId: demoData.categories[0].id,
    description: 'Documents et fichiers',
    order: 1
  },
  {
    id: crypto.randomUUID(),
    name: 'YouTube',
    url: 'https://www.youtube.com',
    categoryId: demoData.categories[3].id,
    description: 'Vidéos et abonnements',
    order: 2
  },
  {
    id: crypto.randomUUID(),
    name: 'Notion',
    url: 'https://www.notion.so',
    categoryId: demoData.categories[2].id,
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

    if (!Array.isArray(parsed.categories) || !Array.isArray(parsed.shortcuts)) {
      return null;
    }

    const categories = parsed.categories.map((category, index) => {
      if (typeof category === 'string') {
        return {
          id: crypto.randomUUID(),
          name: category,
          color: defaultPalette[index % defaultPalette.length],
          order: index
        };
      }

      return {
        id: crypto.randomUUID(),
        name: category.name,
        color: category.color || defaultPalette[index % defaultPalette.length],
        order: index
      };
    });

    const categoryByName = new Map(categories.map(category => [category.name, category.id]));

    const shortcuts = parsed.shortcuts.map((shortcut, index) => ({
      id: shortcut.id || crypto.randomUUID(),
      name: shortcut.name || '',
      url: shortcut.url || '',
      categoryId: categoryByName.get(shortcut.category) || categories[0]?.id || '',
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

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json'
  });

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
        order: index
      };
    }

    return {
      id: category.id || crypto.randomUUID(),
      name: category.name || `Section ${index + 1}`,
      color: category.color || defaultPalette[index % defaultPalette.length],
      order: Number.isFinite(category.order) ? category.order : index
    };
  });

  const categoryByName = new Map(categories.map(category => [category.name, category.id]));

  const shortcuts = data.shortcuts.map((shortcut, index) => ({
    id: shortcut.id || crypto.randomUUID(),
    name: shortcut.name || '',
    url: normalizeUrl(shortcut.url || ''),
    categoryId:
      shortcut.categoryId ||
      categoryByName.get(shortcut.category) ||
      categories[0]?.id ||
      '',
    description: shortcut.description || '',
    order: Number.isFinite(shortcut.order) ? shortcut.order : index
  }));

  return { categories, shortcuts };
}
