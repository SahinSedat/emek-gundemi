import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { tr } from 'date-fns/locale'

/**
 * Türkçe tarih formatla
 */
export function formatDate(date: Date | string, formatStr: string = 'd MMMM yyyy'): string {
    const d = typeof date === 'string' ? parseISO(date) : date
    return format(d, formatStr, { locale: tr })
}

/**
 * "2 saat önce" gibi relatif tarih
 */
export function timeAgo(date: Date | string): string {
    const d = typeof date === 'string' ? parseISO(date) : date
    return formatDistanceToNow(d, { locale: tr, addSuffix: true })
}

/**
 * Slug oluştur
 */
export function slugify(text: string): string {
    const turkishMap: Record<string, string> = {
        'ç': 'c', 'Ç': 'C',
        'ğ': 'g', 'Ğ': 'G',
        'ı': 'i', 'İ': 'I',
        'ö': 'o', 'Ö': 'O',
        'ş': 's', 'Ş': 'S',
        'ü': 'u', 'Ü': 'U',
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
}

/**
 * Metni kısalt
 */
export function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength - 3) + '...'
}

/**
 * Maddeleri birleştir (sosyal medya için)
 */
export function formatBullets(items: string[], bulletChar: string = '•'): string {
    return items.map(item => `${bulletChar} ${item}`).join('\n')
}

/**
 * URL'nin geçerli olup olmadığını kontrol et
 */
export function isValidUrl(url: string): boolean {
    try {
        new URL(url)
        return true
    } catch {
        return false
    }
}

/**
 * Sosyal medya paylaşımı için içerik oluştur
 */
export function createSocialContent(
    template: string,
    data: { title: string; bullets: string[]; link: string }
): string {
    return template
        .replace('{title}', data.title)
        .replace('{bullets}', formatBullets(data.bullets))
        .replace('{link}', data.link)
}

/**
 * Haber URL'si oluştur
 */
export function getNewsUrl(slug: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    return `${baseUrl}/haber/${slug}`
}
