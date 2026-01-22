import { NextResponse } from 'next/server'

/**
 * Nitter üzerinden X/Twitter verileri çek
 * Scraping/RSS tabanlı - API yok
 */

// Çalışan Nitter instance'ları
const NITTER_INSTANCES = [
    'nitter.privacydev.net',
    'nitter.poast.org',
    'nitter.net',
]

interface ParsedTweet {
    id: string
    text: string
    author: string
    date: string
    link: string
}

// RSS XML'den tweet çıkar
function parseTweetsFromRSS(xml: string, handle: string): ParsedTweet[] {
    const tweets: ParsedTweet[] = []

    // <item> taglarını bul
    const items = xml.match(/<item>[\s\S]*?<\/item>/gi) || []

    for (const item of items.slice(0, 5)) { // Son 5 tweet
        const title = extractValue(item, 'title')
        const link = extractValue(item, 'link')
        const pubDate = extractValue(item, 'pubDate')
        const description = extractValue(item, 'description')

        // Tweet ID çıkar
        const idMatch = link.match(/status\/(\d+)/)
        const id = idMatch ? idMatch[1] : Date.now().toString()

        // Retweet kontrolü - RT ile başlayanları atla
        if (title.startsWith('RT ') || title.startsWith('R to @')) {
            continue
        }

        tweets.push({
            id,
            text: cleanHtml(description || title),
            author: handle,
            date: pubDate,
            link: link.replace(/nitter\.[^/]+/, 'x.com'), // x.com linkine çevir
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
        // CDATA kontrolü
        const cdataMatch = content.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)
        if (cdataMatch) content = cdataMatch[1]
        return content.trim()
    }
    return ''
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

// Nitter'dan tweet çek
async function fetchFromNitter(handle: string): Promise<ParsedTweet[]> {
    for (const instance of NITTER_INSTANCES) {
        const url = `https://${instance}/${handle}/rss`

        try {
            console.log(`Trying Nitter: ${url}`)

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/rss+xml, application/xml, text/xml',
                },
                cache: 'no-store',
            })

            if (!response.ok) {
                console.log(`${instance} failed: ${response.status}`)
                continue
            }

            const xml = await response.text()

            // RSS kontrolü
            if (!xml.includes('<rss') && !xml.includes('<channel')) {
                console.log(`${instance} returned non-RSS content`)
                continue
            }

            const tweets = parseTweetsFromRSS(xml, handle)

            if (tweets.length > 0) {
                console.log(`Got ${tweets.length} tweets from ${instance}`)
                return tweets
            }

        } catch (error) {
            console.error(`${instance} error:`, error)
        }
    }

    return []
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
            // Her hesap arasında 1 saniye bekle (rate limit)
            await new Promise(r => setTimeout(r, 1000))

            const tweets = await fetchFromNitter(handle.replace('@', ''))
            allTweets.push(...tweets)
        }

        // Haber formatına çevir
        const newsItems = allTweets.map(tweet => ({
            title: `@${tweet.author}: ${tweet.text.slice(0, 80)}...`,
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

    // POST'a yönlendir
    const fakeRequest = {
        json: async () => ({ handles })
    } as Request

    return POST(fakeRequest)
}
