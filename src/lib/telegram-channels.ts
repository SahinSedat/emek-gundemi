/**
 * Telegram Kaynak Kanalları Yapılandırması
 * Haber çekilecek resmî ve güvenilir kanallar
 */

export interface TelegramChannel {
    id: string
    name: string
    username: string  // @username (@ olmadan)
    category: 'resmi' | 'sendika' | 'emek' | 'haber'
    active: boolean
    description: string
}

// Varsayılan Telegram kaynak kanalları
export const DEFAULT_TELEGRAM_CHANNELS: TelegramChannel[] = [
    // === RESMİ KANALLAR ===
    {
        id: 'csgb',
        name: 'Çalışma Bakanlığı',
        username: 'csgbakanligi',
        category: 'resmi',
        active: true,
        description: 'Çalışma ve Sosyal Güvenlik Bakanlığı resmî kanalı'
    },
    {
        id: 'hazine',
        name: 'Hazine ve Maliye',
        username: 'hazabornotcom',
        category: 'resmi',
        active: true,
        description: 'Hazine ve Maliye Bakanlığı duyuruları'
    },

    // === SENDİKA KANALLARI ===
    {
        id: 'turk-is',
        name: 'Türk-İş',
        username: 'turkisorg',
        category: 'sendika',
        active: true,
        description: 'Türk-İş Konfederasyonu resmî kanalı'
    },
    {
        id: 'disk',
        name: 'DİSK',
        username: 'diskorgtr',
        category: 'sendika',
        active: true,
        description: 'DİSK Konfederasyonu resmî kanalı'
    },
    {
        id: 'memur-sen',
        name: 'Memur-Sen',
        username: 'memursenorgtr',
        category: 'sendika',
        active: true,
        description: 'Memur-Sen Konfederasyonu resmî kanalı'
    },
    {
        id: 'kesk',
        name: 'KESK',
        username: 'keskorgtr',
        category: 'sendika',
        active: true,
        description: 'KESK Konfederasyonu resmî kanalı'
    },
    {
        id: 'hak-is',
        name: 'Hak-İş',
        username: 'hakisorgtr',
        category: 'sendika',
        active: true,
        description: 'Hak-İş Konfederasyonu resmî kanalı'
    },

    // === EMEK / KAMU KANALLARI ===
    {
        id: 'emek-gundemi',
        name: 'Emek Gündemi',
        username: 'emek_gundemi',
        category: 'emek',
        active: true,
        description: 'Emek Gündemi haber kanalı'
    },
    {
        id: 'kamu-personel',
        name: 'Kamu Personel',
        username: 'kamupersonel',
        category: 'emek',
        active: true,
        description: 'Kamu personeli haber ve duyuruları'
    },
]

// Kategori etiketleri
export function getCategoryLabel(category: string): string {
    switch (category) {
        case 'resmi': return '🏛️ Resmî Kaynaklar'
        case 'sendika': return '✊ Sendikalar'
        case 'emek': return '📢 Emek Kanalları'
        case 'haber': return '📰 Haber Kanalları'
        default: return '🌐 Diğer'
    }
}

// Mesaj içerik filtreleme kuralları
export const CONTENT_RULES = {
    // Haber değeri taşıyan anahtar kelimeler
    newsworthy: [
        'açıklama', 'duyuru', 'karar', 'yönetmelik',
        'zam', 'maaş', 'ücret', 'artış', 'düzenleme',
        'TİS', 'toplu sözleşme', 'KÇP', 'kıdem tazminatı',
        'asgari ücret', 'emekli', 'memur', 'işçi',
        'SGK', 'prim', 'ikramiye', 'hak', 'yeni',
        'tarih', 'başvuru', 'son tarih', 'resmi gazete'
    ],

    // Spam/polemik kelimeleri (filtrelenecek)
    spam: [
        'kulis', 'iddia', 'söylenti', 'dedikodu',
        'caps', 'komik', 'espri', 'şaka',
        'siyasi', 'polemik', 'tartışma', 'kavga'
    ],

    // Minimum içerik uzunluğu
    minLength: 50,

    // Maksimum günlük paylaşım
    maxDailyPosts: 8,

    // Paylaşımlar arası minimum dakika
    minIntervalMinutes: 30,

    // Gece paylaşım engeli (saat)
    nightHoursStart: 1,  // 01:00
    nightHoursEnd: 7,    // 07:00
}

// Mesajın haber değeri olup olmadığını kontrol et
export function isNewsworthy(text: string): boolean {
    const lowerText = text.toLowerCase()

    // Spam/polemik kontrolü
    const hasSpam = CONTENT_RULES.spam.some(word => lowerText.includes(word))
    if (hasSpam) return false

    // Minimum uzunluk
    if (text.length < CONTENT_RULES.minLength) return false

    // Haber değeri taşıyan kelime var mı?
    const hasNewsworthy = CONTENT_RULES.newsworthy.some(word => lowerText.includes(word))

    return hasNewsworthy
}

// Paylaşım yapılabilir mi? (Zaman kontrolü)
export function canPublishNow(): { allowed: boolean; reason?: string } {
    const now = new Date()
    const hour = now.getHours()

    // Gece kontrolü
    if (hour >= CONTENT_RULES.nightHoursStart && hour < CONTENT_RULES.nightHoursEnd) {
        return {
            allowed: false,
            reason: `Gece saatlerinde paylaşım yapılmıyor (${CONTENT_RULES.nightHoursStart}:00 - ${CONTENT_RULES.nightHoursEnd}:00)`
        }
    }

    return { allowed: true }
}
