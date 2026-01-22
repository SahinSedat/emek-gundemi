import { NextResponse } from 'next/server'
import {
    fetchTweetsFromMultipleAccounts,
    filterNewsworthyTweets,
    tweetToNewsFormat,
    setCustomNitterInstance
} from '@/lib/scrapers/nitter-scraper'

/**
 * POST /api/twitter/fetch
 * Nitter üzerinden X/Twitter verileri çek
 * 
 * Body: {
 *   handles: string[],       // Çekilecek hesaplar
 *   maxPerAccount?: number,  // Hesap başına maksimum tweet (varsayılan: 5)
 *   nitterInstance?: string  // Özel Nitter instance (opsiyonel)
 * }
 */
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { handles, maxPerAccount = 5, nitterInstance } = body

        if (!handles || !Array.isArray(handles) || handles.length === 0) {
            return NextResponse.json(
                { error: 'En az bir hesap gerekli' },
                { status: 400 }
            )
        }

        // Özel Nitter instance varsa ayarla
        if (nitterInstance) {
            setCustomNitterInstance(nitterInstance)
        }

        // Nitter'dan tweet çek
        const rawTweets = await fetchTweetsFromMultipleAccounts(handles, maxPerAccount)

        // Haber değeri taşıyan tweetleri filtrele
        const newsworthyTweets = filterNewsworthyTweets(rawTweets)

        // Haber formatına çevir
        const newsItems = newsworthyTweets.map(tweetToNewsFormat)

        return NextResponse.json({
            success: true,
            totalFetched: rawTweets.length,
            filtered: newsworthyTweets.length,
            items: newsItems
        })

    } catch (error) {
        console.error('Nitter fetch error:', error)
        return NextResponse.json(
            { error: 'Tweet çekme hatası' },
            { status: 500 }
        )
    }
}

/**
 * GET /api/twitter/fetch?handles=user1,user2
 * URL parametresi ile çekim
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const handlesParam = searchParams.get('handles')
    const nitterInstance = searchParams.get('nitter')

    if (!handlesParam) {
        return NextResponse.json(
            { error: 'handles parametresi gerekli (virgülle ayrılmış)' },
            { status: 400 }
        )
    }

    const handles = handlesParam.split(',').map(h => h.trim()).filter(Boolean)

    if (handles.length === 0) {
        return NextResponse.json(
            { error: 'Geçerli hesap bulunamadı' },
            { status: 400 }
        )
    }

    // Özel Nitter instance varsa ayarla
    if (nitterInstance) {
        setCustomNitterInstance(nitterInstance)
    }

    try {
        const rawTweets = await fetchTweetsFromMultipleAccounts(handles, 5)
        const newsworthyTweets = filterNewsworthyTweets(rawTweets)
        const newsItems = newsworthyTweets.map(tweetToNewsFormat)

        return NextResponse.json({
            success: true,
            totalFetched: rawTweets.length,
            filtered: newsworthyTweets.length,
            items: newsItems
        })
    } catch (error) {
        console.error('Nitter fetch error:', error)
        return NextResponse.json(
            { error: 'Tweet çekme hatası' },
            { status: 500 }
        )
    }
}
