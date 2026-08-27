import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getDB } from '@/lib/guestDB';
import { useAuth } from '@/lib/AuthContext';
import { addToQueue } from './syncQueue';

const makeTempId = () => `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Local-first save: updates cache immediately (never rolls back on error).
 * On cloud sync failure, queues the operation for background retry.
 * The optimistic state stays in the cache until the queue is processed.
 */
export function useOptimisticSave(entityName, queryKeyBase) {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useCallback(async (existing, payload) => {
    const key = [queryKeyBase, user?.id];
    await qc.cancelQueries({ queryKey: key });
    let tid;

    // Update cache immediately (local-first)
    qc.setQueryData(key, (cur) => {
      if (existing) {
        return cur.map((e) => (e.id === existing.id ? { ...e, ...payload } : e));
      }
      tid = makeTempId();
      return [{ id: tid, ...payload }, ...cur];
    });

    // Try cloud sync
    try {
      const isTemp = existing && String(existing.id).startsWith('temp-');
      const result = (existing && !isTemp)
        ? await getDB()[entityName].update(existing.id, payload)
        : await getDB()[entityName].create(payload);
      // Replace temp record with real one
      qc.setQueryData(key, (cur) => {
        const filtered = cur.filter((e) => e.id !== result.id && e.id !== tid);
        return [...filtered, result];
      });
      return result;
    } catch (e) {
      // Queue for background retry — DON'T roll back
      if (existing && String(existing.id).startsWith('temp-')) {
        addToQueue({ type: 'update', entity: entityName, tempId: existing.id, payload });
      } else if (existing) {
        addToQueue({ type: 'update', entity: entityName, serverId: existing.id, payload });
      } else {
        addToQueue({ type: 'create', entity: entityName, tempId: tid, payload });
      }
      console.error('Sync queued, will retry:', e);
      return existing ? { ...existing, ...payload } : { id: tid, ...payload };
    }
  }, [qc, user?.id, entityName, queryKeyBase]);
}

/**
 * Local-first delete: removes from cache immediately (never rolls back on error).
 * Temp IDs (pending creates) are removed from the queue. Server IDs are queued
 * for background retry.
 */
export function useOptimisticRemove(entityName, queryKeyBase) {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useCallback(async (id) => {
    const key = [queryKeyBase, user?.id];
    await qc.cancelQueries({ queryKey: key });

    // Remove from cache immediately (local-first)
    qc.setQueryData(key, (cur) => cur.filter((e) => e.id !== id));

    const isTemp = String(id).startsWith('temp-');

    if (isTemp) {
      // Pending create — just remove from queue
      addToQueue({ type: 'delete', entity: entityName, tempId: id });
      return;
    }

    // Try cloud sync
    try {
      await getDB()[entityName].delete(id);
    } catch (e) {
      // Queue for background retry — DON'T roll back
      addToQueue({ type: 'delete', entity: entityName, serverId: id });
      console.error('Sync queued, will retry:', e);
    }
  }, [qc, user?.id, entityName, queryKeyBase]);
}

/**
 * Local-first field update: patches specific fields (never rolls back on error).
 */
export function useOptimisticUpdate(entityName, queryKeyBase) {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useCallback(async (id, payload) => {
    const key = [queryKeyBase, user?.id];
    await qc.cancelQueries({ queryKey: key });

    // Update cache immediately (local-first)
    qc.setQueryData(key, (cur) => cur.map((e) => (e.id === id ? { ...e, ...payload } : e)));

    const isTemp = String(id).startsWith('temp-');

    if (isTemp) {
      // Update the pending create in the queue
      addToQueue({ type: 'update', entity: entityName, tempId: id, payload });
      return;
    }

    // Try cloud sync
    try {
      await getDB()[entityName].update(id, payload);
    } catch (e) {
      // Queue for background retry — DON'T roll back
      addToQueue({ type: 'update', entity: entityName, serverId: id, payload });
      console.error('Sync queued, will retry:', e);
    }
  }, [qc, user?.id, entityName, queryKeyBase]);
}

/**
 * Local-first settings update: patches the settings object (never rolls back).
 */
export function useOptimisticSettingsPatch() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useCallback(async (settingsId, payload) => {
    const key = ['userSettings', user?.id];
    await qc.cancelQueries({ queryKey: key });

    // Update cache immediately (local-first)
    qc.setQueryData(key, (cur) => (cur ? { ...cur, ...payload } : cur));

    // Try cloud sync
    try {
      await getDB().UserSettings.update(settingsId, payload);
    } catch (e) {
      // Queue for background retry — DON'T roll back
      addToQueue({ type: 'update', entity: 'UserSettings', serverId: settingsId, payload });
      console.error('Sync queued, will retry:', e);
    }
  }, [qc, user?.id]);
}