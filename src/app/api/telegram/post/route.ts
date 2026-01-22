import { NextResponse } from 'next/server'
import { isNewsworthy, canPublishNow, CONTENT_RULES } from '@/lib/telegram-channels'

/**
 * Telegram Bot API - Kanala mesaj gönderme
 * POST /api/telegram/post
 */

const BOT_TOKEN = '8493536005:AAGZ_FT7KxjEmo-wJW-kecBPIkn6JDdPT4Q'
const CHANNEL_USERNAME = '@emek_gundemi' // Bot'un paylaşacağı kanal

interface PostResult {
    success: boolean
    messageId?: number
    error?: string
}

// Son paylaşım zamanları (rate limiting için)
const lastPostTimes: Map<string, number> = new Map()
let dailyPostCount = 0
let lastResetDate = new Date().toDateString()

// Günlük sayacı sıfırla
function resetDailyCountIfNeeded() {
    const today = new Date().toDateString()
    if (today !== lastResetDate) {
        dailyPostCount = 0
        lastResetDate = today
    }
}

// Rate limit kontrolü
function checkRateLimit(): { allowed: boolean; reason?: string } {
    resetDailyCountIfNeeded()

    // Gece kontrolü
    const canPublish = canPublishNow()
    if (!canPublish.allowed) {
        return canPublish
    }

    // Günlük limit kontrolü
    if (dailyPostCount >= CONTENT_RULES.maxDailyPosts) {
        return {
            allowed: false,
            reason: `Günlük paylaşım limiti doldu (${CONTENT_RULES.maxDailyPosts})`
        }
    }

    // Son paylaşımdan bu yana geçen süre
    const lastPost = lastPostTimes.get('global') || 0
    const minutesSinceLastPost = (Date.now() - lastPost) / 60000

    if (minutesSinceLastPost < CONTENT_RULES.minIntervalMinutes) {
        return {
            allowed: false,
            reason: `Son paylaşımdan ${CONTENT_RULES.minIntervalMinutes} dakika geçmeli (${Math.round(minutesSinceLastPost)} dk geçti)`
        }
    }

    return { allowed: true }
}

// Telegram'a mesaj gönder
async function sendToTelegram(text: string, parseMode: 'HTML' | 'Markdown' = 'HTML'): Promise<PostResult> {
    try {
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHANNEL_USERNAME,
                text: text,
                parse_mode: parseMode,
                disable_web_page_preview: false,
            }),
        })

        const data = await response.json()

        if (data.ok) {
            // Rate limit güncelle
            lastPostTimes.set('global', Date.now())
            dailyPostCount++

            return {
                success: true,
                messageId: data.result.message_id
            }
        } else {
            return {
                success: false,
                error: data.description || 'Telegram API hatası'
            }
        }
    } catch (error) {
        console.error('Telegram send error:', error)
        return {
            success: false,
            error: 'Telegram bağlantı hatası'
        }
    }
}

// Haber formatına çevir
function formatNewsPost(title: string, summary: string[], source: string, link: string): string {
    let post = `🟢 <b>${title}</b>\n\n`

    for (const item of summary) {
        post += `• ${item}\n`
    }

    post += `\n📰 <i>${source}</i>`

    if (link) {
        post += `\n🔗 <a href="${link}">Detaylar</a>`
    }

    post += '\n\n#EmekGündemi'

    return post
}

/**
 * POST /api/telegram/post
 * Body: { title, summary[], source, link, force? }
 */
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { title, summary, source, link, force = false } = body

        if (!title || !summary) {
            return NextResponse.json({ error: 'title ve summary gerekli' }, { status: 400 })
        }

        // Rate limit kontrolü (force ile geçilebilir)
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
        const text = formatNewsPost(title, summary, source, link)

        // Telegram'a gönder
        const result = await sendToTelegram(text)

        if (result.success) {
            return NextResponse.json({
                success: true,
                messageId: result.messageId,
                dailyCount: dailyPostCount,
                remaining: CONTENT_RULES.maxDailyPosts - dailyPostCount
            })
        } else {
            return NextResponse.json({
                success: false,
                error: result.error
            }, { status: 500 })
        }

    } catch (error) {
        console.error('Post error:', error)
        return NextResponse.json({ error: 'Paylaşım hatası' }, { status: 500 })
    }
}

/**
 * GET /api/telegram/post/stats
 * Paylaşım istatistikleri
 */
export async function GET() {
    resetDailyCountIfNeeded()

    const canPost = checkRateLimit()
    const lastGlobalPost = lastPostTimes.get('global')

    return NextResponse.json({
        dailyCount: dailyPostCount,
        dailyLimit: CONTENT_RULES.maxDailyPosts,
        remaining: CONTENT_RULES.maxDailyPosts - dailyPostCount,
        canPost: canPost.allowed,
        reason: canPost.reason,
        lastPostTime: lastGlobalPost ? new Date(lastGlobalPost).toISOString() : null,
        minIntervalMinutes: CONTENT_RULES.minIntervalMinutes,
        nightHours: {
            start: CONTENT_RULES.nightHoursStart,
            end: CONTENT_RULES.nightHoursEnd
        }
    })
}
