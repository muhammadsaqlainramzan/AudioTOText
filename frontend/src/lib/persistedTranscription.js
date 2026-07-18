const databaseName = 'at2-transcriber';
const storeName = 'latest-transcription';
const recordKey = 'latest';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(storeName)) {
        database.createObjectStore(storeName);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, callback) {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = callback(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

export async function getPersistedTranscription() {
  if (!('indexedDB' in window)) return null;

  return withStore('readonly', (store) => store.get(recordKey));
}

export async function savePersistedTranscription(record) {
  if (!('indexedDB' in window)) return;

  await withStore('readwrite', (store) =>
    store.put(
      {
        ...record,
        updatedAt: new Date().toISOString(),
      },
      recordKey,
    ),
  );
}

export async function clearPersistedTranscription() {
  if (!('indexedDB' in window)) return;

  await withStore('readwrite', (store) => store.delete(recordKey));
}
