import { useState, useEffect, useCallback } from 'react';

// Types for offline queue
interface QueuedOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
}

// IndexedDB wrapper
const DB_NAME = 'dts_offline_db';
const DB_VERSION = 1;
const CACHE_STORE = 'cached_data';
const QUEUE_STORE = 'operation_queue';

class OfflineDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(CACHE_STORE)) {
          db.createObjectStore(CACHE_STORE, { keyPath: 'key' });
        }
        
        if (!db.objectStoreNames.contains(QUEUE_STORE)) {
          const queueStore = db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
          queueStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async cacheData(key: string, data: any): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CACHE_STORE], 'readwrite');
      const store = transaction.objectStore(CACHE_STORE);
      const request = store.put({ key, data, cachedAt: Date.now() });
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getCachedData<T>(key: string): Promise<T | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CACHE_STORE], 'readonly');
      const store = transaction.objectStore(CACHE_STORE);
      const request = store.get(key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve(request.result?.data || null);
      };
    });
  }

  async queueOperation(operation: Omit<QueuedOperation, 'id' | 'timestamp'>): Promise<void> {
    if (!this.db) await this.init();
    
    const queuedOp: QueuedOperation = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([QUEUE_STORE], 'readwrite');
      const store = transaction.objectStore(QUEUE_STORE);
      const request = store.add(queuedOp);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getQueuedOperations(): Promise<QueuedOperation[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([QUEUE_STORE], 'readonly');
      const store = transaction.objectStore(QUEUE_STORE);
      const index = store.index('timestamp');
      const request = index.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async clearQueuedOperation(id: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([QUEUE_STORE], 'readwrite');
      const store = transaction.objectStore(QUEUE_STORE);
      const request = store.delete(id);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clearAllCache(): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CACHE_STORE], 'readwrite');
      const store = transaction.objectStore(CACHE_STORE);
      const request = store.clear();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

// Singleton instance
const offlineDB = new OfflineDB();

// Hook for offline mode
export function useOfflineMode() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingOperations, setPendingOperations] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initialize DB
    offlineDB.init().then(() => {
      loadPendingCount();
    });
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadPendingCount = async () => {
    const operations = await offlineDB.getQueuedOperations();
    setPendingOperations(operations.length);
  };

  // Cache data for offline use
  const cacheData = useCallback(async (key: string, data: any) => {
    await offlineDB.cacheData(key, data);
  }, []);

  // Get cached data
  const getCachedData = useCallback(async <T>(key: string): Promise<T | null> => {
    return offlineDB.getCachedData<T>(key);
  }, []);

  // Queue an operation for later sync
  const queueOperation = useCallback(async (
    type: 'create' | 'update' | 'delete',
    table: string,
    data: any
  ) => {
    await offlineDB.queueOperation({ type, table, data });
    await loadPendingCount();
  }, []);

  // Sync queued operations when online
  const syncOperations = useCallback(async (
    syncHandler: (operation: QueuedOperation) => Promise<boolean>
  ) => {
    if (!isOnline) return { success: 0, failed: 0 };
    
    setIsSyncing(true);
    const operations = await offlineDB.getQueuedOperations();
    let success = 0;
    let failed = 0;
    
    for (const operation of operations) {
      try {
        const result = await syncHandler(operation);
        if (result) {
          await offlineDB.clearQueuedOperation(operation.id);
          success++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error('Sync operation failed:', error);
        failed++;
      }
    }
    
    await loadPendingCount();
    setIsSyncing(false);
    
    return { success, failed };
  }, [isOnline]);

  return {
    isOnline,
    pendingOperations,
    isSyncing,
    cacheData,
    getCachedData,
    queueOperation,
    syncOperations,
  };
}

// Export types
export type { QueuedOperation };
