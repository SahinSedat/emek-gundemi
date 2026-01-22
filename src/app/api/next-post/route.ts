import { NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * GET /api/next-post
 * Cron job için bir sonraki haberi döndürür
 * 
 * ÖZELLİKLER:
 * - SHA256 duplicate kontrolü
 * - #SONDAKİKA mekanizması
 * - Günlük limit: 25
 * - Derin içerik çıkarma
 * - Yüzeysel haber filtreleme
 */

// Paylaşılan haberler - SHA256 hash
const publishedHashes: Set<string> = new Set()
let dailyCount = 0
let lastResetDate = new Date().toDateString()

// SON DAKİKA anahtar kelimeleri
const BREAKING_KEYWORDS = [
    'yürürlüğe girdi',
    'bugün yayımlandı',
    'derhal',
    'ivedilikle',
    'son dakika',
    'resmi gazetede yayımlandı',
    'açıklandı'
]

// Günlük limit
const DAILY_LIMIT = 25

// SHA256 hash oluştur
function createHash(title: string, link: string): string {
    const data = `${title.toLowerCase().trim()}|${link.toLowerCase().trim()}`
    return crypto.createHash('sha256').update(data).digest('hex').slice(0, 16)
}

// Duplicate kontrolü
function isDuplicate(title: string, link: string): boolean {
    const hash = createHash(title, link)
    return publishedHashes.has(hash)
}

function markPublished(title: string, link: string): void {
    const hash = createHash(title, link)
    publishedHashes.add(hash)
    if (publishedHashes.size > 500) {
        const first = publishedHashes.values().next().value
        if (first) publishedHashes.delete(first)
    }
}

// Günlük sayaç kontrolü
function checkDailyLimit(): boolean {
    const today = new Date().toDateString()
    if (today !== lastResetDate) {
        dailyCount = 0
        lastResetDate = today
    }
    return dailyCount < DAILY_LIMIT
}

function incrementDailyCount(): void {
    dailyCount++
}

// SON DAKİKA kontrolü
function isBreakingNews(title: string, content: string): boolean {
    const text = `${title} ${content}`.toLowerCase()
    return BREAKING_KEYWORDS.some(keyword => text.includes(keyword.toLowerCase()))
}

// RSS'den haber çek
async function fetchNews(): Promise<any[]> {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'
        const res = await fetch(`${baseUrl}/api/news/fetch`, {
            cache: 'no-store',
            signal: AbortSignal.timeout(10000)
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

// Derin içerik çıkarma
function extractDetails(content: string): string[] {
    const details: string[] = []
    const sentences = content.split(/[.!?]/).filter(s => s.trim().length > 15)

    // Önce rakam içeren cümleleri al
    for (const sentence of sentences) {
        const trimmed = sentence.trim()
        if (/\d+/.test(trimmed) || /TL|₺|%|yüzde|tarih|ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık/i.test(trimmed)) {
            if (trimmed.length > 20 && trimmed.length < 150) {
                details.push(trimmed + '.')
            }
        }
    }

    // Yeterli değilse normal cümleler
    if (details.length < 3) {
        for (const sentence of sentences) {
            const trimmed = sentence.trim()
            if (trimmed.length > 30 && trimmed.length < 150 && !details.includes(trimmed + '.')) {
                details.push(trimmed + '.')
                if (details.length >= 4) break
            }
        }
    }

    return details.slice(0, 5)
}

// Yüzeysel içerik kontrolü
function isShallowContent(content: string, details: string[]): boolean {
    const shallowWords = ['açıklandı', 'belirlendi', 'duyuruldu', 'belli oldu']
    const hasShallow = shallowWords.some(w => content.toLowerCase().includes(w))

    if (hasShallow && details.length < 2) return true

    const hasNumbers = details.some(d => /\d+/.test(d))
    if (hasShallow && !hasNumbers) return true

    return false
}

// Haber formatla
function formatNews(title: string, content: string, source: string, link: string): string | null {
    const details = extractDetails(content)

    if (isShallowContent(content, details)) {
        console.log(`Skipping shallow: ${title}`)
        return null
    }

    if (details.length < 2) {
        console.log(`Not enough details: ${title}`)
        return null
    }

    // SON DAKİKA prefix
    const isBreaking = isBreakingNews(title, content)
    const prefix = isBreaking ? '🔴 #SONDAKİKA\n\n' : ''

    let text = `${prefix}🟢 ${title}\n\n`

    for (const detail of details) {
        text += `• ${detail}\n`
    }

    text += `\n📌 Kaynak: ${source}\n`
    text += `\n🔗 Kaynağa Git`

    return text
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const forceBreaking = searchParams.get('breaking') === 'true'

    // Günlük limit kontrolü
    if (!checkDailyLimit() && !forceBreaking) {
        return new NextResponse(JSON.stringify({
            error: 'Günlük limit doldu',
            count: dailyCount,
            limit: DAILY_LIMIT
        }), {
            status: 429,
            headers: { 'Content-Type': 'application/json' }
        })
    }

    const news = await fetchNews()

    if (news.length === 0) {
        return new NextResponse('', { status: 204 })
    }

    // Uygun haberi bul
    let formattedText: string | null = null
    let selectedNews = null

    // Önce SON DAKİKA haberleri (forceBreaking ise)
    if (forceBreaking) {
        for (const item of news) {
            if (isDuplicate(item.title, item.link)) continue
            if (!isBreakingNews(item.title, item.content)) continue

            const text = formatNews(item.title, item.content, item.source, item.link)
            if (text) {
                formattedText = text
                selectedNews = item
                break
            }
        }
    }

    // Normal haberler
    if (!formattedText) {
        for (const item of news) {
            if (isDuplicate(item.title, item.link)) continue

            const text = formatNews(item.title, item.content, item.source, item.link)
            if (text) {
                formattedText = text
                selectedNews = item
                break
            }
        }
    }

    if (!formattedText || !selectedNews) {
        return new NextResponse('', { status: 204 })
    }

    // İşaretle
    markPublished(selectedNews.title, selectedNews.link)
    incrementDailyCount()

    return new NextResponse(JSON.stringify({
        text: formattedText,
        link: selectedNews.link,
        isBreaking: isBreakingNews(selectedNews.title, selectedNews.content),
        dailyCount: dailyCount,
        dailyLimit: DAILY_LIMIT
    }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    })
}
