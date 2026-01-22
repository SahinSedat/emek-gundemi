import { NextResponse } from 'next/server'

/**
 * Telegram Kanal Entegrasyonu
 * Public kanallardan mesaj çekimi
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8493536005:AAGZ_FT7KxjEmo-wJW-kecBPIkn6JDdPT4Q'

interface TelegramMessage {
    message_id: number
    date: number
    text?: string
    caption?: string
    chat: {
        id: number
        title: string
        username?: string
    }
}

interface TelegramUpdate {
    ok: boolean
    result: TelegramMessage[]
}

// Telegram kanalından son mesajları çek
async function getChannelMessages(channelUsername: string): Promise<any[]> {
    // Bot token yoksa boş dön
    if (!TELEGRAM_BOT_TOKEN) {
        console.log('Telegram bot token not configured')
        return []
    }

    const cleanUsername = channelUsername.replace('@', '').trim()

    try {
        // getUpdates API kullanarak son mesajları al
        // Not: Bu yöntem sadece bot'un üye olduğu kanallar için çalışır
        const response = await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=-10&limit=10`,
            { cache: 'no-store' }
        )

        if (!response.ok) {
            console.log(`Telegram API error: ${response.status}`)
            return []
        }

        const data = await response.json()

        if (!data.ok) {
            console.log('Telegram API returned error')
            return []
        }

        // Kanal mesajlarını filtrele
        const messages = (data.result || [])
            .filter((update: any) => {
                const msg = update.channel_post || update.message
                return msg && msg.chat?.username?.toLowerCase() === cleanUsername.toLowerCase()
            })
            .map((update: any) => {
                const msg = update.channel_post || update.message
                return {
                    id: msg.message_id.toString(),
                    text: msg.text || msg.caption || '',
                    channel: msg.chat.title || cleanUsername,
                    channelUsername: msg.chat.username || cleanUsername,
                    date: new Date(msg.date * 1000).toISOString(),
                    link: `https://t.me/${cleanUsername}/${msg.message_id}`,
                }
            })

        return messages

    } catch (error) {
        console.error('Telegram fetch error:', error)
        return []
    }
}

/**
 * POST /api/telegram/fetch
 */
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { channels } = body

        if (!channels || !Array.isArray(channels) || channels.length === 0) {
            return NextResponse.json({ error: 'Kanal listesi gerekli' }, { status: 400 })
        }

        if (!TELEGRAM_BOT_TOKEN) {
            return NextResponse.json({
                error: 'Telegram bot token ayarlanmamış',
                hint: 'Bot token için @BotFather kullanın'
            }, { status: 400 })
        }

        const allMessages: any[] = []

        for (const channel of channels) {
            const messages = await getChannelMessages(channel)
            allMessages.push(...messages)
            await new Promise(r => setTimeout(r, 500))
        }

        // Haber formatına çevir
        const newsItems = allMessages.map(msg => ({
            title: `📢 ${msg.channel}`,
            content: msg.text,
            source: msg.channel,
            sourceUrl: msg.link,
            messageId: msg.id,
            channelUsername: msg.channelUsername,
        }))

        return NextResponse.json({
            success: true,
            count: newsItems.length,
            items: newsItems
        })

    } catch (error) {
        console.error('Telegram fetch error:', error)
        return NextResponse.json({ error: 'Mesaj çekme hatası' }, { status: 500 })
    }
}

/**
 * GET /api/telegram/fetch?channels=kanal1,kanal2
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const channelsParam = searchParams.get('channels')

    if (!channelsParam) {
        return NextResponse.json({ error: 'channels gerekli' }, { status: 400 })
    }

    const channels = channelsParam.split(',').map(c => c.trim()).filter(Boolean)

    const fakeRequest = { json: async () => ({ channels }) } as Request
    return POST(fakeRequest)
}
