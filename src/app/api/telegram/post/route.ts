import { NextResponse } from 'next/server'
import { isNewsworthy, canPublishNow, CONTENT_RULES } from '@/lib/telegram-channels'

/**
 * Telegram Bot API - Kanala mesaj gönderme
 * POST /api/telegram/post
 */

const BOT_TOKEN = '8493536005:AAGZ_FT7KxjEmo-wJW-kecBPIkn6JDdPT4Q'
const CHANNEL_USERNAME = '@emek_gundemi'

// Son paylaşılan haberler (duplicate kontrolü)
const postedNews: Set<string> = new Set()
const lastPostTimes: Map<string, number> = new Map()
let dailyPostCount = 0
let lastResetDate = new Date().toDateString()

// Günlük sayacı sıfırla
function resetDailyCountIfNeeded() {
    const today = new Date().toDateString()
    if (today !== lastResetDate) {
        dailyPostCount = 0
        lastResetDate = today
        postedNews.clear() // Yeni gün, duplicate cache temizle
    }
}

// Duplicate kontrolü
function isDuplicate(title: string): boolean {
    const key = title.toLowerCase().slice(0, 50)
    return postedNews.has(key)
}

// Duplicate kaydet
function markAsPosted(title: string): void {
    const key = title.toLowerCase().slice(0, 50)
    postedNews.add(key)
}

// Rate limit kontrolü
function checkRateLimit(): { allowed: boolean; reason?: string } {
    resetDailyCountIfNeeded()

    const canPublish = canPublishNow()
    if (!canPublish.allowed) return canPublish

    if (dailyPostCount >= CONTENT_RULES.maxDailyPosts) {
        return { allowed: false, reason: `Günlük limit doldu (${CONTENT_RULES.maxDailyPosts})` }
    }

    const lastPost = lastPostTimes.get('global') || 0
    const minutesSinceLastPost = (Date.now() - lastPost) / 60000

    if (minutesSinceLastPost < CONTENT_RULES.minIntervalMinutes) {
        return {
            allowed: false,
            reason: `${CONTENT_RULES.minIntervalMinutes - Math.round(minutesSinceLastPost)} dk bekleyin`
        }
    }

    return { allowed: true }
}

// Telegram'a mesaj gönder
async function sendToTelegram(text: string): Promise<{ success: boolean; messageId?: number; error?: string }> {
    try {
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHANNEL_USERNAME,
                text: text,
                parse_mode: 'HTML',
                disable_web_page_preview: false,
            }),
        })

        const data = await response.json()

        if (data.ok) {
            lastPostTimes.set('global', Date.now())
            dailyPostCount++
            return { success: true, messageId: data.result.message_id }
        } else {
            return { success: false, error: data.description }
        }
    } catch (error) {
        console.error('Telegram send error:', error)
        return { success: false, error: 'Bağlantı hatası' }
    }
}

/**
 * YENİ FORMAT - Kullanıcının istediği şekilde
 * - Kısa tıklanabilir link
 * - Hashtag yok
 * - Detaylı bilgi
 */
function formatNewsPost(
    title: string,
    summary: string[],
    sourceName: string,
    sourceLink: string,
    aiComment?: string
): string {
    let post = `🟢 <b>${title}</b>\n\n`

    // Özet maddeleri
    for (const item of summary) {
        post += `• ${item}\n`
    }

    // AI Yorumu varsa
    if (aiComment) {
        post += `\n💡 <i>${aiComment}</i>\n`
    }

    // Kaynak bilgileri - düzgün format
    post += `\n📰 Kaynak: ${sourceName}`
    post += `\n🔗 <a href="${sourceLink}">Haberin Devamı</a>`

    return post
}

/**
 * POST /api/telegram/post
 */
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { title, summary, source, sourceLink, aiComment, force = false } = body

        if (!title || !summary) {
            return NextResponse.json({ error: 'title ve summary gerekli' }, { status: 400 })
        }

        // Duplicate kontrolü
        if (isDuplicate(title)) {
            return NextResponse.json({
                success: false,
                error: 'Bu haber zaten paylaşılmış',
                duplicate: true
            }, { status: 409 })
        }

        // Rate limit (force ile geçilebilir)
        if (!force) {
            const rateCheck = checkRateLimit()
            if (!rateCheck.allowed) {
                return NextResponse.json({
                    success: false,
                    error: rateCheck.reason,
                    retryAfter: CONTENT_RULES.minIntervalMinutes * 60
                }, { status: 429 })
            }
        }

        // Mesajı formatla
        const text = formatNewsPost(title, summary, source, sourceLink, aiComment)

        // Telegram'a gönder
        const result = await sendToTelegram(text)

        if (result.success) {
            markAsPosted(title)
            return NextResponse.json({
                success: true,
                messageId: result.messageId,
                dailyCount: dailyPostCount,
                remaining: CONTENT_RULES.maxDailyPosts - dailyPostCount
            })
        } else {
            return NextResponse.json({ success: false, error: result.error }, { status: 500 })
        }

    } catch (error) {
        console.error('Post error:', error)
        return NextResponse.json({ error: 'Paylaşım hatası' }, { status: 500 })
    }
}

/**
 * GET /api/telegram/post - İstatistikler
 */
export async function GET() {
    resetDailyCountIfNeeded()
    const canPost = checkRateLimit()

    return NextResponse.json({
        dailyCount: dailyPostCount,
        dailyLimit: CONTENT_RULES.maxDailyPosts,
        remaining: CONTENT_RULES.maxDailyPosts - dailyPostCount,
        canPost: canPost.allowed,
        reason: canPost.reason,
        postedCount: postedNews.size
    })
}
