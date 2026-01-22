import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const categories = [
    { name: 'Resmî Gazete', slug: 'resmi-gazete', icon: 'FileText', color: '#1d4ed8', description: 'Kanunlar, CB Kararları, Yönetmelikler', sortOrder: 1 },
    { name: 'Kamu İşçisi', slug: 'kamu-iscisi', icon: 'HardHat', color: '#dc2626', description: '4/D, 696 KHK, Ücret, İkramiye', sortOrder: 2 },
    { name: 'Memur', slug: 'memur', icon: 'Briefcase', color: '#059669', description: 'Maaş, Ek Ödeme, Atama, Disiplin', sortOrder: 3 },
    { name: 'Özel Sektör', slug: 'ozel-sektor', icon: 'Building2', color: '#7c3aed', description: 'Asgari Ücret, Kıdem, İş Güvencesi', sortOrder: 4 },
    { name: 'Sendika', slug: 'sendika', icon: 'Users', color: '#ea580c', description: 'Açıklamalar, Yetki, Eylemler', sortOrder: 5 },
    { name: 'TİS & KÇP', slug: 'tis-kcp', icon: 'FileSignature', color: '#0284c7', description: 'Toplu İş Sözleşmeleri, Kamu Çerçeve Protokolü', sortOrder: 6 },
    { name: 'Ekonomi', slug: 'ekonomi', icon: 'TrendingUp', color: '#16a34a', description: 'Enflasyon, Vergi, Refah Payı', sortOrder: 7 },
    { name: 'Yargı Kararları', slug: 'yargi-kararlari', icon: 'Scale', color: '#4f46e5', description: 'Emsal Kararlar, Danıştay, Yargıtay', sortOrder: 8 },
    { name: 'Bakan Açıklamaları', slug: 'bakan-aciklamalari', icon: 'Mic', color: '#be185d', description: 'Resmî Beyanlar, Basın Açıklamaları', sortOrder: 9 },
    { name: 'TBMM', slug: 'tbmm', icon: 'Landmark', color: '#b45309', description: 'Komisyon Kararları, Kanun Teklifleri', sortOrder: 10 },
]

const sampleNews = [
    {
        title: '2025 Yılı Kamu İşçisi Zam Oranları Açıklandı',
        slug: '2025-kamu-iscisi-zam-oranlari',
        summary: [
            'Kamu işçilerine yüzde 25+25 zam kararı alındı',
            'İkramiye tutarları da güncellendi',
            'Yeni ücretler Ocak ayından itibaren geçerli olacak',
            'TİS görüşmeleri başarıyla tamamlandı',
            'Refah payı da eklendi',
        ],
        content: `Kamu işçilerini ilgilendiren önemli bir gelişme yaşandı. Çalışma ve Sosyal Güvenlik Bakanlığı'nın koordinasyonunda yürütülen toplu iş sözleşmesi görüşmeleri sonuçlandı.

Yapılan açıklamaya göre, kamu işçilerine 2025 yılının ilk yarısı için yüzde 25, ikinci yarısı için ise yüzde 25 oranında zam yapılacak.`,
        aiAnalysis: `**Kimin Lehine?**
Bu düzenleme, yaklaşık 500.000 kamu işçisinin lehine sonuçlar doğuracak.

**Uygulamada Riskler**
Enflasyonun beklenenin üzerinde seyretmesi durumunda reel kayıp yaşanabilir.

**Sahaya Yansıması**
İşçi ailelerinin günlük harcamalarında kısa vadede pozitif etki bekleniyor.`,
        source: 'Resmî Gazete',
        sourceUrl: 'https://www.resmigazete.gov.tr',
        categorySlug: 'kamu-iscisi',
        tags: ['kamu işçisi', 'zam', 'tis', 'maaş', '2025'],
        relatedEntity: 'Çalışma ve Sosyal Güvenlik Bakanlığı',
        isPublished: true,
        isFeatured: true,
    },
    {
        title: 'Memur Maaş Zammı İçin Kritik Toplantı Başladı',
        slug: 'memur-maas-zammi-toplanti',
        summary: [
            'Hazine ve Maliye Bakanlığı yetkilileri görüşmelere başladı',
            'Sendikalar talep listesini iletti',
            'Refah payı gündemde',
        ],
        content: `Memur maaş zamları için kritik görüşmeler bugün başladı. Hazine ve Maliye Bakanlığı yetkilileri ile sendika temsilcileri masaya oturdu.`,
        source: 'Çalışma Bakanlığı',
        sourceUrl: 'https://www.csgb.gov.tr',
        categorySlug: 'memur',
        tags: ['memur', 'maaş', 'zam'],
        isPublished: true,
    },
    {
        title: 'Asgari Ücret Komisyonu İkinci Tur Görüşmeleri Tamamlandı',
        slug: 'asgari-ucret-komisyonu-ikinci-tur',
        summary: [
            'İşçi ve işveren kesimi tekliflerini sundu',
            'Enflasyon verileri masada',
            'Son karar yarın açıklanacak',
        ],
        content: `Asgari ücret görüşmelerinin ikinci turu tamamlandı. Taraflar tekliflerini masaya koydu.`,
        source: 'Anadolu Ajansı',
        sourceUrl: 'https://www.aa.com.tr',
        categorySlug: 'ozel-sektor',
        tags: ['asgari ücret', 'özel sektör'],
        isPublished: true,
    },
]

async function main() {
    console.log('🌱 Veritabanı seed işlemi başlıyor...')

    // Kategorileri ekle
    console.log('📁 Kategoriler ekleniyor...')
    for (const category of categories) {
        await prisma.category.upsert({
            where: { slug: category.slug },
            update: category,
            create: category,
        })
    }
    console.log(`✅ ${categories.length} kategori eklendi`)

    // Site ayarlarını oluştur
    console.log('⚙️ Site ayarları oluşturuluyor...')
    await prisma.siteSettings.upsert({
        where: { id: 'main' },
        update: {},
        create: {
            id: 'main',
            siteName: 'Emek Gündemi',
            siteSlogan: 'İşçinin, Memurun, Emeğin Gündemi',
            siteDescription: 'Türkiye\'de emek ve kamu dünyasını ilgilendiren tüm gelişmeleri anlık, özetli ve yorumlu sunan dijital haber merkezi.',
        },
    })
    console.log('✅ Site ayarları oluşturuldu')

    // Örnek haberleri ekle
    console.log('📰 Örnek haberler ekleniyor...')
    for (const newsItem of sampleNews) {
        const category = await prisma.category.findUnique({
            where: { slug: newsItem.categorySlug },
        })

        if (!category) continue

        const { categorySlug, ...newsData } = newsItem

        await prisma.news.upsert({
            where: { slug: newsData.slug },
            update: newsData,
            create: {
                ...newsData,
                categoryId: category.id,
                publishedAt: new Date(),
            },
        })
    }
    console.log(`✅ ${sampleNews.length} örnek haber eklendi`)

    // RSS kaynaklarını ekle
    console.log('🌐 RSS kaynakları ekleniyor...')
    const rssSources = [
        { name: 'Resmî Gazete', url: 'https://www.resmigazete.gov.tr/rss/eskiler.xml', type: 'RSS' as const },
    ]

    for (const source of rssSources) {
        await prisma.scrapingSource.upsert({
            where: { url: source.url },
            update: source,
            create: source,
        })
    }
    console.log(`✅ ${rssSources.length} RSS kaynağı eklendi`)

    console.log('🎉 Seed işlemi tamamlandı!')
}

main()
    .catch((e) => {
        console.error('❌ Seed hatası:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
