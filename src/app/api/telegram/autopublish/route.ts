import { NextResponse } from 'next/server'

/**
 * Otomatik Haber Yayınlama Sistemi
 * GET /api/telegram/autopublish - Otomatik haber çek ve paylaş
 */

const BOT_TOKEN = '8493536005:AAGZ_FT7KxjEmo-wJW-kecBPIkn6JDdPT4Q'
const CHANNEL_USERNAME = '@emek_gundemi'

// Paylaşılan haberler (duplicate kontrolü)
const publishedTitles: Set<string> = new Set()
let lastPublishTime = 0
const MIN_INTERVAL_MS = 30 * 60 * 1000 // 30 dakika

// RSS'den haber çek
async function fetchNews(): Promise<any[]> {
    try {
        const res = await fetch('http://localhost:3001/api/news/fetch', { cache: 'no-store' })
        if (res.ok) {
            const data = await res.json()
            return data.items || []
        }
    } catch (e) {
        console.error('News fetch error:', e)
    }
    return []
}

// AI ile özetle
async function summarizeWithAI(title: string, content: string): Promise<{ summary: string[]; aiComment: string }> {
    try {
        const res = await fetch('http://localhost:3001/api/ai/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content, source: '', sourceUrl: '' })
        })

        if (res.ok) {
            const data = await res.json()
            return {
                summary: data.summary || [content.slice(0, 150)],
                aiComment: data.aiComment || ''
            }
        }
    } catch (e) {
        console.error('AI process error:', e)
    }

    // Fallback - basit özet
    return {
        summary: [content.slice(0, 200) + '...'],
        aiComment: ''
    }
}

// Telegram'a paylaş
async function postToTelegram(text: string): Promise<boolean> {
    try {
        const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHANNEL_USERNAME,
                text: text,
                parse_mode: 'HTML',
                disable_web_page_preview: false
            })
        })
        const data = await res.json()
        return data.ok
    } catch (e) {
        console.error('Telegram post error:', e)
        return false
    }
}

// Haber formatla
function formatNews(title: string, summary: string[], source: string, link: string, aiComment?: string): string {
    let post = `🟢 <b>${title}</b>\n\n`

    for (const item of summary.slice(0, 4)) {
        post += `• ${item}\n`
    }

    if (aiComment) {
        post += `\n💡 <i>${aiComment}</i>\n`
    }

    post += `\n📰 Kaynak: ${source}`
    post += `\n🔗 <a href="${link}">Haberin Devamı</a>`

    return post
}

// Duplicate kontrolü
function isDuplicate(title: string): boolean {
    const key = title.toLowerCase().slice(0, 40)
    return publishedTitles.has(key)
}

function markPublished(title: string): void {
    const key = title.toLowerCase().slice(0, 40)
    publishedTitles.add(key)
}

/**
 * GET /api/telegram/autopublish
 * Tek haber çek, işle, paylaş
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'

    // Rate limit kontrolü
    const now = Date.now()
    if (!force && (now - lastPublishTime) < MIN_INTERVAL_MS) {
        const waitMinutes = Math.ceil((MIN_INTERVAL_MS - (now - lastPublishTime)) / 60000)
        return NextResponse.json({
            success: false,
            error: `Bekleyin: ${waitMinutes} dakika sonra tekrar deneyin`,
            nextPublishAt: new Date(lastPublishTime + MIN_INTERVAL_MS).toISOString()
        })
    }

    // Gece kontrolü (01:00 - 07:00)
    const hour = new Date().getHours()
    if (!force && hour >= 1 && hour < 7) {
        return NextResponse.json({
            success: false,
            error: 'Gece saatlerinde paylaşım yapılmıyor (01:00 - 07:00)'
        })
    }

    // Haberleri çek
    const news = await fetchNews()

    if (news.length === 0) {
        return NextResponse.json({ success: false, error: 'Haber bulunamadı' })
    }

    // İlk benzersiz haberi bul
    let selectedNews = null
    for (const item of news) {
        if (!isDuplicate(item.title)) {
            selectedNews = item
            break
        }
    }

    if (!selectedNews) {
        return NextResponse.json({
            success: false,
            error: 'Tüm haberler zaten paylaşılmış',
            totalNews: news.length,
            publishedCount: publishedTitles.size
        })
    }

    // AI ile özetle
    const { summary, aiComment } = await summarizeWithAI(selectedNews.title, selectedNews.content)

    // Formatla
    const text = formatNews(
        selectedNews.title,
        summary,
        selectedNews.source,
        selectedNews.link,
        aiComment
    )

    // Telegram'a paylaş
    const posted = await postToTelegram(text)

    if (posted) {
        markPublished(selectedNews.title)
        lastPublishTime = now

        return NextResponse.json({
            success: true,
            title: selectedNews.title,
            source: selectedNews.source,
            publishedCount: publishedTitles.size,
            nextPublishAt: new Date(now + MIN_INTERVAL_MS).toISOString()
        })
    } else {
        return NextResponse.json({
            success: false,
            error: 'Telegram paylaşım hatası'
        }, { status: 500 })
    }
}

/**
 * POST /api/telegram/autopublish
 * Belirli bir haberi paylaş
 */
export async function POST(request: Request) {
    const body = await request.json()
    const { title, content, source, link, force = false } = body

    if (!title || !content) {
        return NextResponse.json({ error: 'title ve content gerekli' }, { status: 400 })
    }

    // Duplicate kontrolü
    if (!force && isDuplicate(title)) {
        return NextResponse.json({ success: false, error: 'Bu haber zaten paylaşılmış' })
    }

    // AI ile özetle
    const { summary, aiComment } = await summarizeWithAI(title, content)

    // Formatla ve paylaş
    const text = formatNews(title, summary, source || 'Kaynak', link || '', aiComment)
    const posted = await postToTelegram(text)

    if (posted) {
        markPublished(title)
        lastPublishTime = Date.now()
        return NextResponse.json({ success: true, title })
    } else {
        return NextResponse.json({ success: false, error: 'Paylaşım hatası' }, { status: 500 })
    }
}
