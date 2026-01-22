import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/news
 * Haberleri listele
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const categorySlug = searchParams.get('category')
        const limit = parseInt(searchParams.get('limit') || '10')
        const offset = parseInt(searchParams.get('offset') || '0')
        const published = searchParams.get('published') !== 'false'

        const where = {
            ...(published && { isPublished: true }),
            ...(categorySlug && { category: { slug: categorySlug } }),
        }

        const [news, total] = await Promise.all([
            prisma.news.findMany({
                where,
                include: {
                    category: {
                        select: { name: true, slug: true, color: true },
                    },
                },
                orderBy: { publishedAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            prisma.news.count({ where }),
        ])

        return NextResponse.json({
            news,
            total,
            hasMore: offset + news.length < total,
        })
    } catch (error) {
        console.error('News fetch error:', error)
        return NextResponse.json(
            { error: 'Haberler yüklenirken hata oluştu' },
            { status: 500 }
        )
    }
}

/**
 * POST /api/news
 * Yeni haber ekle
 */
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const {
            title,
            slug,
            summary,
            content,
            aiAnalysis,
            source,
            sourceUrl,
            categoryId,
            relatedEntity,
            tags,
            imageUrl,
            isPublished,
            isFeatured,
        } = body

        // Validasyon
        if (!title || !content || !categoryId) {
            return NextResponse.json(
                { error: 'Başlık, içerik ve kategori zorunludur' },
                { status: 400 }
            )
        }

        const news = await prisma.news.create({
            data: {
                title,
                slug: slug || generateSlug(title),
                summary: summary || [],
                content,
                aiAnalysis,
                source: source || 'Emek Gündemi',
                sourceUrl: sourceUrl || '',
                categoryId,
                relatedEntity,
                tags: tags || [],
                imageUrl,
                isPublished: isPublished || false,
                isFeatured: isFeatured || false,
                publishedAt: isPublished ? new Date() : null,
            },
            include: {
                category: true,
            },
        })

        // Activity log
        await prisma.activityLog.create({
            data: {
                action: 'CREATE_NEWS',
                entityType: 'News',
                entityId: news.id,
                details: `Yeni haber oluşturuldu: ${title}`,
            },
        })

        return NextResponse.json(news, { status: 201 })
    } catch (error) {
        console.error('News create error:', error)
        return NextResponse.json(
            { error: 'Haber oluşturulurken hata oluştu' },
            { status: 500 }
        )
    }
}

/**
 * Türkçe slug oluştur
 */
function generateSlug(text: string): string {
    const turkishMap: Record<string, string> = {
        'ç': 'c', 'Ç': 'c', 'ğ': 'g', 'Ğ': 'g',
        'ı': 'i', 'İ': 'i', 'ö': 'o', 'Ö': 'o',
        'ş': 's', 'Ş': 's', 'ü': 'u', 'Ü': 'u',
    }

    return text
        .split('')
        .map(char => turkishMap[char] || char)
        .join('')
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 100)
}
