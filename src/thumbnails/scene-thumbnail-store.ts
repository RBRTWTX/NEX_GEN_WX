export interface SceneThumbnailRecord {
  key: string;
  projectId: string;
  sceneId: string;
  fingerprint: string;
  dataUrl: string;
  width: number;
  height: number;
  updatedAt: string;
}

const DB_NAME = 'nex-gen-wx-render-cache';
const STORE_NAME = 'scene-thumbnails';
const DB_VERSION = 1;

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('projectId', 'projectId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Thumbnail cache could not be opened.'));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Thumbnail cache request failed.'));
  });
}

export function thumbnailKey(projectId: string, sceneId: string): string {
  return `${projectId}:${sceneId}`;
}

export async function loadProjectThumbnails(projectId: string): Promise<SceneThumbnailRecord[]> {
  const database = await openDatabase();
  if (!database) return [];
  try {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const index = transaction.objectStore(STORE_NAME).index('projectId');
    return await requestResult(index.getAll(projectId) as IDBRequest<SceneThumbnailRecord[]>);
  } finally {
    database.close();
  }
}

export async function saveSceneThumbnail(record: SceneThumbnailRecord): Promise<void> {
  const database = await openDatabase();
  if (!database) return;
  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(record);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Thumbnail cache write failed.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Thumbnail cache write was aborted.'));
    });
  } finally {
    database.close();
  }
}

export async function removeStaleThumbnails(projectId: string, sceneIds: Set<string>): Promise<void> {
  const records = await loadProjectThumbnails(projectId);
  const stale = records.filter((record) => !sceneIds.has(record.sceneId));
  if (!stale.length) return;
  const database = await openDatabase();
  if (!database) return;
  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    for (const record of stale) store.delete(record.key);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Thumbnail cleanup failed.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Thumbnail cleanup was aborted.'));
    });
  } finally {
    database.close();
  }
}
