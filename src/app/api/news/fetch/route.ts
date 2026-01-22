import { NextResponse } from 'next/server'

/**
 * RSS Feed Parser - Gerçek haber çekimi
 */

interface FeedItem {
    title: string
    content: string
    link: string
    pubDate: string
    source: string
}

// Bilinen RSS Feed'leri
const RSS_FEEDS: Record<string, { name: string; url: string; type: string }> = {
    // === RESMİ KAYNAKLAR ===
    'resmigazete': {
        name: 'Resmî Gazete',
        url: 'https://www.resmigazete.gov.tr/rss/eskiler.xml',
        type: 'resmi'
    },

    // === KAMU HABER SİTELERİ ===
    'memurlar': {
        name: 'Memurlar.net',
        url: 'https://www.memurlar.net/rss/',
        type: 'haber'
    },
    'kamuajans': {
        name: 'Kamu Ajans',
        url: 'https://www.kamuajans.com/rss',
        type: 'haber'
    },
    'kamupersoneli': {
        name: 'Kamu Personeli',
        url: 'https://www.kamupersoneli.net/rss.xml',
        type: 'haber'
    },

    // === SENDİKA & EMEK HABERLERİ ===
    // TİS, KÇP, 696 KHK, işçi-memur mücadelesi
    'sendika': {
        name: 'Sendika.org',
        url: 'https://sendika.org/feed/',
        type: 'sendika'
    },
    'evrensel': {
        name: 'Evrensel İşçi',
        url: 'https://www.evrensel.net/rss/8.xml', // işçi haberleri
        type: 'sendika'
    },
    'birgun': {
        name: 'BirGün Emek',
        url: 'https://www.birgun.net/rss/emek.xml',
        type: 'sendika'
    },

    // === İŞ DÜNYASI & EKONOMİ ===
    'ekonomi': {
        name: 'Ekonomi Haberleri',
        url: 'https://www.bloomberght.com/rss',
        type: 'ekonomi'
    },
}

// Basit RSS parser
async function parseRSSFeed(feedUrl: string, sourceName: string): Promise<FeedItem[]> {
    try {
        const response = await fetch(feedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; EmekGundemiBot/1.0)'
            },
            next: { revalidate: 300 } // 5 dakika cache
        })

        if (!response.ok) {
            console.error(`RSS fetch failed for ${sourceName}: ${response.status}`)
            return []
        }

        const xml = await response.text()
        const items: FeedItem[] = []

        // Basit XML parsing (item veya entry tagları)
        const itemMatches = xml.match(/<item[^>]*>[\s\S]*?<\/item>/gi) ||
            xml.match(/<entry[^>]*>[\s\S]*?<\/entry>/gi) || []

        for (const itemXml of itemMatches.slice(0, 10)) { // Son 10 haber
            const title = extractTag(itemXml, 'title')
            const link = extractTag(itemXml, 'link') || extractAttr(itemXml, 'link', 'href')
            const description = extractTag(itemXml, 'description') || extractTag(itemXml, 'content') || extractTag(itemXml, 'summary')
            const pubDate = extractTag(itemXml, 'pubDate') || extractTag(itemXml, 'published') || extractTag(itemXml, 'updated')

            if (title && link) {
                items.push({
                    title: cleanHtml(title),
                    content: cleanHtml(description || ''),
                    link: link,
                    pubDate: pubDate || new Date().toISOString(),
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

// XML tag içeriğini çıkar
function extractTag(xml: string, tag: string): string {
    const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
    if (match) {
        // CDATA kontrolü
        const content = match[1]
        const cdataMatch = content.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)
        return cdataMatch ? cdataMatch[1] : content
    }
    return ''
}

// XML attribute değerini çıkar
function extractAttr(xml: string, tag: string, attr: string): string {
    const match = xml.match(new RegExp(`<${tag}[^>]*${attr}=["']([^"']+)["']`, 'i'))
    return match ? match[1] : ''
}

// HTML etiketlerini temizle
function cleanHtml(text: string): string {
    return text
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim()
}

/**
 * GET /api/news/fetch?source=memurlar
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const sourceId = searchParams.get('source')

    if (!sourceId) {
        // Tüm kaynaklardan çek
        const allItems: FeedItem[] = []

        for (const [id, feed] of Object.entries(RSS_FEEDS)) {
            const items = await parseRSSFeed(feed.url, feed.name)
            allItems.push(...items)
        }

        return NextResponse.json({
            success: true,
            count: allItems.length,
            items: allItems.sort((a, b) =>
                new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
            )
        })
    }

    const feed = RSS_FEEDS[sourceId]
    if (!feed) {
        return NextResponse.json({ error: 'Kaynak bulunamadı' }, { status: 404 })
    }

    const items = await parseRSSFeed(feed.url, feed.name)

    return NextResponse.json({
        success: true,
        source: feed.name,
        count: items.length,
        items
    })
}
