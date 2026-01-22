import { NextResponse } from 'next/server'
import https from 'https'

/**
 * Nitter üzerinden X/Twitter verileri çek
 * Scraping/RSS tabanlı - API yok
 * 
 * NOT: SSL sorunları için Node.js https kullanılıyor
 */

// Aktif Nitter instance'ları (2025 güncel)
const NITTER_INSTANCES = [
    'xcancel.com',           // En güvenilir
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

// Basit HTTP request (SSL sorunlarını bypass)
async function fetchWithBypass(url: string): Promise<string | null> {
    return new Promise((resolve) => {
        const urlObj = new URL(url)

        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/rss+xml, application/xml, text/xml, */*',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
            },
            timeout: 10000,
            rejectUnauthorized: false, // SSL doğrulamasını atla
        }

        const req = https.request(options, (res) => {
            let data = ''
            res.on('data', chunk => data += chunk)
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(data)
                } else {
                    console.log(`${urlObj.hostname} returned ${res.statusCode}`)
                    resolve(null)
                }
            })
        })

        req.on('error', (err) => {
            console.log(`${urlObj.hostname} error:`, err.message)
            resolve(null)
        })

        req.on('timeout', () => {
            console.log(`${urlObj.hostname} timeout`)
            req.destroy()
            resolve(null)
        })

        req.end()
    })
}

// RSS XML'den tweet çıkar
function parseTweetsFromRSS(xml: string, handle: string): ParsedTweet[] {
    const tweets: ParsedTweet[] = []

    // <item> taglarını bul
    const items = xml.match(/<item>[\s\S]*?<\/item>/gi) || []

    for (const item of items.slice(0, 5)) { // Son 5 tweet
        const title = extractValue(item, 'title')
        const link = extractValue(item, 'link') || extractValue(item, 'guid')
        const pubDate = extractValue(item, 'pubDate')
        const description = extractValue(item, 'description')

        // Tweet ID çıkar
        const idMatch = link.match(/status\/(\d+)/)
        const id = idMatch ? idMatch[1] : Date.now().toString()

        // Retweet kontrolü
        if (title.startsWith('RT ') || title.startsWith('R to @')) {
            continue
        }

        // Link'i x.com'a çevir
        const cleanLink = link.replace(/https?:\/\/[^/]+/, 'https://x.com')

        tweets.push({
            id,
            text: cleanHtml(description || title),
            author: handle,
            date: pubDate,
            link: cleanLink,
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
    const cleanHandle = handle.replace('@', '').trim()

    for (const instance of NITTER_INSTANCES) {
        const url = `https://${instance}/${cleanHandle}/rss`

        console.log(`Trying: ${url}`)

        const xml = await fetchWithBypass(url)

        if (!xml) continue

        // RSS kontrolü
        if (!xml.includes('<item>') && !xml.includes('<entry>')) {
            console.log(`${instance} no items found`)
            continue
        }

        const tweets = parseTweetsFromRSS(xml, cleanHandle)

        if (tweets.length > 0) {
            console.log(`✓ Got ${tweets.length} tweets from ${instance} for @${cleanHandle}`)
            return tweets
        }
    }

    console.log(`✗ No tweets found for @${cleanHandle}`)
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
            // Rate limit - her hesap arasında 2 saniye
            await new Promise(r => setTimeout(r, 2000))

            const tweets = await fetchFromNitter(handle)
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
