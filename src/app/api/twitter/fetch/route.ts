import { NextResponse } from 'next/server'

/**
 * X/Twitter API v2 entegrasyonu
 * Gerçek tweet çekimi
 */

const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN || 'AAAAAAAAAAAAAAAAAAAAAGW67AEAAAAAtBdmrCjCostdrlHcY8mwV9BNCj4%3DhqEDRGBdBSxN4r1FF8gBYOGEkQFYHZpacwWF5FxjyIatTvY9OF'

interface Tweet {
    id: string
    text: string
    author_id: string
    created_at: string
}

interface TwitterUser {
    id: string
    username: string
    name: string
}

interface TwitterResponse {
    data?: Tweet[]
    includes?: {
        users?: TwitterUser[]
    }
    errors?: Array<{ message: string }>
}

// Kullanıcı ID'si al
async function getUserId(username: string): Promise<string | null> {
    const cleanUsername = username.replace('@', '').trim()

    try {
        const response = await fetch(
            `https://api.twitter.com/2/users/by/username/${cleanUsername}`,
            {
                headers: {
                    'Authorization': `Bearer ${decodeURIComponent(TWITTER_BEARER_TOKEN)}`,
                },
            }
        )

        if (!response.ok) {
            console.log(`User lookup failed for ${cleanUsername}: ${response.status}`)
            return null
        }

        const data = await response.json()
        return data.data?.id || null

    } catch (error) {
        console.error(`Error getting user ID for ${cleanUsername}:`, error)
        return null
    }
}

// Kullanıcının son tweet'lerini çek
async function getUserTweets(userId: string, username: string, count: number = 5): Promise<any[]> {
    try {
        const params = new URLSearchParams({
            'max_results': count.toString(),
            'tweet.fields': 'created_at,text',
            'exclude': 'retweets,replies'
        })

        const response = await fetch(
            `https://api.twitter.com/2/users/${userId}/tweets?${params}`,
            {
                headers: {
                    'Authorization': `Bearer ${decodeURIComponent(TWITTER_BEARER_TOKEN)}`,
                },
            }
        )

        if (!response.ok) {
            console.log(`Tweets fetch failed for user ${userId}: ${response.status}`)
            const errorText = await response.text()
            console.log('Error:', errorText)
            return []
        }

        const data: TwitterResponse = await response.json()

        if (data.errors) {
            console.log('Twitter API errors:', data.errors)
            return []
        }

        return (data.data || []).map(tweet => ({
            id: tweet.id,
            text: tweet.text,
            author: username,
            date: tweet.created_at,
            link: `https://x.com/${username}/status/${tweet.id}`,
        }))

    } catch (error) {
        console.error(`Error fetching tweets for ${userId}:`, error)
        return []
    }
}

/**
 * POST /api/twitter/fetch
 */
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { handles, maxPerAccount = 5 } = body

        if (!handles || !Array.isArray(handles) || handles.length === 0) {
            return NextResponse.json({ error: 'Hesap listesi gerekli' }, { status: 400 })
        }

        const allTweets: any[] = []

        for (const handle of handles) {
            const cleanHandle = handle.replace('@', '').trim()

            // User ID al
            const userId = await getUserId(cleanHandle)

            if (!userId) {
                console.log(`Could not find user: ${cleanHandle}`)
                continue
            }

            // Tweet'leri çek
            const tweets = await getUserTweets(userId, cleanHandle, maxPerAccount)
            allTweets.push(...tweets)

            // Rate limit için bekle
            await new Promise(r => setTimeout(r, 1000))
        }

        // Haber formatına çevir
        const newsItems = allTweets.map(tweet => ({
            title: `@${tweet.author}'ın X'teki açıklaması`,
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
