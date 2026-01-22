/**
 * Haber Kaynakları - Gerçek RSS Feed'leri ile
 */

export interface NewsSource {
    id: string
    name: string
    url: string
    newsUrl: string
    rssUrl?: string  // RSS feed varsa
    type: 'resmi' | 'sendika' | 'haber' | 'bakanlik' | 'custom'
    active: boolean
    description: string
}

// Varsayılan kaynaklar - RSS feed'li olanlar
export const DEFAULT_SOURCES: NewsSource[] = [
    // === RESMİ KAYNAKLAR ===
    {
        id: 'resmi-gazete',
        name: 'Resmî Gazete',
        url: 'https://www.resmigazete.gov.tr',
        newsUrl: 'https://www.resmigazete.gov.tr/default.aspx',
        type: 'resmi',
        active: true,
        description: 'Kanun, KHK, Yönetmelik'
    },
    {
        id: 'tbmm',
        name: 'TBMM',
        url: 'https://www.tbmm.gov.tr',
        newsUrl: 'https://www.tbmm.gov.tr/haber',
        type: 'resmi',
        active: true,
        description: 'Meclis Haberleri'
    },

    // === BAKANLIKLAR ===
    {
        id: 'csgb',
        name: 'Çalışma Bakanlığı',
        url: 'https://www.csgb.gov.tr',
        newsUrl: 'https://www.csgb.gov.tr/haberler/',
        type: 'bakanlik',
        active: true,
        description: 'İş ve Sosyal Güvenlik'
    },

    // === SENDİKALAR ===
    {
        id: 'turk-is',
        name: 'Türk-İş',
        url: 'https://www.turkis.org.tr',
        newsUrl: 'https://www.turkis.org.tr/kategori/haberler/',
        type: 'sendika',
        active: true,
        description: 'İşçi Sendikaları Konfederasyonu'
    },
    {
        id: 'disk',
        name: 'DİSK',
        url: 'https://disk.org.tr',
        newsUrl: 'https://disk.org.tr/category/basin-aciklamalari/',
        type: 'sendika',
        active: true,
        description: 'Devrimci İşçi Sendikaları'
    },
    {
        id: 'memur-sen',
        name: 'Memur-Sen',
        url: 'https://www.memursen.org.tr',
        newsUrl: 'https://www.memursen.org.tr/haberler',
        type: 'sendika',
        active: true,
        description: 'Memur Sendikaları'
    },
    {
        id: 'kesk',
        name: 'KESK',
        url: 'https://www.kesk.org.tr',
        newsUrl: 'https://www.kesk.org.tr/2025/',
        type: 'sendika',
        active: true,
        description: 'Kamu Emekçileri Sendikaları'
    },

    // === HABER SİTELERİ - RSS DESTEKLİ ===
    {
        id: 'memurlar',
        name: 'Memurlar.net',
        url: 'https://www.memurlar.net',
        newsUrl: 'https://www.memurlar.net/haber/',
        rssUrl: 'https://www.memurlar.net/rss/',
        type: 'haber',
        active: true,
        description: 'Memur Haberleri - RSS Destekli'
    },
    {
        id: 'kamuajans',
        name: 'Kamu Ajans',
        url: 'https://www.kamuajans.com',
        newsUrl: 'https://www.kamuajans.com/gundem/',
        rssUrl: 'https://www.kamuajans.com/rss',
        type: 'haber',
        active: true,
        description: 'Kamu Haberleri - RSS Destekli'
    },
    {
        id: 'memurhaber',
        name: 'Memur Haber',
        url: 'https://www.memurhaber.com',
        newsUrl: 'https://www.memurhaber.com/guncel/',
        type: 'haber',
        active: true,
        description: 'Güncel Memur Haberleri'
    },
]

export function getSourceLabel(type: string): string {
    switch (type) {
        case 'resmi': return '🏛️ Resmî Kaynaklar'
        case 'bakanlik': return '🏢 Bakanlıklar'
        case 'sendika': return '✊ Sendikalar'
        case 'haber': return '📰 Haber Siteleri'
        case 'custom': return '➕ Özel Kaynaklar'
        default: return '🌐 Diğer'
    }
}

export function getSourceIcon(type: string): string {
    switch (type) {
        case 'resmi': return '🏛️'
        case 'bakanlik': return '🏢'
        case 'sendika': return '✊'
        case 'haber': return '📰'
        case 'custom': return '➕'
        default: return '🌐'
    }
}
