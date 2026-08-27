import { base44 } from '@/api/base44Client';
import { isGuestMode } from '@/lib/guestDB';

const QUEUE_KEY = 'focused_sync_queue';

// ---------------------------------------------------------------------------
// Queue persistence
// ---------------------------------------------------------------------------

function getQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveQueue(queue) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to save sync queue:', e);
  }
}

// ---------------------------------------------------------------------------
// Public queue operations
// ---------------------------------------------------------------------------

/**
 * Add an operation to the sync queue.
 * Smart-merges with existing entries: updates to pending creates merge their
 * payload, deletes of pending creates remove the entry entirely, and
 * repeated updates to the same server record replace the pending payload.
 */
export function addToQueue(op) {
  if (isGuestMode()) return;
  const queue = getQueue();

  // Update to a pending create → merge payload into the create entry
  if (op.type === 'update' && op.tempId) {
    const idx = queue.findIndex((q) => q.tempId === op.tempId && q.type === 'create');
    if (idx >= 0) {
      queue[idx].payload = { ...queue[idx].payload, ...op.payload };
      saveQueue(queue);
      return;
    }
  }

  // Delete of a pending create → just remove the create entry
  if (op.type === 'delete' && op.tempId) {
    const idx = queue.findIndex((q) => q.tempId === op.tempId && q.type === 'create');
    if (idx >= 0) {
      queue.splice(idx, 1);
      saveQueue(queue);
      return;
    }
  }

  // Repeated update to same server record → replace pending payload
  if (op.type === 'update' && op.serverId) {
    const idx = queue.findIndex((q) => q.serverId === op.serverId && q.type === 'update');
    if (idx >= 0) {
      queue[idx].payload = { ...queue[idx].payload, ...op.payload };
      saveQueue(queue);
      return;
    }
  }

  queue.push({
    ...op,
    id: `op_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    attempts: 0,
    nextRetry: Date.now(),
  });
  saveQueue(queue);
}

export function getPendingCount() {
  return getQueue().length;
}

export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY);
}

// ---------------------------------------------------------------------------
// Merge pending operations with cloud data
// ---------------------------------------------------------------------------

/**
 * Merges cloud data with pending local operations from the sync queue.
 * - Pending creates are prepended (with _pending flag)
 * - Pending updates are applied to matching records
 * - Pending deletes remove matching records
 */
export function mergePending(entityName, cloudData) {
  const queue = getQueue();
  const entityOps = queue.filter((op) => op.entity === entityName);

  if (entityOps.length === 0) return cloudData;

  let merged = [...cloudData];

  // Apply pending creates
  entityOps
    .filter((op) => op.type === 'create')
    .forEach((op) => {
      if (!merged.some((r) => r.id === op.tempId)) {
        merged = [{ id: op.tempId, ...op.payload, _pending: true }, ...merged];
      }
    });

  // Apply pending updates
  entityOps
    .filter((op) => op.type === 'update')
    .forEach((op) => {
      if (op.tempId) {
        merged = merged.map((r) =>
          r.id === op.tempId ? { ...r, ...op.payload, _pending: true } : r
        );
      } else if (op.serverId) {
        merged = merged.map((r) =>
          r.id === op.serverId ? { ...r, ...op.payload, _pending: true } : r
        );
      }
    });

  // Apply pending deletes
  const deletedServerIds = entityOps
    .filter((op) => op.type === 'delete' && op.serverId)
    .map((op) => op.serverId);
  const deletedTempIds = entityOps
    .filter((op) => op.type === 'delete' && op.tempId)
    .map((op) => op.tempId);
  merged = merged.filter(
    (r) => !deletedServerIds.includes(r.id) && !deletedTempIds.includes(r.id)
  );

  return merged;
}

// ---------------------------------------------------------------------------
// Process queue — syncs pending operations to the cloud
// ---------------------------------------------------------------------------

let processing = false;

export async function processQueue(onSynced) {
  if (processing) return;
  if (isGuestMode()) return; // guests use localStorage — no cloud sync
  processing = true;
  try {
    let queue = getQueue();
    const now = Date.now();
    const syncedEntities = new Set();
    let changed = false;

    for (let i = 0; i < queue.length; i++) {
      const op = queue[i];
      if (op.nextRetry > now) continue;

      try {
        if (op.type === 'create') {
          await base44.entities[op.entity].create(op.payload);
        } else if (op.type === 'update') {
          await base44.entities[op.entity].update(op.serverId, op.payload);
        } else if (op.type === 'delete') {
          await base44.entities[op.entity].delete(op.serverId);
        }

        // Success — remove from queue
        queue = queue.filter((q) => q.id !== op.id);
        saveQueue(queue);
        changed = true;
        syncedEntities.add(op.entity);
      } catch (e) {
        // 404 = record already gone — safe to remove from queue
        if (e?.status === 404 || e?.code === 404 || e?.statusCode === 404) {
          queue = queue.filter((q) => q.id !== op.id);
          saveQueue(queue);
          changed = true;
          continue;
        }

        // Update retry info with exponential backoff (max 60s)
        const attempts = (op.attempts || 0) + 1;
        const nextRetry = Date.now() + Math.min(2000 * Math.pow(2, Math.min(attempts, 5)), 60000);
        const idx = queue.findIndex((q) => q.id === op.id);
        if (idx >= 0) {
          queue[idx].attempts = attempts;
          queue[idx].nextRetry = nextRetry;
          saveQueue(queue);
        }
      }
    }

    if (changed && onSynced) onSynced(syncedEntities);
  } finally {
    processing = false;
  }
}