/**
 * Nitter Entegrasyonu - X/Twitter Verileri İçin
 * 
 * ÖNEMLI: Resmî X API kullanılmıyor. 
 * Sadece Nitter RSS feed'leri üzerinden veri çekiliyor.
 */

export interface NitterTweet {
    id: string
    text: string
    authorHandle: string
    authorName: string
    date: string
    link: string
    isRetweet: boolean
    isQuote: boolean
}

export interface NitterConfig {
    instances: string[]
    currentInstanceIndex: number
    lastRequestTime: Map<string, number>
    rateLimitMs: number // Dakikada 1 istek = 60000ms
}

// Varsayılan Nitter instance'ları (fallback için)
export const NITTER_INSTANCES = [
    'nitter.net',
    'nitter.poast.org',
    'nitter.privacydev.net',
    'nitter.hostux.net',
    'nitter.1d4.us',
]

// Global config
const config: NitterConfig = {
    instances: NITTER_INSTANCES,
    currentInstanceIndex: 0,
    lastRequestTime: new Map(),
    rateLimitMs: 60000, // 1 dakika
}

/**
 * Aktif Nitter instance'ını al
 */
function getCurrentInstance(): string {
    return config.instances[config.currentInstanceIndex]
}

/**
 * Sonraki instance'a geç (fallback)
 */
function switchToNextInstance(): string {
    config.currentInstanceIndex = (config.currentInstanceIndex + 1) % config.instances.length
    console.log(`Switching to Nitter instance: ${getCurrentInstance()}`)
    return getCurrentInstance()
}

/**
 * Rate limit kontrolü
 */
function canMakeRequest(handle: string): boolean {
    const lastTime = config.lastRequestTime.get(handle) || 0
    const now = Date.now()
    return (now - lastTime) >= config.rateLimitMs
}

/**
 * Rate limit güncelle
 */
function updateRateLimit(handle: string): void {
    config.lastRequestTime.set(handle, Date.now())
}

/**
 * Tweet'in retweet veya quote olup olmadığını kontrol et
 */
function isRetweetOrQuote(text: string): { isRetweet: boolean; isQuote: boolean } {
    const isRetweet = text.startsWith('RT @') || text.startsWith('R to @')
    const isQuote = text.includes('https://twitter.com/') || text.includes('https://x.com/')
    return { isRetweet, isQuote }
}

/**
 * Nitter RSS feed'inden tweet çek
 */
export async function fetchTweetsFromNitter(
    handle: string,
    maxTweets: number = 5
): Promise<NitterTweet[]> {
    // Rate limit kontrolü
    if (!canMakeRequest(handle)) {
        console.log(`Rate limit: ${handle} için bekleniyor`)
        return []
    }

    const tweets: NitterTweet[] = []
    let attempts = 0
    const maxAttempts = config.instances.length

    while (attempts < maxAttempts) {
        const instance = getCurrentInstance()
        const rssUrl = `https://${instance}/${handle}/rss`

        try {
            const response = await fetch(rssUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; EmekGundemiBot/1.0)',
                },
                signal: AbortSignal.timeout(10000), // 10 saniye timeout
            })

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`)
            }

            const xml = await response.text()

            // RSS item'larını parse et
            const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || []

            for (const itemXml of itemMatches.slice(0, maxTweets)) {
                const title = extractTag(itemXml, 'title')
                const link = extractTag(itemXml, 'link')
                const pubDate = extractTag(itemXml, 'pubDate')
                const description = extractTag(itemXml, 'description')

                // Tweet ID'sini link'ten çıkar
                const idMatch = link.match(/status\/(\d+)/)
                const id = idMatch ? idMatch[1] : Date.now().toString()

                // Retweet/Quote kontrolü
                const { isRetweet, isQuote } = isRetweetOrQuote(title)

                tweets.push({
                    id,
                    text: cleanHtml(description || title),
                    authorHandle: handle,
                    authorName: handle,
                    date: pubDate,
                    link: link.replace(`https://${instance}`, 'https://x.com'),
                    isRetweet,
                    isQuote,
                })
            }

            // Başarılı - rate limit güncelle
            updateRateLimit(handle)
            break

        } catch (error) {
            console.error(`Nitter error (${instance}):`, error)
            switchToNextInstance()
            attempts++
        }
    }

    return tweets
}

/**
 * Birden fazla hesaptan tweet çek
 */
export async function fetchTweetsFromMultipleAccounts(
    handles: string[],
    maxTweetsPerAccount: number = 5
): Promise<NitterTweet[]> {
    const allTweets: NitterTweet[] = []

    for (const handle of handles) {
        // Her hesap arasında 2 saniye bekle
        await new Promise(r => setTimeout(r, 2000))

        const tweets = await fetchTweetsFromNitter(handle, maxTweetsPerAccount)
        allTweets.push(...tweets)
    }

    // Tarihe göre sırala (en yeni önce)
    return allTweets.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    )
}

/**
 * Sadece haber değeri taşıyan orijinal tweetleri filtrele
 */
export function filterNewsworthyTweets(tweets: NitterTweet[]): NitterTweet[] {
    return tweets.filter(tweet => {
        // Retweet ve quote'ları çıkar
        if (tweet.isRetweet || tweet.isQuote) return false

        // Çok kısa tweetleri çıkar
        if (tweet.text.length < 50) return false

        // Sadece emoji/link olan tweetleri çıkar
        const textWithoutEmoji = tweet.text.replace(/[\u{1F600}-\u{1F6FF}]/gu, '').trim()
        if (textWithoutEmoji.length < 30) return false

        return true
    })
}

/**
 * Tweet'i haber formatına çevir
 */
export function tweetToNewsFormat(tweet: NitterTweet) {
    return {
        title: `${tweet.authorHandle}'ın X'teki Açıklaması`,
        content: tweet.text,
        source: `@${tweet.authorHandle}`,
        sourceUrl: tweet.link,
        sourceType: 'twitter' as const,
        tweetId: tweet.id,
        authorHandle: tweet.authorHandle,
        processed: false,
    }
}

// Yardımcı fonksiyonlar
function extractTag(xml: string, tag: string): string {
    const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
    if (match) {
        const content = match[1]
        const cdataMatch = content.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)
        return cdataMatch ? cdataMatch[1] : content
    }
    return ''
}

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
 * Özel Nitter instance ayarla (kullanıcının kendi sunucusu)
 */
export function setCustomNitterInstance(domain: string): void {
    // Kullanıcının instance'ını en başa ekle
    config.instances = [domain, ...NITTER_INSTANCES.filter(i => i !== domain)]
    config.currentInstanceIndex = 0
    console.log(`Custom Nitter instance set: ${domain}`)
}
