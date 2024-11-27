import { openDB } from 'idb'

export const initDB = async () => {
  return openDB('imageStore', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images')
      }
    },
  })
}

export async function clearIndexedDBStore() {
  const db = await initDB()
  await db.clear('images')
} 