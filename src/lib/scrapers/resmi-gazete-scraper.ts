/**
 * Resmî Gazete Scraper
 * Resmî Gazete'den kanun, yönetmelik ve CB kararlarını çeker
 */

import * as cheerio from 'cheerio'

export interface ResmiGazeteItem {
    title: string
    type: 'kanun' | 'yonetmelik' | 'cb-karari' | 'teblig' | 'diger'
    date: Date
    link: string
    summary: string
    content?: string
}

const RESMI_GAZETE_URL = 'https://www.resmigazete.gov.tr'

/**
 * Günün Resmî Gazete içeriklerini çek
 */
export async function fetchTodaysResmiGazete(): Promise<ResmiGazeteItem[]> {
    try {
        const response = await fetch(`${RESMI_GAZETE_URL}/default.aspx`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; EmekGundemiBot/1.0)',
            },
        })

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`)
        }

        const html = await response.text()
        return parseResmiGazetePage(html)
    } catch (error) {
        console.error('Resmî Gazete fetch error:', error)
        return []
    }
}

/**
 * Belirli bir tarihin içeriklerini çek
 */
export async function fetchResmiGazeteByDate(date: Date): Promise<ResmiGazeteItem[]> {
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()

    try {
        const response = await fetch(
            `${RESMI_GAZETE_URL}/eskiler/${year}/${month}/${year}${month}${day}.htm`,
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; EmekGundemiBot/1.0)',
                },
            }
        )

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`)
        }

        const html = await response.text()
        return parseResmiGazetePage(html, date)
    } catch (error) {
        console.error(`Resmî Gazete fetch error for ${date.toISOString()}:`, error)
        return []
    }
}

/**
 * Resmî Gazete HTML sayfasını parse et
 */
function parseResmiGazetePage(html: string, date: Date = new Date()): ResmiGazeteItem[] {
    const $ = cheerio.load(html)
    const items: ResmiGazeteItem[] = []

    // Emek ve kamu ile ilgili anahtar kelimeler
    const relevantKeywords = [
        'işçi', 'memur', 'kamu', 'personel', 'maaş', 'zam', 'ücret',
        'sendika', 'toplu iş sözleşmesi', 'tis', 'kıdem', 'ihbar',
        'emekli', 'sgk', 'sigorta', 'çalışma', 'istihdam', 'asgari ücret',
        'disiplin', 'atama', 'nakil', 'terfi', 'özlük', 'ikramiye',
    ]

    // Tüm maddeleri kontrol et
    $('a[href*=".htm"]').each((_, el) => {
        const $el = $(el)
        const title = $el.text().trim()
        const href = $el.attr('href') || ''

        if (!title || title.length < 10) return

        // İlgili olup olmadığını kontrol et
        const titleLower = title.toLowerCase()
        const isRelevant = relevantKeywords.some(kw => titleLower.includes(kw))

        if (!isRelevant) return

        // Tip belirle
        let type: ResmiGazeteItem['type'] = 'diger'
        if (titleLower.includes('kanun')) type = 'kanun'
        else if (titleLower.includes('yönetmelik')) type = 'yonetmelik'
        else if (titleLower.includes('cumhurbaşkan') || titleLower.includes('karar')) type = 'cb-karari'
        else if (titleLower.includes('tebliğ')) type = 'teblig'

        const fullLink = href.startsWith('http') ? href : `${RESMI_GAZETE_URL}/${href}`

        items.push({
            title: cleanTitle(title),
            type,
            date,
            link: fullLink,
            summary: title,
        })
    })

    return items
}

/**
 * Başlığı temizle
 */
function cleanTitle(title: string): string {
    return title
        .replace(/\s+/g, ' ')
        .replace(/^\d+[\.\-\)]\s*/, '') // Numaraları kaldır
        .trim()
}

/**
 * Detay sayfasından içerik çek
 */
export async function fetchResmiGazeteContent(url: string): Promise<string> {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; EmekGundemiBot/1.0)',
            },
        })

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`)
        }

        const html = await response.text()
        const $ = cheerio.load(html)

        // Ana içerik alanını bul
        const content = $('body').text()
            .replace(/\s+/g, ' ')
            .trim()

        return content.slice(0, 5000) // Max 5000 karakter
    } catch (error) {
        console.error('Content fetch error:', error)
        return ''
    }
}

/**
 * Emek ve kamu ile ilgili güncel içerikleri filtrele
 */
export function filterRelevantContent(items: ResmiGazeteItem[]): ResmiGazeteItem[] {
    const highPriorityKeywords = [
        'kamu işçi', 'memur maaş', 'asgari ücret', 'toplu sözleşme',
        'kıdem tazminat', 'sgk', 'emekli', 'personel alım',
    ]

    return items.sort((a, b) => {
        const aScore = highPriorityKeywords.filter(kw =>
            a.title.toLowerCase().includes(kw)
        ).length
        const bScore = highPriorityKeywords.filter(kw =>
            b.title.toLowerCase().includes(kw)
        ).length
        return bScore - aScore
    })
}
