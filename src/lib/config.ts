// Site Ayarları
export const SITE_CONFIG = {
    name: 'Emek Gündemi',
    slogan: 'İşçinin, Memurun, Emeğin Gündemi',
    description: 'Türkiye\'de emek ve kamu dünyasını ilgilendiren tüm gelişmeleri anlık, özetli ve yorumlu sunan dijital haber merkezi.',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    locale: 'tr_TR',
    themeColor: '#dc2626', // Kırmızı
}

// Kategori Listesi (Seed için)
export const DEFAULT_CATEGORIES = [
    { name: 'Resmî Gazete', slug: 'resmi-gazete', icon: 'FileText', color: '#1d4ed8', description: 'Kanunlar, CB Kararları, Yönetmelikler' },
    { name: 'Kamu İşçisi', slug: 'kamu-iscisi', icon: 'HardHat', color: '#dc2626', description: '4/D, 696 KHK, Ücret, İkramiye' },
    { name: 'Memur', slug: 'memur', icon: 'Briefcase', color: '#059669', description: 'Maaş, Ek Ödeme, Atama, Disiplin' },
    { name: 'Özel Sektör', slug: 'ozel-sektor', icon: 'Building2', color: '#7c3aed', description: 'Asgari Ücret, Kıdem, İş Güvencesi' },
    { name: 'Sendika', slug: 'sendika', icon: 'Users', color: '#ea580c', description: 'Açıklamalar, Yetki, Eylemler' },
    { name: 'TİS & KÇP', slug: 'tis-kcp', icon: 'FileSignature', color: '#0284c7', description: 'Toplu İş Sözleşmeleri, Kamu Çerçeve Protokolü' },
    { name: 'Ekonomi', slug: 'ekonomi', icon: 'TrendingUp', color: '#16a34a', description: 'Enflasyon, Vergi, Refah Payı' },
    { name: 'Yargı Kararları', slug: 'yargi-kararlari', icon: 'Scale', color: '#4f46e5', description: 'Emsal Kararlar, Danıştay, Yargıtay' },
    { name: 'Bakan Açıklamaları', slug: 'bakan-aciklamalari', icon: 'Mic', color: '#be185d', description: 'Resmî Beyanlar, Basın Açıklamaları' },
    { name: 'TBMM', slug: 'tbmm', icon: 'Landmark', color: '#b45309', description: 'Komisyon Kararları, Kanun Teklifleri' },
]

// Haftalık Yayın Takvimi
export const WEEKLY_SCHEDULE = {
    1: { theme: 'Resmî Gazete + Haftalık Gündem', categories: ['resmi-gazete'] },
    2: { theme: 'Sendika / TİS / KÇP', categories: ['sendika', 'tis-kcp'] },
    3: { theme: 'Ekonomi & Maaş Etkileri', categories: ['ekonomi'] },
    4: { theme: 'Yargı Kararları', categories: ['yargi-kararlari'] },
    5: { theme: 'Haftalık Özet + Genel Analiz', categories: [] }, // Tüm kategoriler
}

// Sosyal Medya Formatları
export const SOCIAL_TEMPLATES = {
    twitter: {
        maxLength: 280,
        template: `🔴 {title}

{bullets}

🔗 {link}

#KamuHaber #Emek #İşçi #Memur`,
    },
    telegram: {
        template: `🔴 <b>{title}</b>

{bullets}

🔗 <a href="{link}">Devamını Oku</a>`,
    },
    whatsapp: {
        template: `*{title}*

{bullets}

🔗 {link}`,
    },
}

// Kaynak Tipleri
export const SOURCE_TYPES = {
    OFFICIAL: 'Resmî Kaynak',
    AGENCY: 'Haber Ajansı',
    UNION: 'Sendika',
    MINISTRY: 'Bakanlık',
    OTHER: 'Diğer',
}
