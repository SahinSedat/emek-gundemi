/**
 * RSS Haber Çekici
 * Çeşitli kaynaklardan RSS beslemesi ile haber çeker
 */

import Parser from 'rss-parser'

const parser = new Parser({
    customFields: {
        item: [
            ['content:encoded', 'contentEncoded'],
            ['dc:creator', 'creator'],
        ],
    },
})

export interface RSSNewsItem {
    title: string
    link: string
    content: string
    pubDate: Date
    source: string
    creator?: string
}

// Kaynak listesi
export const RSS_SOURCES = [
    {
        name: 'Resmî Gazete',
        url: 'https://www.resmigazete.gov.tr/rss/eskiler.xml',
        category: 'resmi-gazete',
    },
    // Diğer kaynaklar (gerçek URL'ler eklenecek)
    // {
    //   name: 'Anadolu Ajansı - Ekonomi',
    //   url: 'https://www.aa.com.tr/tr/rss/default.aspx?cat=ekonomi',
    //   category: 'ekonomi',
    // },
]

/**
 * Tek bir RSS kaynağından haber çek
 */
export async function fetchRSSFeed(sourceUrl: string, sourceName: string): Promise<RSSNewsItem[]> {
    try {
        const feed = await parser.parseURL(sourceUrl)

        return feed.items.map(item => ({
            title: item.title || 'Başlıksız',
            link: item.link || '',
            content: item.contentEncoded || item.content || item.contentSnippet || '',
            pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
            source: sourceName,
            creator: item.creator,
        }))
    } catch (error) {
        console.error(`RSS fetch error for ${sourceName}:`, error)
        return []
    }
}

/**
 * Tüm kaynaklardan haber çek
 */
export async function fetchAllRSSFeeds(): Promise<RSSNewsItem[]> {
    const allNews: RSSNewsItem[] = []

    for (const source of RSS_SOURCES) {
        const news = await fetchRSSFeed(source.url, source.name)
        allNews.push(...news)
    }

    // Tarihe göre sırala (en yeni önce)
    return allNews.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())
}

/**
 * Belirli bir kategorinin RSS'ini çek
 */
export async function fetchCategoryRSS(categorySlug: string): Promise<RSSNewsItem[]> {
    const source = RSS_SOURCES.find(s => s.category === categorySlug)

    if (!source) {
        console.warn(`No RSS source found for category: ${categorySlug}`)
        return []
    }

    return fetchRSSFeed(source.url, source.name)
}

/**
 * HTML içeriği temizle
 */
export function cleanHTMLContent(html: string): string {
    return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim()
}
