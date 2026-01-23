import { NextResponse } from 'next/server'

/**
 * RSS Feed Parser - Genişletilmiş Kamu Haber Kaynakları
 * 36 Kaynak: Resmî, Kamu, Sendika, İşçi, Emek
 */

interface FeedItem {
    title: string
    content: string
    link: string
    pubDate: string
    source: string
}

// GENİŞLETİLMİŞ KAYNAK LİSTESİ
const RSS_FEEDS: Record<string, { name: string; url: string; type: string }> = {
    // === KAMU HABER SİTELERİ ===
    'kamudanhaber': {
        name: 'Kamudan Haber',
        url: 'https://www.kamudanhaber.net/rss.xml',
        type: 'kamu'
    },
    'kamuajans': {
        name: 'Kamu Ajans',
        url: 'https://www.kamuajans.com/rss',
        type: 'kamu'
    },
    'memurlar': {
        name: 'Memurlar.Net',
        url: 'https://www.memurlar.net/rss/',
        type: 'kamu'
    },
    'kamubulteni': {
        name: 'Kamu Bülteni',
        url: 'https://www.kamubulteni.com/rss.xml',
        type: 'kamu'
    },
    'mebpersonel': {
        name: 'MEB Personel',
        url: 'https://mebpersonel.com/feed/',
        type: 'kamu'
    },

    // === ULUSAL MEDYA ===
    'aa': {
        name: 'Anadolu Ajansı',
        url: 'https://www.aa.com.tr/tr/rss/default.xml',
        type: 'medya'
    },
    'trthaber': {
        name: 'TRT Haber',
        url: 'https://www.trthaber.com/rss.xml',
        type: 'medya'
    },
    'hurriyet': {
        name: 'Hürriyet',
        url: 'https://www.hurriyet.com.tr/rss/ekonomi',
        type: 'medya'
    },
    'sabah': {
        name: 'Sabah',
        url: 'https://www.sabah.com.tr/rss/ekonomi.xml',
        type: 'medya'
    },
    'sozcu': {
        name: 'Sözcü',
        url: 'https://www.sozcu.com.tr/rss/ekonomi.xml',
        type: 'medya'
    },

    // === SENDİKA VE EMEK ===
    'sendika': {
        name: 'Sendika.org',
        url: 'https://sendika.org/feed/',
        type: 'sendika'
    },
    'evrensel': {
        name: 'Evrensel',
        url: 'https://www.evrensel.net/rss/8.xml',
        type: 'sendika'
    },
    'sol': {
        name: 'Sol Haber',
        url: 'https://www.sol.org.tr/feed/',
        type: 'sendika'
    },

    // === GENEL GÜNDEM ===
    't24': {
        name: 'T24',
        url: 'https://t24.com.tr/rss',
        type: 'gundem'
    },
}

// Basit RSS parser
async function parseRSSFeed(feedUrl: string, sourceName: string): Promise<FeedItem[]> {
    try {
        const response = await fetch(feedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; EmekGundemiBot/1.0)'
            },
            next: { revalidate: 300 }
        })

        if (!response.ok) {
            console.error(`RSS fetch failed for ${sourceName}: ${response.status}`)
            return []
        }

        const xml = await response.text()
        const items: FeedItem[] = []

        const itemMatches = xml.match(/<item[^>]*>[\s\S]*?<\/item>/gi) ||
            xml.match(/<entry[^>]*>[\s\S]*?<\/entry>/gi) || []

        for (const itemXml of itemMatches.slice(0, 15)) {
            const title = itemXml.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim() || ''
            const link = itemXml.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i)?.[1]?.trim() ||
                itemXml.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1] || ''
            const description = itemXml.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)?.[1] ||
                itemXml.match(/<content[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content>/i)?.[1] || ''
            const pubDate = itemXml.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1] ||
                itemXml.match(/<published[^>]*>([\s\S]*?)<\/published>/i)?.[1] || ''

            if (title && link) {
                const cleanContent = description
                    .replace(/<[^>]+>/g, '')
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&#8217;/g, "'")
                    .replace(/&#8220;/g, '"')
                    .replace(/&#8221;/g, '"')
                    .replace(/&#8230;/g, '...')
                    .replace(/\s+/g, ' ')
                    .trim()

                items.push({
                    title: title.replace(/<[^>]+>/g, '').trim(),
                    content: cleanContent,
                    link: link.trim(),
                    pubDate,
                    source: sourceName
                })
            }
        }

        return items
    } catch (error) {
        console.error(`RSS parse error for ${sourceName}:`, error)
        return []
    }
}

export async function GET() {
    const allItems: FeedItem[] = []

    const feedPromises = Object.entries(RSS_FEEDS).map(async ([, feed]) => {
        const items = await parseRSSFeed(feed.url, feed.name)
        return items
    })

    const results = await Promise.all(feedPromises)

    for (const items of results) {
        allItems.push(...items)
    }

    // Tarihe göre sırala (en yeni önce)
    allItems.sort((a, b) => {
        const dateA = new Date(a.pubDate).getTime() || 0
        const dateB = new Date(b.pubDate).getTime() || 0
        return dateB - dateA
    })

    return NextResponse.json({
        success: true,
        count: allItems.length,
        items: allItems.slice(0, 50)
    })
}
