/**
 * Haber Kaynakları - Doğrudan Haber Sayfalarına Linkler
 */

export interface NewsSource {
    id: string
    name: string
    url: string
    newsUrl: string  // Haberler sayfası
    type: 'resmi' | 'sendika' | 'haber' | 'bakanlik'
    active: boolean
    description: string
}

// Gerçek haber kaynak linkleri
export const DEFAULT_SOURCES: NewsSource[] = [
    // === RESMİ KAYNAKLAR ===
    {
        id: 'resmi-gazete',
        name: 'Resmî Gazete',
        url: 'https://www.resmigazete.gov.tr',
        newsUrl: 'https://www.resmigazete.gov.tr/default.aspx',
        type: 'resmi',
        active: true,
        description: 'Kanun, KHK, Yönetmelik, Atama Kararları'
    },
    {
        id: 'tbmm',
        name: 'TBMM',
        url: 'https://www.tbmm.gov.tr',
        newsUrl: 'https://www.tbmm.gov.tr/haber',
        type: 'resmi',
        active: true,
        description: 'Meclis Gündem ve Haberler'
    },

    // === BAKANLIKLAR ===
    {
        id: 'csgb',
        name: 'Çalışma Bakanlığı',
        url: 'https://www.csgb.gov.tr',
        newsUrl: 'https://www.csgb.gov.tr/haberler/',
        type: 'bakanlik',
        active: true,
        description: 'Çalışma ve Sosyal Güvenlik Bakanlığı Haberleri'
    },
    {
        id: 'hmb',
        name: 'Hazine Bakanlığı',
        url: 'https://www.hmb.gov.tr',
        newsUrl: 'https://www.hmb.gov.tr/haberler',
        type: 'bakanlik',
        active: true,
        description: 'Hazine ve Maliye Bakanlığı Duyuruları'
    },

    // === SENDİKALAR ===
    {
        id: 'turk-is',
        name: 'Türk-İş',
        url: 'https://www.turkis.org.tr',
        newsUrl: 'https://www.turkis.org.tr/kategori/haberler/',
        type: 'sendika',
        active: true,
        description: 'Türkiye İşçi Sendikaları Konfederasyonu'
    },
    {
        id: 'disk',
        name: 'DİSK',
        url: 'https://disk.org.tr',
        newsUrl: 'https://disk.org.tr/category/basin-aciklamalari/',
        type: 'sendika',
        active: true,
        description: 'Devrimci İşçi Sendikaları Konfederasyonu'
    },
    {
        id: 'hak-is',
        name: 'Hak-İş',
        url: 'https://www.hakis.org.tr',
        newsUrl: 'https://www.hakis.org.tr/haberler.html',
        type: 'sendika',
        active: true,
        description: 'Hak İşçi Sendikaları Konfederasyonu'
    },
    {
        id: 'memur-sen',
        name: 'Memur-Sen',
        url: 'https://www.memursen.org.tr',
        newsUrl: 'https://www.memursen.org.tr/haberler',
        type: 'sendika',
        active: true,
        description: 'Memur Sendikaları Konfederasyonu'
    },
    {
        id: 'kamu-sen',
        name: 'Kamu-Sen',
        url: 'https://www.kamusen.org.tr',
        newsUrl: 'https://www.kamusen.org.tr/genel-baskan-basin-aciklamalari',
        type: 'sendika',
        active: true,
        description: 'Türkiye Kamu-Sen Açıklamaları'
    },
    {
        id: 'kesk',
        name: 'KESK',
        url: 'https://www.kesk.org.tr',
        newsUrl: 'https://www.kesk.org.tr/2025/',
        type: 'sendika',
        active: true,
        description: 'Kamu Emekçileri Sendikaları Konfederasyonu'
    },

    // === HABER SİTELERİ ===
    {
        id: 'memurhaber',
        name: 'Memur Haber',
        url: 'https://www.memurhaber.com',
        newsUrl: 'https://www.memurhaber.com/guncel/',
        type: 'haber',
        active: true,
        description: 'Memur ve Kamu Personeli Güncel Haberleri'
    },
    {
        id: 'memurlar',
        name: 'Memurlar.net',
        url: 'https://www.memurlar.net',
        newsUrl: 'https://www.memurlar.net/haber/',
        type: 'haber',
        active: true,
        description: 'Memur Haberleri ve Mevzuat'
    },
    {
        id: 'kamuajans',
        name: 'Kamu Ajans',
        url: 'https://www.kamuajans.com',
        newsUrl: 'https://www.kamuajans.com/gundem/',
        type: 'haber',
        active: true,
        description: 'Kamu Personeli Haber Ajansı'
    },
    {
        id: 'kamupersoneli',
        name: 'Kamu Personeli',
        url: 'https://www.kamupersoneli.net',
        newsUrl: 'https://www.kamupersoneli.net/guncel/',
        type: 'haber',
        active: true,
        description: 'Kamu Personeli Güncel Haberler'
    },
]

// Kaynak tipine göre renk
export function getSourceColor(type: string): string {
    switch (type) {
        case 'resmi': return 'bg-red-900/30 text-red-400'
        case 'bakanlik': return 'bg-blue-900/30 text-blue-400'
        case 'sendika': return 'bg-green-900/30 text-green-400'
        case 'haber': return 'bg-purple-900/30 text-purple-400'
        default: return 'bg-zinc-800 text-zinc-400'
    }
}

// Kaynak tipine göre etiket
export function getSourceLabel(type: string): string {
    switch (type) {
        case 'resmi': return '🏛️ Resmî Kaynaklar'
        case 'bakanlik': return '🏢 Bakanlıklar'
        case 'sendika': return '✊ Sendikalar'
        case 'haber': return '📰 Haber Siteleri'
        default: return '🌐 Diğer'
    }
}

// Kaynak tipine göre ikon
export function getSourceIcon(type: string): string {
    switch (type) {
        case 'resmi': return '🏛️'
        case 'bakanlik': return '🏢'
        case 'sendika': return '✊'
        case 'haber': return '📰'
        default: return '🌐'
    }
}
