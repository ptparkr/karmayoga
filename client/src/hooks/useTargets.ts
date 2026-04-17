import { useEffect, useState } from 'react';
import { createTarget, getStoredTargets, saveStoredTargets } from '../lib/targets';
import type { Target, TargetDraft } from '../types';

export function useTargets() {
  const [targets, setTargets] = useState<Target[]>([]);

  useEffect(() => {
    setTargets(getStoredTargets());
  }, []);

  const persist = (updater: (current: Target[]) => Target[]) => {
    setTargets(current => {
      const next = updater(current);
      saveStoredTargets(next);
      return next;
    });
  };

  const addTarget = (draft: TargetDraft) => {
    persist(current => {
      const nextTarget = createTarget(draft);
      const next = draft.isPrimary
        ? current.map(target => ({ ...target, isPrimary: false }))
        : [...current];
      return [...next, nextTarget];
    });
  };

  const updateTarget = (id: string, draft: TargetDraft) => {
    persist(current => current.map(target => {
      if (draft.isPrimary && target.id !== id) {
        return { ...target, isPrimary: false };
      }

      if (target.id !== id) {
        return target;
      }

      return {
        ...target,
        title: draft.title.trim(),
        deadline: draft.deadline,
        description: draft.description?.trim() || '',
        color: draft.color,
        isPrimary: draft.isPrimary,
      };
    }));
  };

  const removeTarget = (id: string) => {
    persist(current => current.filter(target => target.id !== id));
  };

  const completeTarget = (id: string) => {
    persist(current => current.map(target => target.id === id
      ? { ...target, completed: true, completedAt: new Date().toISOString() }
      : target));
  };

  const setPrimary = (id: string) => {
    persist(current => current.map(target => ({ ...target, isPrimary: target.id === id })));
  };

  return {
    targets,
    addTarget,
    updateTarget,
    removeTarget,
    completeTarget,
    setPrimary,
  };
}
