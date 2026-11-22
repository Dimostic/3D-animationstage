/* ============================================
   Animation Stage - IndexedDB persistence layer
   ============================================
   Thin Promise-based wrapper used by autosave and undo persistence.
   Falls back gracefully when IDB is unavailable.
   ============================================ */

const StorageIDB = (() => {
    const DB_NAME = 'animstage';
    const DB_VERSION = 1;
    const STORES = ['autosaves', 'undo'];
    let dbPromise = null;

    function isAvailable() {
        try { return typeof indexedDB !== 'undefined' && !!indexedDB; }
        catch (e) { return false; }
    }

    function open() {
        if (!isAvailable()) return Promise.reject(new Error('IndexedDB unavailable'));
        if (dbPromise) return dbPromise;
        dbPromise = new Promise((resolve, reject) => {
            let req;
            try { req = indexedDB.open(DB_NAME, DB_VERSION); }
            catch (e) { reject(e); return; }
            req.onupgradeneeded = () => {
                const db = req.result;
                STORES.forEach(name => {
                    if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
                });
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error || new Error('IDB open failed'));
            req.onblocked = () => reject(new Error('IDB blocked'));
        }).catch(err => { dbPromise = null; throw err; });
        return dbPromise;
    }

    function tx(storeName, mode) {
        return open().then(db => {
            const t = db.transaction(storeName, mode);
            return { store: t.objectStore(storeName), done: new Promise((res, rej) => {
                t.oncomplete = () => res();
                t.onerror = () => rej(t.error);
                t.onabort = () => rej(t.error || new Error('IDB tx aborted'));
            })};
        });
    }

    async function put(storeName, key, value) {
        const { store, done } = await tx(storeName, 'readwrite');
        store.put(value, key);
        await done;
    }

    async function get(storeName, key) {
        const { store, done } = await tx(storeName, 'readonly');
        return new Promise((resolve, reject) => {
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
            done.catch(reject);
        });
    }

    async function del(storeName, key) {
        const { store, done } = await tx(storeName, 'readwrite');
        store.delete(key);
        await done;
    }

    return { isAvailable, open, put, get, del };
})();

if (typeof window !== 'undefined') window.StorageIDB = StorageIDB;
