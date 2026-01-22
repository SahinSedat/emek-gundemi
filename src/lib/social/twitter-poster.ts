/**
 * Twitter/X Entegrasyonu
 * X platformuna otomatik haber paylaşımı
 */

interface TwitterPost {
    title: string
    summary: string[]
    link: string
}

/**
 * X'e tweet gönder (OAuth 1.0a)
 */
export async function postTweet(post: TwitterPost): Promise<{ success: boolean; tweetId?: string }> {
    const apiKey = process.env.TWITTER_API_KEY
    const apiSecret = process.env.TWITTER_API_SECRET
    const accessToken = process.env.TWITTER_ACCESS_TOKEN
    const accessSecret = process.env.TWITTER_ACCESS_SECRET

    if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
        console.error('Twitter API credentials not set')
        return { success: false }
    }

    const text = formatTweetContent(post)

    try {
        // Twitter API v2 endpoint
        const response = await fetch('https://api.twitter.com/2/tweets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // OAuth header oluşturulmalı - gerçek uygulamada oauth-1.0a kütüphanesi kullanılmalı
                'Authorization': `OAuth oauth_consumer_key="${apiKey}", oauth_token="${accessToken}"`,
            },
            body: JSON.stringify({ text }),
        })

        if (!response.ok) {
            const error = await response.json()
            console.error('Twitter API error:', error)
            return { success: false }
        }

        const data = await response.json()
        return { success: true, tweetId: data.data?.id }
    } catch (error) {
        console.error('Twitter post error:', error)
        return { success: false }
    }
}

/**
 * Tweet içeriği oluştur (280 karakter limiti)
 */
export function formatTweetContent(post: TwitterPost): string {
    const hashtags = '#KamuHaber #Emek #İşçi'
    const linkPlaceholder = 23 // t.co kısaltması

    // Başlık için maksimum uzunluk hesapla
    // 280 - 🔴 (2) - boşluklar (10) - link (23) - hashtags
    const maxTitleLength = 280 - 2 - 10 - linkPlaceholder - hashtags.length - 20

    let title = post.title
    if (title.length > maxTitleLength) {
        title = title.slice(0, maxTitleLength - 3) + '...'
    }

    // İlk iki maddeyi ekle (kısaltılmış)
    const bullets = post.summary
        .slice(0, 2)
        .map(item => {
            const short = item.length > 45 ? item.slice(0, 42) + '...' : item
            return `• ${short}`
        })
        .join('\n')

    const content = `🔴 ${title}

${bullets}

🔗 ${post.link}

${hashtags}`

    // 280 karakteri aşarsa kısalt
    if (content.length > 280) {
        return `🔴 ${title}

🔗 ${post.link}

${hashtags}`
    }

    return content
}

/**
 * Tweet uzunluğunu kontrol et
 */
export function validateTweetLength(content: string): { valid: boolean; length: number } {
    // URL'ler 23 karakter olarak sayılır
    const urlRegex = /https?:\/\/[^\s]+/g
    const urls = content.match(urlRegex) || []

    let adjustedLength = content.length
    for (const url of urls) {
        adjustedLength = adjustedLength - url.length + 23
    }

    return {
        valid: adjustedLength <= 280,
        length: adjustedLength,
    }
}

/**
 * Birden fazla tweet gönder (thread)
 */
export async function postThread(
    posts: TwitterPost[],
    delayMs: number = 5000
): Promise<{ sent: number; failed: number }> {
    let sent = 0
    let failed = 0

    for (const post of posts) {
        const result = await postTweet(post)
        if (result.success) {
            sent++
        } else {
            failed++
        }

        // Rate limit için bekle
        if (posts.indexOf(post) < posts.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delayMs))
        }
    }

    return { sent, failed }
}
