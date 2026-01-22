import { NextResponse } from 'next/server'
import { processNewsWithAI } from '@/lib/ai/news-processor'

/**
 * POST /api/ai/process
 * Haberi OpenAI (ChatGPT) ile işle
 */
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { title, content, source, sourceUrl } = body

        if (!title || !content) {
            return NextResponse.json(
                { error: 'Başlık ve içerik gerekli' },
                { status: 400 }
            )
        }

        const result = await processNewsWithAI({
            title,
            content,
            source: source || 'Bilinmiyor',
            sourceUrl: sourceUrl || '',
        })

        return NextResponse.json(result)
    } catch (error) {
        console.error('AI processing error:', error)
        return NextResponse.json(
            { error: 'AI işleme hatası' },
            { status: 500 }
        )
    }
}
