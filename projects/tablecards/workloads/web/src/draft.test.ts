import { describe, expect, it, vi } from 'vitest';

import { createTableCardsDraftStore } from './draft';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe('TableCards protected draft', () => {
  it('round-trips a bounded draft without changing guest order or duplicates', () => {
    const storage = memoryStorage();
    const store = createTableCardsDraftStore(storage, () =>
      Date.parse('2026-09-27T10:00:00Z'),
    );
    store.write({
      title: 'Autumn dinner',
      designId: 'garden-sage',
      layoutId: 'landscape_6',
      guests: [{ name: 'Ada' }, { name: 'Ada', table: '2' }],
    });

    expect(store.read()).toMatchObject({
      title: 'Autumn dinner',
      designId: 'garden-sage',
      layoutId: 'landscape_6',
      guests: [{ name: 'Ada' }, { name: 'Ada', table: '2' }],
    });
  });

  it('removes expired and malformed drafts instead of restoring them', () => {
    const storage = memoryStorage();
    const start = Date.parse('2026-09-27T10:00:00Z');
    const store = createTableCardsDraftStore(storage, () => start);
    store.write({
      title: 'Dinner',
      designId: 'minimal-ivory',
      layoutId: 'portrait_4',
      guests: [{ name: 'Lin' }],
    });

    const expired = createTableCardsDraftStore(
      storage,
      () => start + 61 * 60 * 1000,
    );
    expect(expired.read()).toBeNull();
    expect(storage.getItem('tablecards:protected-draft:v1')).toBeNull();

    storage.setItem('tablecards:protected-draft:v1', '{invalid');
    expect(store.read()).toBeNull();
  });

  it('clears the exact versioned key', () => {
    const storage = memoryStorage();
    const remove = vi.spyOn(storage, 'removeItem');
    const store = createTableCardsDraftStore(storage);
    store.clear();
    expect(remove).toHaveBeenCalledWith('tablecards:protected-draft:v1');
  });
});
