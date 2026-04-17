import { storageGet, storageSet } from './storage';
import type { Target, TargetDraft } from '../types';

const TARGETS_KEY = 'karma-yoga.targets.v1';

export function getStoredTargets(): Target[] {
  return storageGet<Target[]>(TARGETS_KEY, []).sort((a, b) => {
    if (a.completed !== b.completed) {
      return Number(a.completed) - Number(b.completed);
    }

    if (a.isPrimary !== b.isPrimary) {
      return Number(b.isPrimary) - Number(a.isPrimary);
    }

    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });
}

export function saveStoredTargets(targets: Target[]): void {
  storageSet(TARGETS_KEY, targets);
}

export function createTarget(draft: TargetDraft): Target {
  return {
    id: crypto.randomUUID(),
    title: draft.title.trim(),
    deadline: draft.deadline,
    description: draft.description?.trim() || '',
    color: draft.color,
    isPrimary: draft.isPrimary,
    completed: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
}
