import { base44 } from '@/api/base44Client';

const PREFIX = 'guest_data_';
const GUEST_FLAG = 'guest_mode_active';

let __isGuest = false;

// Initialize from localStorage on module load so getDB() returns the right
// store before AuthContext's mount effect runs.
try {
  if (localStorage.getItem(GUEST_FLAG) === '1') {
    __isGuest = true;
  }
} catch (e) { /* ignore */ }

export function setGuestMode(isGuest) {
  __isGuest = isGuest;
  try {
    if (isGuest) localStorage.setItem(GUEST_FLAG, '1');
    else localStorage.removeItem(GUEST_FLAG);
  } catch (e) { /* ignore */ }
}

export function isGuestMode() {
  return __isGuest;
}

export function isGuestFlagSet() {
  try {
    return localStorage.getItem(GUEST_FLAG) === '1';
  } catch {
    return false;
  }
}

export function getGuestUser() {
  return {
    id: 'guest-local',
    email: null,
    full_name: 'Guest',
    role: 'user',
    isGuest: true,
  };
}

export function clearGuestData() {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((k) => {
      if (k.startsWith(PREFIX)) localStorage.removeItem(k);
    });
    localStorage.removeItem(GUEST_FLAG);
  } catch (e) { /* ignore */ }
}

// --- localStorage entity store ---

function getStore(name) {
  try {
    return JSON.parse(localStorage.getItem(PREFIX + name) || '[]');
  } catch {
    return [];
  }
}

function setStore(name, data) {
  localStorage.setItem(PREFIX + name, JSON.stringify(data));
}

function genId() {
  return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function addBuiltins(record) {
  const now = new Date().toISOString();
  return {
    id: genId(),
    created_date: now,
    updated_date: now,
    created_by_id: 'guest-local',
    ...record,
  };
}

function applySort(items, sort) {
  if (!sort) return items;
  const desc = sort.startsWith('-');
  const field = desc ? sort.slice(1) : sort;
  return [...items].sort((a, b) => {
    const av = a[field] ?? '';
    const bv = b[field] ?? '';
    if (av < bv) return desc ? 1 : -1;
    if (av > bv) return desc ? -1 : 1;
    return 0;
  });
}

function applyLimit(items, limit) {
  if (!limit) return items;
  return items.slice(0, limit);
}

function matchQuery(item, query) {
  if (!query) return true;
  for (const [key, value] of Object.entries(query)) {
    if (key === 'created_by_id') continue; // all guest items are owned by guest
    if (key === '$or') {
      if (!value.some((cond) => matchQuery(item, cond))) return false;
      continue;
    }
    if (item[key] !== value) return false;
  }
  return true;
}

function createGuestEntity(entityName) {
  return {
    list: async (sort, limit) => applyLimit(applySort(getStore(entityName), sort), limit),
    filter: async (query, sort, limit) =>
      applyLimit(applySort(getStore(entityName).filter((i) => matchQuery(i, query)), sort), limit),
    get: async (id) => getStore(entityName).find((i) => i.id === id) || null,
    create: async (data) => {
      const items = getStore(entityName);
      const record = addBuiltins(data);
      items.push(record);
      setStore(entityName, items);
      return record;
    },
    bulkCreate: async (dataArray) => {
      const items = getStore(entityName);
      const records = dataArray.map(addBuiltins);
      items.push(...records);
      setStore(entityName, items);
      return records;
    },
    update: async (id, data) => {
      const items = getStore(entityName);
      const idx = items.findIndex((i) => i.id === id);
      if (idx === -1) throw new Error('Record not found');
      items[idx] = { ...items[idx], ...data, updated_date: new Date().toISOString() };
      setStore(entityName, items);
      return items[idx];
    },
    updateMany: async (query, update) => {
      const items = getStore(entityName);
      let updated = 0;
      const newItems = items.map((item) => {
        if (matchQuery(item, query)) {
          updated++;
          const updatedItem = { ...item, updated_date: new Date().toISOString() };
          if (update.$set) Object.assign(updatedItem, update.$set);
          return updatedItem;
        }
        return item;
      });
      setStore(entityName, newItems);
      return { modifiedCount: updated };
    },
    bulkUpdate: async (updates) => {
      const items = getStore(entityName);
      const idMap = new Map(updates.map((u) => [u.id, u]));
      const newItems = items.map((item) =>
        idMap.has(item.id)
          ? { ...item, ...idMap.get(item.id), updated_date: new Date().toISOString() }
          : item
      );
      setStore(entityName, newItems);
      return { modifiedCount: updates.length };
    },
    delete: async (id) => {
      setStore(entityName, getStore(entityName).filter((i) => i.id !== id));
      return { success: true };
    },
    deleteMany: async (query) => {
      const items = getStore(entityName);
      const newItems = items.filter((i) => !matchQuery(i, query));
      setStore(entityName, newItems);
      return { deletedCount: items.length - newItems.length };
    },
    schema: async () => ({}),
  };
}

const guestEntities = new Proxy(
  {},
  {
    get: (target, prop) => {
      if (typeof prop !== 'string') return undefined;
      if (!(prop in target)) target[prop] = createGuestEntity(prop);
      return target[prop];
    },
  }
);

export function getDB() {
  return __isGuest ? guestEntities : base44.entities;
}