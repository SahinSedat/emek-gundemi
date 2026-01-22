/**
 * AI Haber İşlemci - OpenAI (ChatGPT) Entegrasyonu
 * Haberleri özetler, doğrular, yorum ekler ve haber değeri analizi yapar
 */

export interface AIProcessResult {
    summary: string[]
    aiComment: string
    verified: boolean
    newsworthy: boolean
    importance: 'low' | 'medium' | 'high'
    category: string
    tags: string[]
}

interface NewsInput {
    title: string
    content: string
    source: string
    sourceUrl: string
}

/**
 * Haberi/Tweet'i OpenAI ile işle
 */
export async function processNewsWithAI(news: NewsInput): Promise<AIProcessResult> {
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
        console.warn('OPENAI_API_KEY not set, using fallback')
        return fallbackProcess(news)
    }

    const prompt = `Sen Türkiye'de emek ve kamu dünyasını takip eden bir haber analisti yapay zekasın.

Aşağıdaki içeriği analiz et:

BAŞLIK/İÇERİK: ${news.title}
DETAY: ${news.content}
KAYNAK: ${news.source}

Şu formatta JSON yanıt ver:
{
  "newsworthy": true veya false (Bu içerik haber değeri taşıyor mu? Kamu emekçilerini, işçileri, memurları, sendikaları ilgilendiriyor mu?),
  "importance": "low" veya "medium" veya "high" (önem derecesi),
  "summary": ["Madde 1", "Madde 2", "Madde 3"] (3-5 maddelik özet, haber değeri varsa),
  "aiComment": "Kısa ve öz yorum. Kimin lehine/aleyhine, pratik sonuçları." (haber değeri varsa),
  "verified": true veya false (kaynak güvenilir mi?),
  "category": "kamu-iscisi" veya "memur" veya "ozel-sektor" veya "sendika" veya "ekonomi" veya "resmi-gazete" veya "tbmm" veya "yargi" veya "diger",
  "tags": ["etiket1", "etiket2"]
}

Kurallar:
- Haber değeri yoksa newsworthy: false yap, summary ve aiComment boş bırak
- Sıradan paylaşımlar, kişisel yorumlar haber değeri taşımaz
- Resmi açıklamalar, kararlar, zam/maaş haberleri, TİS, sendika açıklamaları haber değeri taşır
- Tarafsız ol, abartı yapma`

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'Sen Türkiye emek ve kamu dünyası uzmanı bir haber analistisin. JSON formatında yanıt ver.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 1000,
                response_format: { type: 'json_object' }
            }),
        })

        if (!response.ok) {
            const error = await response.json()
            console.error('OpenAI API error:', error)
            return fallbackProcess(news)
        }

        const data = await response.json()
        const content = data.choices?.[0]?.message?.content

        if (!content) {
            return fallbackProcess(news)
        }

        const result = JSON.parse(content)

        return {
            summary: result.summary || [],
            aiComment: result.aiComment || '',
            verified: result.verified ?? true,
            newsworthy: result.newsworthy ?? true,
            importance: result.importance || 'medium',
            category: result.category || 'diger',
            tags: result.tags || [],
        }
    } catch (error) {
        console.error('AI processing error:', error)
        return fallbackProcess(news)
    }
}

/**
 * AI olmadan basit işleme (fallback)
 */
function fallbackProcess(news: NewsInput): AIProcessResult {
    const sentences = news.content
        .split(/[.!?]/)
        .map(s => s.trim())
        .filter(s => s.length > 20 && s.length < 200)
        .slice(0, 3)

    return {
        summary: sentences.length > 0 ? sentences : [news.title],
        aiComment: 'AI analizi yapılamadı.',
        verified: false,
        newsworthy: true,
        importance: 'medium',
        category: 'diger',
        tags: [],
    }
}

/**
 * Paylaşım formatı oluştur
 */
export function formatForSharing(
    title: string,
    summary: string[],
    aiComment: string,
    source: string
): string {
    const bullets = summary.map(s => `• ${s}`).join('\n')

    return `🔴 ${title}

${bullets}

🧠 AI Yorumu:
${aiComment}

📰 Kaynak: ${source}

#EmekGündemi #KamuHaber`
}
