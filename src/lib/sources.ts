/**
 * Haber Kaynakları - Gerçek RSS ve Web Siteleri
 */

export interface NewsSource {
    id: string
    name: string
    url: string
    rssUrl?: string
    type: 'resmi' | 'sendika' | 'haber' | 'bakanlik'
    active: boolean
    description: string
}

// Varsayılan haber kaynakları
export const DEFAULT_SOURCES: NewsSource[] = [
    // Resmî Kaynaklar
    {
        id: 'resmi-gazete',
        name: 'Resmî Gazete',
        url: 'https://www.resmigazete.gov.tr',
        type: 'resmi',
        active: true,
        description: 'Kanun, KHK, Yönetmelik, Atama Kararları'
    },
    {
        id: 'tbmm',
        name: 'TBMM',
        url: 'https://www.tbmm.gov.tr',
        type: 'resmi',
        active: true,
        description: 'Meclis Gündem ve Kararları'
    },

    // Bakanlıklar
    {
        id: 'csgb',
        name: 'Çalışma ve Sosyal Güvenlik Bakanlığı',
        url: 'https://www.csgb.gov.tr',
        rssUrl: 'https://www.csgb.gov.tr/rss',
        type: 'bakanlik',
        active: true,
        description: 'İş ve Sosyal Güvenlik Haberleri'
    },
    {
        id: 'hmb',
        name: 'Hazine ve Maliye Bakanlığı',
        url: 'https://www.hmb.gov.tr',
        type: 'bakanlik',
        active: true,
        description: 'Ekonomi ve Maliye Haberleri'
    },

    // Sendikalar
    {
        id: 'turk-is',
        name: 'Türk-İş',
        url: 'https://www.turkis.org.tr',
        type: 'sendika',
        active: true,
        description: 'Türkiye İşçi Sendikaları Konfederasyonu'
    },
    {
        id: 'disk',
        name: 'DİSK',
        url: 'https://disk.org.tr',
        type: 'sendika',
        active: true,
        description: 'Devrimci İşçi Sendikaları Konfederasyonu'
    },
    {
        id: 'hak-is',
        name: 'Hak-İş',
        url: 'https://www.hakis.org.tr',
        type: 'sendika',
        active: true,
        description: 'Hak İşçi Sendikaları Konfederasyonu'
    },
    {
        id: 'memur-sen',
        name: 'Memur-Sen',
        url: 'https://www.memursen.org.tr',
        type: 'sendika',
        active: true,
        description: 'Memur Sendikaları Konfederasyonu'
    },
    {
        id: 'kamu-sen',
        name: 'Kamu-Sen',
        url: 'https://www.kamusen.org.tr',
        type: 'sendika',
        active: true,
        description: 'Türkiye Kamu-Sen'
    },
    {
        id: 'kesk',
        name: 'KESK',
        url: 'https://www.kesk.org.tr',
        type: 'sendika',
        active: true,
        description: 'Kamu Emekçileri Sendikaları Konfederasyonu'
    },

    // Haber Siteleri
    {
        id: 'memurhaber',
        name: 'Memur Haber',
        url: 'https://www.memurhaber.com',
        type: 'haber',
        active: true,
        description: 'Memur ve Kamu Personeli Haberleri'
    },
    {
        id: 'kamudanhaber',
        name: 'Kamudan Haber',
        url: 'https://www.kamudanhaber.com',
        type: 'haber',
        active: true,
        description: 'Kamu Haberleri'
    },
    {
        id: 'memurlar',
        name: 'Memurlar.net',
        url: 'https://www.memurlar.net',
        type: 'haber',
        active: true,
        description: 'Memur Haberleri ve Mevzuat'
    },
    {
        id: 'kamuajans',
        name: 'Kamu Ajans',
        url: 'https://www.kamuajans.com',
        type: 'haber',
        active: true,
        description: 'Kamu Personeli Haber Ajansı'
    },
    {
        id: 'iscihaber',
        name: 'İşçi Haber',
        url: 'https://www.iscihaber.com.tr',
        type: 'haber',
        active: true,
        description: 'İşçi ve Sendika Haberleri'
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

// Kaynak tipine göre ikon
export function getSourceLabel(type: string): string {
    switch (type) {
        case 'resmi': return '🏛️ Resmî'
        case 'bakanlik': return '🏢 Bakanlık'
        case 'sendika': return '✊ Sendika'
        case 'haber': return '📰 Haber'
        default: return '🌐 Diğer'
    }
}
