import { NextResponse } from 'next/server'
import { sendTelegramMessage, getChannelId } from '@/lib/social/telegram-bot'
import { postTweet, formatTweetContent } from '@/lib/social/twitter-poster'
import { formatWhatsAppMessage } from '@/lib/social/whatsapp-channel'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/social/share
 * Haberi sosyal medyada paylaş
 */
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { newsId, platforms } = body

        if (!newsId || !platforms || !Array.isArray(platforms)) {
            return NextResponse.json(
                { error: 'Haber ID ve platformlar gerekli' },
                { status: 400 }
            )
        }

        // Haberi çek
        const news = await prisma.news.findUnique({
            where: { id: newsId },
            include: { category: true },
        })

        if (!news) {
            return NextResponse.json(
                { error: 'Haber bulunamadı' },
                { status: 404 }
            )
        }

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
        const newsUrl = `${siteUrl}/haber/${news.slug}`

        const results: Record<string, boolean> = {}

        // Telegram
        if (platforms.includes('telegram')) {
            const success = await sendTelegramMessage(getChannelId(), {
                title: news.title,
                summary: news.summary,
                link: newsUrl,
                category: news.category?.name,
            })
            results.telegram = success

            if (success) {
                await prisma.socialPost.create({
                    data: {
                        newsId: news.id,
                        platform: 'TELEGRAM',
                        content: news.title,
                        status: 'POSTED',
                        postedAt: new Date(),
                    },
                })
            }
        }

        // Twitter
        if (platforms.includes('twitter')) {
            const tweetResult = await postTweet({
                title: news.title,
                summary: news.summary,
                link: newsUrl,
            })
            results.twitter = tweetResult.success

            if (tweetResult.success) {
                await prisma.socialPost.create({
                    data: {
                        newsId: news.id,
                        platform: 'X',
                        content: formatTweetContent({
                            title: news.title,
                            summary: news.summary,
                            link: newsUrl,
                        }),
                        status: 'POSTED',
                        postedAt: new Date(),
                        postUrl: tweetResult.tweetId
                            ? `https://twitter.com/i/status/${tweetResult.tweetId}`
                            : undefined,
                    },
                })
            }
        }

        // WhatsApp (sadece format döndür, otomatik gönderim için Baileys gerekli)
        if (platforms.includes('whatsapp')) {
            const whatsappContent = formatWhatsAppMessage({
                title: news.title,
                summary: news.summary,
                link: newsUrl,
            })
            results.whatsapp = true // Manuel paylaşım için hazır
            results.whatsappContent = whatsappContent as unknown as boolean
        }

        // Haber durumunu güncelle
        await prisma.news.update({
            where: { id: newsId },
            data: { socialShared: true },
        })

        // Activity log
        await prisma.activityLog.create({
            data: {
                action: 'SHARE_SOCIAL',
                entityType: 'News',
                entityId: newsId,
                details: `Sosyal medyada paylaşıldı: ${platforms.join(', ')}`,
            },
        })

        return NextResponse.json({ success: true, results })
    } catch (error) {
        console.error('Social share error:', error)
        return NextResponse.json(
            { error: 'Paylaşım sırasında hata oluştu' },
            { status: 500 }
        )
    }
}
