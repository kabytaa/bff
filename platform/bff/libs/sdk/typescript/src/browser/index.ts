import type { AuthSessionState } from '../core';

export interface AuthSessionSnapshot {
  readonly generation: number;
  readonly state: AuthSessionState;
}

export type AuthSessionListener = (snapshot: AuthSessionSnapshot) => void;

export interface AuthSessionStore {
  getSnapshot(): AuthSessionSnapshot;
  replace(state: AuthSessionState): AuthSessionSnapshot;
  subscribe(listener: AuthSessionListener): () => void;
}

export function createAuthSessionStore(
  initialState: AuthSessionState = { status: 'loading' },
): AuthSessionStore {
  let snapshot: AuthSessionSnapshot = {
    generation: 0,
    state: initialState,
  };
  const listeners = new Set<AuthSessionListener>();

  return {
    getSnapshot: () => snapshot,
    replace: (state) => {
      snapshot = { generation: snapshot.generation + 1, state };
      for (const listener of listeners) listener(snapshot);
      return snapshot;
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
