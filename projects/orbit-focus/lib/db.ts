import { openDB, IDBPDatabase } from 'idb';
import { Task } from '../types';

const DB_NAME = 'OrbitFocusDB';
const STORE_NAME = 'tasks';
const DB_VERSION = 1;

interface OrbitFocusDB extends IDBPDatabase<OrbitFocusDB> {
  tasks: Task;
}

let dbPromise: Promise<IDBPDatabase<OrbitFocusDB>>;

if (typeof window !== 'undefined') {
  dbPromise = openDB<OrbitFocusDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
}

export const db = {
  async getTasks(): Promise<Task[]> {
    return (await dbPromise).getAll(STORE_NAME);
  },

  async addTask(task: Task): Promise<void> {
    await (await dbPromise).put(STORE_NAME, task);
  },

  async updateTask(task: Task): Promise<void> {
    await (await dbPromise).put(STORE_NAME, task);
  },

  async deleteTask(id: string): Promise<void> {
    await (await dbPromise).delete(STORE_NAME, id);
  },

  async clearTasks(): Promise<void> {
    await (await dbPromise).clear(STORE_NAME);
  }
};