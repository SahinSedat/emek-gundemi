/**
 * IndexedDB veritabanı - Haberler için kalıcı depolama
 */

const DB_NAME = 'emek_gundemi_db'
const DB_VERSION = 1
const STORE_NEWS = 'news'
const STORE_ACCOUNTS = 'accounts'

export interface StoredNews {
    id: string
    title: string
    content: string
    source: string
    sourceUrl: string
    sourceType: 'twitter' | 'rss' | 'manual'
    tweetId?: string
    authorHandle?: string
    processed: boolean
    summary?: string[]
    aiComment?: string
    verified?: boolean
    newsworthy?: boolean
    importance?: 'low' | 'medium' | 'high'
    sharedTo?: string[]
    createdAt: number
}

export interface TrackedAccount {
    id: string
    handle: string
    name: string
    type: 'sendika' | 'bakanlik' | 'resmi' | 'diger'
    active: boolean
    lastChecked?: number
}

let db: IDBDatabase | null = null

/**
 * Veritabanını aç
 */
export async function openDatabase(): Promise<IDBDatabase> {
    if (db) return db

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION)

        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
            db = request.result
            resolve(db)
        }

        request.onupgradeneeded = (event) => {
            const database = (event.target as IDBOpenDBRequest).result

            // Haberler store
            if (!database.objectStoreNames.contains(STORE_NEWS)) {
                const newsStore = database.createObjectStore(STORE_NEWS, { keyPath: 'id' })
                newsStore.createIndex('createdAt', 'createdAt', { unique: false })
                newsStore.createIndex('sourceType', 'sourceType', { unique: false })
                newsStore.createIndex('processed', 'processed', { unique: false })
            }

            // Takip edilen hesaplar store
            if (!database.objectStoreNames.contains(STORE_ACCOUNTS)) {
                const accountsStore = database.createObjectStore(STORE_ACCOUNTS, { keyPath: 'id' })
                accountsStore.createIndex('handle', 'handle', { unique: true })
                accountsStore.createIndex('type', 'type', { unique: false })
            }
        }
    })
}

// ===================== HABER İŞLEMLERİ =====================

/**
 * Haber ekle
 */
export async function addNews(news: Omit<StoredNews, 'id' | 'createdAt'>): Promise<StoredNews> {
    const database = await openDatabase()
    const id = `news_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const storedNews: StoredNews = {
        ...news,
        id,
        createdAt: Date.now(),
    }

    return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NEWS, 'readwrite')
        const store = tx.objectStore(STORE_NEWS)
        const request = store.add(storedNews)

        request.onsuccess = () => resolve(storedNews)
        request.onerror = () => reject(request.error)
    })
}

/**
 * Haber güncelle
 */
export async function updateNews(news: StoredNews): Promise<void> {
    const database = await openDatabase()

    return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NEWS, 'readwrite')
        const store = tx.objectStore(STORE_NEWS)
        const request = store.put(news)

        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
    })
}

/**
 * Tüm haberleri getir
 */
export async function getAllNews(): Promise<StoredNews[]> {
    const database = await openDatabase()

    return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NEWS, 'readonly')
        const store = tx.objectStore(STORE_NEWS)
        const index = store.index('createdAt')
        const request = index.openCursor(null, 'prev') // En yeni önce

        const results: StoredNews[] = []
        request.onsuccess = () => {
            const cursor = request.result
            if (cursor) {
                results.push(cursor.value)
                cursor.continue()
            } else {
                resolve(results)
            }
        }
        request.onerror = () => reject(request.error)
    })
}

/**
 * Haber sil
 */
export async function deleteNews(id: string): Promise<void> {
    const database = await openDatabase()

    return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NEWS, 'readwrite')
        const store = tx.objectStore(STORE_NEWS)
        const request = store.delete(id)

        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
    })
}

/**
 * Toplu haber sil
 */
export async function deleteMultipleNews(ids: string[]): Promise<void> {
    const database = await openDatabase()

    return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NEWS, 'readwrite')
        const store = tx.objectStore(STORE_NEWS)

        let completed = 0
        const total = ids.length

        ids.forEach((id) => {
            const request = store.delete(id)
            request.onsuccess = () => {
                completed++
                if (completed === total) resolve()
            }
            request.onerror = () => reject(request.error)
        })

        if (total === 0) resolve()
    })
}

/**
 * Tüm haberleri sil
 */
export async function clearAllNews(): Promise<void> {
    const database = await openDatabase()

    return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NEWS, 'readwrite')
        const store = tx.objectStore(STORE_NEWS)
        const request = store.clear()

        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
    })
}

// ===================== HESAP İŞLEMLERİ =====================

/**
 * Takip edilecek hesap ekle
 */
export async function addAccount(account: Omit<TrackedAccount, 'id'>): Promise<TrackedAccount> {
    const database = await openDatabase()
    const id = `acc_${Date.now()}`
    const storedAccount: TrackedAccount = { ...account, id }

    return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_ACCOUNTS, 'readwrite')
        const store = tx.objectStore(STORE_ACCOUNTS)
        const request = store.add(storedAccount)

        request.onsuccess = () => resolve(storedAccount)
        request.onerror = () => reject(request.error)
    })
}

/**
 * Tüm hesapları getir
 */
export async function getAllAccounts(): Promise<TrackedAccount[]> {
    const database = await openDatabase()

    return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_ACCOUNTS, 'readonly')
        const store = tx.objectStore(STORE_ACCOUNTS)
        const request = store.getAll()

        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })
}

/**
 * Hesap sil
 */
export async function deleteAccount(id: string): Promise<void> {
    const database = await openDatabase()

    return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_ACCOUNTS, 'readwrite')
        const store = tx.objectStore(STORE_ACCOUNTS)
        const request = store.delete(id)

        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
    })
}

/**
 * Varsayılan hesapları ekle
 */
export async function initializeDefaultAccounts(): Promise<void> {
    const existing = await getAllAccounts()
    if (existing.length > 0) return

    const defaults: Omit<TrackedAccount, 'id'>[] = [
        { handle: 'CalismaBakani', name: 'Çalışma Bakanı', type: 'bakanlik', active: true },
        { handle: 'turkikiemeksend', name: 'Türk-İş', type: 'sendika', active: true },
        { handle: 'memaborumsen', name: 'Memur-Sen', type: 'sendika', active: true },
        { handle: 'tcaborabakanal', name: 'TBMM', type: 'resmi', active: true },
    ]

    for (const acc of defaults) {
        await addAccount(acc)
    }
}
