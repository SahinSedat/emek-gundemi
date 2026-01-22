import { NextResponse } from 'next/server'

/**
 * GET /api/next-post
 * Cron job için bir sonraki haberi döndürür
 * Plain text format - direkt Telegram'a gönderilebilir
 */

// Paylaşılan haberler (duplicate kontrolü)
const publishedTitles: Set<string> = new Set()

// Gece saati kontrolü
function isNightTime(): boolean {
    const hour = new Date().getHours()
    return hour >= 1 && hour < 7
}

// Duplicate kontrolü
function isDuplicate(title: string): boolean {
    const key = title.toLowerCase().slice(0, 40)
    return publishedTitles.has(key)
}

function markPublished(title: string): void {
    const key = title.toLowerCase().slice(0, 40)
    publishedTitles.add(key)

    // Max 100 haber tut
    if (publishedTitles.size > 100) {
        const first = publishedTitles.values().next().value
        publishedTitles.delete(first)
    }
}

// RSS'den haber çek
async function fetchNews(): Promise<any[]> {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'
        const res = await fetch(`${baseUrl}/api/news/fetch`, {
            cache: 'no-store',
            signal: AbortSignal.timeout(8000)
        })
        if (res.ok) {
            const data = await res.json()
            return data.items || []
        }
    } catch (e) {
        console.error('News fetch error:', e)
    }
    return []
}

// Basit özet oluştur
function createSummary(content: string): string[] {
    // İlk 3 cümleyi al
    const sentences = content.split(/[.!?]/).filter(s => s.trim().length > 20)
    return sentences.slice(0, 3).map(s => s.trim() + '.')
}

// Haber formatla
function formatNewsForTelegram(title: string, content: string, source: string, link: string): string {
    const summary = createSummary(content)

    let text = `🟢 <b>${title}</b>\n\n`

    for (const item of summary) {
        text += `• ${item}\n`
    }

    text += `\n📰 Kaynak: ${source}`
    text += `\n🔗 <a href="${link}">Haberin Devamı</a>`

    return text
}

export async function GET() {
    // Gece saati kontrolü
    if (isNightTime()) {
        return new NextResponse('', { status: 204 }) // Boş döndür
    }

    // Haberleri çek
    const news = await fetchNews()

    if (news.length === 0) {
        return new NextResponse('', { status: 204 })
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
        return new NextResponse('', { status: 204 })
    }

    // Formatla
    const text = formatNewsForTelegram(
        selectedNews.title,
        selectedNews.content,
        selectedNews.source,
        selectedNews.link
    )

    // Paylaşıldı olarak işaretle
    markPublished(selectedNews.title)

    // Plain text olarak döndür
    return new NextResponse(text, {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    })
}
