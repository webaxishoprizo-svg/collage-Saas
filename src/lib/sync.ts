// Stub sync engine to support local-first offline operation and avoid database schema conflicts

export type SyncState = {
  online: boolean;
  syncing: boolean;
  lastSync: string | null;
  pendingCount: number;
  error: string | null;
};

const defaultState: SyncState = {
  online: true,
  syncing: false,
  lastSync: null,
  pendingCount: 0,
  error: null,
};

export function getSyncState(): SyncState {
  return defaultState;
}

export function subscribeSync(l: (s: SyncState) => void): () => void {
  // Return dummy unsubscribe function
  return () => {};
}

export async function syncNow(): Promise<void> {
  // No-op for offline-first
}

export function startSyncEngine() {
  // No-op for offline-first
}

export async function bootstrapAfterSignIn() {
  // No-op for offline-first
}

export async function teardownAfterSignOut() {
  // No-op for offline-first
}
