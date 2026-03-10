export const STORAGE_KEY = 'dashboard-raccourcis-locaux-v6';
    if (!Array.isArray(parsed.categories) || !Array.isArray(parsed.shortcuts)) return null;

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
    categoryId: shortcut.categoryId || categoryByName.get(shortcut.category) || categories[0]?.id || '',
    description: shortcut.description || '',
    order: Number.isFinite(shortcut.order) ? shortcut.order : index
  }));

  return { categories, shortcuts };
}
