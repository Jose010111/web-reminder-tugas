const DB_NAME = "ingetin-files";
const DB_VERSION = 1;
const STORE_NAME = "files";

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Database berkas tidak dapat dibuka."));
  });
}

export async function saveFile(id, blob) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put({ id, blob });
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => { database.close(); reject(transaction.error || new Error("Berkas gagal disimpan.")); };
    transaction.onabort = () => { database.close(); reject(transaction.error || new Error("Penyimpanan berkas dibatalkan.")); };
  });
}

export async function getFile(id) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(id);
    request.onsuccess = () => { database.close(); resolve(request.result?.blob || null); };
    request.onerror = () => { database.close(); reject(request.error || new Error("Berkas tidak dapat dibaca.")); };
  });
}

export async function deleteFile(id) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => { database.close(); reject(transaction.error || new Error("Berkas tidak dapat dihapus.")); };
  });
}
