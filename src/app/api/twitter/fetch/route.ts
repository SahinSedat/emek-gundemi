import { NextResponse } from 'next/server'

/**
 * X/Twitter verileri - RSS-Bridge kullanarak
 * Kendi sunucumuzda çalışan RSS-Bridge instance'ı
 */

// RSS-Bridge local instance
const RSS_BRIDGE_URL = 'http://localhost:8081'

interface ParsedTweet {
    id: string
    text: string
    author: string
    date: string
    link: string
}

// Atom feed'den tweet çıkar
function parseTweetsFromAtom(xml: string, handle: string): ParsedTweet[] {
    const tweets: ParsedTweet[] = []

    // <entry> taglarını bul (Atom format)
    const entries = xml.match(/<entry>[\s\S]*?<\/entry>/gi) || []

    for (const entry of entries.slice(0, 5)) { // Son 5 tweet
        const title = extractValue(entry, 'title')
        const link = extractAttr(entry, 'link', 'href') || extractValue(entry, 'link')
        const updated = extractValue(entry, 'updated') || extractValue(entry, 'published')
        const content = extractValue(entry, 'content') || extractValue(entry, 'summary')
        const id = extractValue(entry, 'id')

        // Retweet kontrolü
        if (title.startsWith('RT ') || content.startsWith('RT @')) {
            continue
        }

        tweets.push({
            id: id || Date.now().toString(),
            text: cleanHtml(content || title),
            author: handle,
            date: updated,
            link: link || `https://x.com/${handle}`,
        })
    }

    return tweets
}

// XML tag değerini çıkar
function extractValue(xml: string, tag: string): string {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
    const match = xml.match(regex)
    if (match) {
        let content = match[1]
        const cdataMatch = content.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)
        if (cdataMatch) content = cdataMatch[1]
        return content.trim()
    }
    return ''
}

// XML attribute değerini çıkar
function extractAttr(xml: string, tag: string, attr: string): string {
    const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i')
    const match = xml.match(regex)
    return match ? match[1] : ''
}

// HTML temizle
function cleanHtml(text: string): string {
    return text
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

// RSS-Bridge'den tweet çek
async function fetchFromRSSBridge(handle: string): Promise<ParsedTweet[]> {
    const cleanHandle = handle.replace('@', '').trim()
    const url = `${RSS_BRIDGE_URL}/?action=display&bridge=TwitterBridge&context=By+username&u=${cleanHandle}&format=Atom`

    console.log(`Fetching: ${url}`)

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'EmekGundemi/1.0',
            },
            cache: 'no-store',
        })

        if (!response.ok) {
            console.log(`RSS-Bridge returned ${response.status}`)
            return []
        }

        const xml = await response.text()

        // Atom feed kontrolü
        if (!xml.includes('<entry>') && !xml.includes('<item>')) {
            console.log('No entries found in response')
            return []
        }

        const tweets = parseTweetsFromAtom(xml, cleanHandle)
        console.log(`Got ${tweets.length} tweets for @${cleanHandle}`)

        return tweets

    } catch (error) {
        console.error(`RSS-Bridge error:`, error)
        return []
    }
}

/**
 * POST /api/twitter/fetch
 */
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { handles } = body

        if (!handles || !Array.isArray(handles) || handles.length === 0) {
            return NextResponse.json({ error: 'Hesap listesi gerekli' }, { status: 400 })
        }

        const allTweets: ParsedTweet[] = []

        for (const handle of handles) {
            // Rate limit - her hesap arasında 1 saniye
            await new Promise(r => setTimeout(r, 1000))

            const tweets = await fetchFromRSSBridge(handle)
            allTweets.push(...tweets)
        }

        // Haber formatına çevir
        const newsItems = allTweets.map(tweet => ({
            title: `@${tweet.author}'ın açıklaması`,
            content: tweet.text,
            source: `@${tweet.author}`,
            sourceUrl: tweet.link,
            tweetId: tweet.id,
            authorHandle: tweet.author,
        }))

        return NextResponse.json({
            success: true,
            count: newsItems.length,
            items: newsItems
        })

    } catch (error) {
        console.error('Twitter fetch error:', error)
        return NextResponse.json({ error: 'Tweet çekme hatası' }, { status: 500 })
    }
}

/**
 * GET /api/twitter/fetch?handles=user1,user2
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const handlesParam = searchParams.get('handles')

    if (!handlesParam) {
        return NextResponse.json({ error: 'handles gerekli' }, { status: 400 })
    }

    const handles = handlesParam.split(',').map(h => h.trim()).filter(Boolean)

    const fakeRequest = { json: async () => ({ handles }) } as Request
    return POST(fakeRequest)
}
