/**
 * Telegram Bot Entegrasyonu
 * Telegram kanalına otomatik haber paylaşımı
 */

interface TelegramMessage {
    title: string
    summary: string[]
    link: string
    category?: string
}

/**
 * Telegram'a mesaj gönder
 */
export async function sendTelegramMessage(
    chatId: string,
    message: TelegramMessage
): Promise<boolean> {
    const botToken = process.env.TELEGRAM_BOT_TOKEN

    if (!botToken) {
        console.error('TELEGRAM_BOT_TOKEN not set')
        return false
    }

    const text = formatTelegramMessage(message)

    try {
        const response = await fetch(
            `https://api.telegram.org/bot${botToken}/sendMessage`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text,
                    parse_mode: 'HTML',
                    disable_web_page_preview: false,
                }),
            }
        )

        if (!response.ok) {
            const error = await response.json()
            console.error('Telegram API error:', error)
            return false
        }

        return true
    } catch (error) {
        console.error('Telegram send error:', error)
        return false
    }
}

/**
 * Telegram mesaj formatı oluştur
 */
export function formatTelegramMessage(message: TelegramMessage): string {
    const bullets = message.summary
        .slice(0, 3)
        .map(item => `▫️ ${item}`)
        .join('\n')

    return `🔴 <b>${escapeHTML(message.title)}</b>

${bullets}

🔗 <a href="${message.link}">Devamını Oku</a>

#EmekGündemi #KamuHaber ${message.category ? `#${message.category}` : ''}`
}

/**
 * HTML karakterlerini escape et
 */
function escapeHTML(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
}

/**
 * Kanal ID'sini al (@ ile başlayan kullanıcı adı veya chat_id)
 */
export function getChannelId(): string {
    return process.env.TELEGRAM_CHANNEL_ID || '@emekgundemi'
}

/**
 * Bot bilgilerini kontrol et
 */
export async function checkBotInfo(): Promise<{ ok: boolean; username?: string }> {
    const botToken = process.env.TELEGRAM_BOT_TOKEN

    if (!botToken) {
        return { ok: false }
    }

    try {
        const response = await fetch(
            `https://api.telegram.org/bot${botToken}/getMe`
        )
        const data = await response.json()

        if (data.ok) {
            return { ok: true, username: data.result.username }
        }
        return { ok: false }
    } catch {
        return { ok: false }
    }
}

/**
 * Toplu mesaj gönderimi (rate limit'e dikkat)
 */
export async function sendBulkMessages(
    chatId: string,
    messages: TelegramMessage[],
    delayMs: number = 3000 // Telegram rate limit için 3 saniye
): Promise<{ sent: number; failed: number }> {
    let sent = 0
    let failed = 0

    for (const message of messages) {
        const success = await sendTelegramMessage(chatId, message)
        if (success) {
            sent++
        } else {
            failed++
        }

        // Rate limit için bekle
        if (messages.indexOf(message) < messages.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delayMs))
        }
    }

    return { sent, failed }
}
