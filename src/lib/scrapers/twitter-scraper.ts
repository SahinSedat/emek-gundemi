/**
 * X/Twitter Scraper
 * Belirtilen hesaplardan tweet çeker
 */

export interface Tweet {
    id: string
    text: string
    authorHandle: string
    authorName: string
    createdAt: string
    url: string
}

export interface TwitterConfig {
    bearerToken: string
}

/**
 * Twitter API v2 ile tweet çek
 */
export async function fetchTweetsFromUser(
    handle: string,
    bearerToken: string,
    maxResults: number = 10
): Promise<Tweet[]> {
    // Önce kullanıcı ID'sini al
    const userResponse = await fetch(
        `https://api.twitter.com/2/users/by/username/${handle}`,
        {
            headers: {
                Authorization: `Bearer ${bearerToken}`,
            },
        }
    )

    if (!userResponse.ok) {
        console.error(`Twitter user fetch error for ${handle}:`, await userResponse.text())
        return []
    }

    const userData = await userResponse.json()
    const userId = userData.data?.id

    if (!userId) {
        console.error(`User not found: ${handle}`)
        return []
    }

    // Tweetleri çek
    const tweetsResponse = await fetch(
        `https://api.twitter.com/2/users/${userId}/tweets?max_results=${maxResults}&tweet.fields=created_at,text`,
        {
            headers: {
                Authorization: `Bearer ${bearerToken}`,
            },
        }
    )

    if (!tweetsResponse.ok) {
        console.error(`Twitter tweets fetch error:`, await tweetsResponse.text())
        return []
    }

    const tweetsData = await tweetsResponse.json()

    return (tweetsData.data || []).map((tweet: { id: string; text: string; created_at: string }) => ({
        id: tweet.id,
        text: tweet.text,
        authorHandle: handle,
        authorName: userData.data.name,
        createdAt: tweet.created_at,
        url: `https://twitter.com/${handle}/status/${tweet.id}`,
    }))
}

/**
 * Birden fazla hesaptan tweet çek
 */
export async function fetchTweetsFromMultipleUsers(
    handles: string[],
    bearerToken: string,
    maxResultsPerUser: number = 5
): Promise<Tweet[]> {
    const allTweets: Tweet[] = []

    for (const handle of handles) {
        try {
            const tweets = await fetchTweetsFromUser(handle, bearerToken, maxResultsPerUser)
            allTweets.push(...tweets)
        } catch (error) {
            console.error(`Error fetching tweets from ${handle}:`, error)
        }
    }

    // Tarihe göre sırala (en yeni önce)
    return allTweets.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
}

/**
 * Tweet'i haber formatına çevir
 */
export function tweetToNewsFormat(tweet: Tweet) {
    return {
        title: tweet.text.slice(0, 100) + (tweet.text.length > 100 ? '...' : ''),
        content: tweet.text,
        source: `@${tweet.authorHandle}`,
        sourceUrl: tweet.url,
        sourceType: 'twitter' as const,
        tweetId: tweet.id,
        authorHandle: tweet.authorHandle,
        processed: false,
    }
}
