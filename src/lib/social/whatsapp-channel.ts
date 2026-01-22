/**
 * WhatsApp Channel Entegrasyonu
 * WhatsApp kanalına otomatik haber paylaşımı
 * 
 * Not: Bu modül Baileys kütüphanesi ile çalışır.
 * Kurulum: npm install @whiskeysockets/baileys
 */

interface WhatsAppMessage {
    title: string
    summary: string[]
    link: string
}

// Baileys bağlantı durumu
let whatsappClient: unknown = null
let isConnected = false

/**
 * WhatsApp'a bağlan (QR kod ile)
 * Bu fonksiyon sunucu başlatıldığında bir kez çağrılmalı
 */
export async function connectWhatsApp(): Promise<boolean> {
    try {
        // Baileys dinamik import (sunucu tarafında çalışır)
        const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } =
            await import('@whiskeysockets/baileys')

        const { state, saveCreds } = await useMultiFileAuthState('./whatsapp-session')

        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: true, // Terminal'de QR kod göster
        })

        sock.ev.on('creds.update', saveCreds)

        sock.ev.on('connection.update', (update: { connection?: string; lastDisconnect?: { error?: { output?: { statusCode?: number } } } }) => {
            const { connection, lastDisconnect } = update

            if (connection === 'close') {
                const shouldReconnect =
                    lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

                if (shouldReconnect) {
                    console.log('WhatsApp bağlantısı kesildi, yeniden bağlanılıyor...')
                    connectWhatsApp()
                }
            } else if (connection === 'open') {
                isConnected = true
                console.log('WhatsApp bağlantısı başarılı!')
            }
        })

        whatsappClient = sock
        return true
    } catch (error) {
        console.error('WhatsApp bağlantı hatası:', error)
        return false
    }
}

/**
 * WhatsApp kanalına mesaj gönder
 */
export async function sendWhatsAppChannelMessage(
    channelId: string,
    message: WhatsAppMessage
): Promise<boolean> {
    if (!whatsappClient || !isConnected) {
        console.error('WhatsApp bağlı değil')
        return false
    }

    const text = formatWhatsAppMessage(message)

    try {
        const sock = whatsappClient as {
            sendMessage: (jid: string, content: { text: string }) => Promise<unknown>
        }

        await sock.sendMessage(channelId, { text })
        return true
    } catch (error) {
        console.error('WhatsApp mesaj gönderme hatası:', error)
        return false
    }
}

/**
 * WhatsApp mesaj formatı oluştur
 */
export function formatWhatsAppMessage(message: WhatsAppMessage): string {
    const bullets = message.summary
        .slice(0, 3)
        .map(item => `• ${item}`)
        .join('\n')

    return `*${message.title}*

${bullets}

🔗 ${message.link}`
}

/**
 * Bağlantı durumunu kontrol et
 */
export function isWhatsAppConnected(): boolean {
    return isConnected
}

/**
 * Bağlantıyı kapat
 */
export async function disconnectWhatsApp(): Promise<void> {
    if (whatsappClient) {
        const sock = whatsappClient as { logout: () => Promise<void> }
        await sock.logout()
        whatsappClient = null
        isConnected = false
    }
}

/**
 * Basit HTTP tabanlı alternatif (WhatsApp Business API için)
 * Not: Bu yöntem için resmi WhatsApp Business API erişimi gerekir
 */
export async function sendViaBusinessAPI(
    phoneNumber: string,
    message: WhatsAppMessage
): Promise<boolean> {
    const token = process.env.WHATSAPP_BUSINESS_TOKEN
    const phoneId = process.env.WHATSAPP_PHONE_ID

    if (!token || !phoneId) {
        console.error('WhatsApp Business API credentials not set')
        return false
    }

    const text = formatWhatsAppMessage(message)

    try {
        const response = await fetch(
            `https://graph.facebook.com/v18.0/${phoneId}/messages`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: phoneNumber,
                    type: 'text',
                    text: { body: text },
                }),
            }
        )

        return response.ok
    } catch (error) {
        console.error('WhatsApp Business API error:', error)
        return false
    }
}
