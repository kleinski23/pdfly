// Tiny promise wrapper around IndexedDB for signatures + session recovery.

const DB_NAME = 'pdfly'
const DB_VERSION = 1

export interface SignatureRecord {
  id: string
  name: string
  dataUrl: string
  createdAt: number
}

export interface SessionFileRecord {
  name: string
  bytes: ArrayBuffer
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const open = indexedDB.open(DB_NAME, DB_VERSION)
    open.onupgradeneeded = () => {
      const db = open.result
      if (!db.objectStoreNames.contains('signatures')) {
        db.createObjectStore('signatures', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('session')) {
        db.createObjectStore('session', { keyPath: 'key' })
      }
    }
    open.onsuccess = () => resolve(open.result)
    open.onerror = () => reject(open.error)
  })
  return dbPromise
}

async function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(store, mode)
    const r = fn(t.objectStore(store))
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

export function dbAddSignature(sig: SignatureRecord): Promise<IDBValidKey> {
  return tx('signatures', 'readwrite', (s) => s.put(sig))
}

export function dbListSignatures(): Promise<SignatureRecord[]> {
  return tx('signatures', 'readonly', (s) => s.getAll())
}

export function dbDeleteSignature(id: string): Promise<void> {
  return tx<undefined>('signatures', 'readwrite', (s) => s.delete(id)).then(() => undefined)
}

export function dbSaveSession(files: SessionFileRecord[]): Promise<IDBValidKey> {
  return tx<IDBValidKey>('session', 'readwrite', (s) => s.put({ key: 'current', files, savedAt: Date.now() }))
}

export async function dbLoadSession(): Promise<SessionFileRecord[] | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const t = db.transaction('session', 'readonly')
    const r = t.objectStore('session').get('current')
    r.onsuccess = () => resolve((r.result?.files as SessionFileRecord[] | undefined) ?? null)
    r.onerror = () => reject(r.error)
  })
}
