import { NextResponse } from 'next/server'

/**
 * GET /api/next-post
 * Cron job için bir sonraki haberi döndürür
 * Plain text format - direkt Telegram'a gönderilebilir
 * 
 * FORMAT:
 * 🟢 BAŞLIK
 * • Madde 1
 * • Madde 2
 * • Madde 3
 * 📌 Kaynak: Kaynak Adı
 * 🔗 Kaynağa Git
 */

// Paylaşılan haberler (duplicate kontrolü)
const publishedTitles: Set<string> = new Set()

// Gece saati kontrolü - DEVRE DIŞI (7/24 aktif)
function isNightTime(): boolean {
    return false // 7/24 paylaşım aktif
}

// Duplicate kontrolü
function isDuplicate(title: string): boolean {
    const key = title.toLowerCase().slice(0, 40)
    return publishedTitles.has(key)
}

function markPublished(title: string): void {
    const key = title.toLowerCase().slice(0, 40)
    publishedTitles.add(key)
    if (publishedTitles.size > 100) {
        const first = publishedTitles.values().next().value
        if (first) publishedTitles.delete(first)
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

// İçerikten detay çıkar - "açıklandı/belirlendi" kontrolü
function extractDetails(content: string): string[] {
    const details: string[] = []

    // Rakam içeren cümleleri bul (fiyat, ücret, tarih)
    const sentences = content.split(/[.!?]/).filter(s => s.trim().length > 15)

    for (const sentence of sentences) {
        const trimmed = sentence.trim()

        // Rakam, TL, %, tarih içeriyorsa önemli
        if (/\d+/.test(trimmed) || /TL|₺|%|yüzde/i.test(trimmed)) {
            // Kısa ve net hale getir
            const clean = trimmed
                .replace(/^(.*?)(:|–|-)\s*/, '') // Başlık gibi prefixleri kaldır
                .trim()

            if (clean.length > 20 && clean.length < 150) {
                details.push(clean)
            }
        }
    }

    // Eğer rakam yoksa ilk 3 anlamlı cümleyi al
    if (details.length === 0) {
        for (const sentence of sentences.slice(0, 3)) {
            const trimmed = sentence.trim()
            if (trimmed.length > 30 && trimmed.length < 150) {
                details.push(trimmed + '.')
            }
        }
    }

    return details.slice(0, 5) // Max 5 madde
}

// Haber yüzeysel mi kontrol et
function isShallowContent(content: string, extractedDetails: string[]): boolean {
    const shallowKeywords = ['açıklandı', 'belirlendi', 'duyuruldu', 'belli oldu']
    const hasShallowKeyword = shallowKeywords.some(k => content.toLowerCase().includes(k))

    // Yüzeysel anahtar kelime var ama detay yok
    if (hasShallowKeyword && extractedDetails.length < 2) {
        return true
    }

    // Detaylarda hiç rakam yok
    const hasNumbers = extractedDetails.some(d => /\d+/.test(d))
    if (hasShallowKeyword && !hasNumbers) {
        return true
    }

    return false
}

// YENİ FORMAT - Telegram için haber formatla
function formatNewsForTelegram(title: string, content: string, source: string, link: string): string | null {
    const details = extractDetails(content)

    // Yüzeysel içerik kontrolü
    if (isShallowContent(content, details)) {
        console.log(`Skipping shallow content: ${title}`)
        return null
    }

    // Minimum detay kontrolü
    if (details.length < 2) {
        // Fallback: içerikten cümle al
        const fallbackDetails = content.split(/[.!?]/)
            .filter(s => s.trim().length > 30)
            .slice(0, 3)
            .map(s => s.trim() + '.')

        if (fallbackDetails.length < 2) {
            console.log(`Not enough details: ${title}`)
            return null
        }

        details.push(...fallbackDetails)
    }

    // FORMAT OLUŞTUR
    let text = `🟢 ${title}\n\n`

    for (const detail of details.slice(0, 5)) {
        text += `• ${detail}\n`
    }

    text += `\n📌 Kaynak: ${source}\n`
    text += `\n🔗 Kaynağa Git`

    return text
}

export async function GET() {
    // Gece saati kontrolü
    if (isNightTime()) {
        return new NextResponse('', { status: 204 })
    }

    // Haberleri çek
    const news = await fetchNews()

    if (news.length === 0) {
        return new NextResponse('', { status: 204 })
    }

    // Benzersiz ve detaylı haberi bul
    let formattedText: string | null = null
    let selectedNews = null

    for (const item of news) {
        if (isDuplicate(item.title)) continue

        const text = formatNewsForTelegram(
            item.title,
            item.content,
            item.source,
            item.link
        )

        if (text) {
            formattedText = text
            selectedNews = item
            break
        }
    }

    if (!formattedText || !selectedNews) {
        return new NextResponse('', { status: 204 })
    }

    // Paylaşıldı olarak işaretle
    markPublished(selectedNews.title)

    // Plain text + link bilgisi döndür
    // Cron script bu çıktıyı alıp link ile birlikte gönderecek
    const output = JSON.stringify({
        text: formattedText,
        link: selectedNews.link
    })

    return new NextResponse(output, {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    })
}
