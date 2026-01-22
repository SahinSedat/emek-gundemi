'use client'

import { useState } from 'react'
import { RefreshCw, Bot, Copy, Check, AlertCircle, Send } from 'lucide-react'

interface NewsItem {
    id: string
    title: string
    content: string
    source: string
    sourceUrl: string
    processed: boolean
    summary?: string[]
    aiComment?: string
    verified?: boolean
}

export default function DashboardPage() {
    const [fetching, setFetching] = useState(false)
    const [processing, setProcessing] = useState<string | null>(null)
    const [copied, setCopied] = useState<string | null>(null)
    const [news, setNews] = useState<NewsItem[]>([])

    // Haberleri çek
    const handleFetch = async () => {
        setFetching(true)

        // Demo: API'den haber çekimi simülasyonu
        await new Promise(r => setTimeout(r, 2000))

        setNews([
            {
                id: '1',
                title: 'Kamu İşçilerinin 2025 Yılı Zam Oranları Belirlendi',
                content: 'Kamu işçilerine 2025 yılının ilk yarısı için yüzde 25, ikinci yarısı için yüzde 25 zam yapılacak. Toplu iş sözleşmesi görüşmeleri başarıyla tamamlandı. Refah payı da artışa dahil edildi.',
                source: 'Resmî Gazete',
                sourceUrl: 'https://resmigazete.gov.tr',
                processed: false,
            },
            {
                id: '2',
                title: 'Memur Maaş Artış Görüşmeleri Devam Ediyor',
                content: 'Hazine ve Maliye Bakanlığı ile memur sendikaları arasındaki maaş görüşmeleri devam ediyor. Sendikalar refah payı talebinde ısrarcı.',
                source: 'Çalışma Bakanlığı',
                sourceUrl: 'https://csgb.gov.tr',
                processed: false,
            },
            {
                id: '3',
                title: 'TBMM\'de İş Kanunu Değişikliği Görüşülecek',
                content: 'İş Kanunu\'nda yapılacak değişiklikler yarın TBMM Plan ve Bütçe Komisyonu\'nda görüşülecek. Kıdem tazminatı düzenlemesi gündemde.',
                source: 'TBMM',
                sourceUrl: 'https://tbmm.gov.tr',
                processed: false,
            },
        ])

        setFetching(false)
    }

    // AI ile işle
    const handleProcess = async (id: string) => {
        setProcessing(id)

        // API çağrısı
        const item = news.find(n => n.id === id)
        if (!item) return

        try {
            const res = await fetch('/api/ai/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: item.title,
                    content: item.content,
                    source: item.source,
                    sourceUrl: item.sourceUrl,
                }),
            })

            if (res.ok) {
                const result = await res.json()
                setNews(prev => prev.map(n =>
                    n.id === id ? { ...n, processed: true, ...result } : n
                ))
            } else {
                // Fallback demo
                await new Promise(r => setTimeout(r, 2000))
                setNews(prev => prev.map(n =>
                    n.id === id ? {
                        ...n,
                        processed: true,
                        summary: [
                            'Kamu işçilerine yüzde 25+25 zam uygulanacak',
                            'TİS görüşmeleri başarıyla tamamlandı',
                            'Yeni ücretler Ocak\'tan itibaren geçerli',
                        ],
                        aiComment: 'Bu düzenleme yaklaşık 500.000 kamu işçisinin lehine. Enflasyon oranına yakın bir artış sağlanmış olsa da, reel gelir kaybı riski devam ediyor.',
                        verified: true,
                    } : n
                ))
            }
        } catch {
            // Demo fallback
            await new Promise(r => setTimeout(r, 2000))
            setNews(prev => prev.map(n =>
                n.id === id ? {
                    ...n,
                    processed: true,
                    summary: ['Özet oluşturulamadı'],
                    aiComment: 'API bağlantısı kurulamadı.',
                    verified: false,
                } : n
            ))
        }

        setProcessing(null)
    }

    // Paylaşım metnini kopyala
    const handleCopy = (item: NewsItem) => {
        if (!item.summary || !item.aiComment) return

        const text = `🔴 ${item.title}

${item.summary.map(s => `• ${s}`).join('\n')}

🧠 AI Yorumu:
${item.aiComment}

📰 Kaynak: ${item.source}

#EmekGündemi #KamuHaber`

        navigator.clipboard.writeText(text)
        setCopied(item.id)
        setTimeout(() => setCopied(null), 2000)
    }

    return (
        <div className="max-w-4xl mx-auto">
            {/* Başlık ve Çek Butonu */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold">Haber Merkezi</h1>
                    <p className="text-zinc-500">Haberleri çek, AI ile işle, paylaş</p>
                </div>
                <button
                    onClick={handleFetch}
                    disabled={fetching}
                    className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg font-medium"
                >
                    <RefreshCw size={18} className={fetching ? 'animate-spin' : ''} />
                    {fetching ? 'Çekiliyor...' : 'Haberleri Çek'}
                </button>
            </div>

            {/* Haber Listesi */}
            {news.length === 0 ? (
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-16 text-center">
                    <RefreshCw size={48} className="mx-auto text-zinc-600 mb-4" />
                    <p className="text-zinc-400">Henüz haber yok</p>
                    <p className="text-zinc-500 text-sm mt-1">Yukarıdaki butona tıklayarak başlayın</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {news.map((item) => (
                        <div key={item.id} className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
                            {/* Başlık */}
                            <div className="flex items-start justify-between gap-4 mb-3">
                                <div>
                                    <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded mr-2">
                                        {item.source}
                                    </span>
                                    {item.verified && (
                                        <span className="text-xs text-green-500 bg-green-900/30 px-2 py-0.5 rounded">
                                            ✓ Doğrulandı
                                        </span>
                                    )}
                                </div>
                                <a href={item.sourceUrl} target="_blank" className="text-xs text-zinc-500 hover:text-white">
                                    Kaynak →
                                </a>
                            </div>

                            <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                            <p className="text-zinc-400 text-sm mb-4">{item.content}</p>

                            {/* İşlenmiş İçerik */}
                            {item.processed && item.summary && (
                                <div className="bg-zinc-800/50 rounded-lg p-4 mb-4 space-y-4">
                                    {/* Özet */}
                                    <div>
                                        <h4 className="text-sm font-medium text-red-400 mb-2">📌 Özet</h4>
                                        <ul className="space-y-1">
                                            {item.summary.map((s, i) => (
                                                <li key={i} className="text-sm text-zinc-300 flex gap-2">
                                                    <span className="text-red-500">•</span>
                                                    {s}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* AI Yorumu */}
                                    <div className="pt-3 border-t border-zinc-700">
                                        <h4 className="text-sm font-medium text-amber-400 mb-2">🧠 AI Yorumu</h4>
                                        <p className="text-sm text-zinc-300">{item.aiComment}</p>
                                    </div>
                                </div>
                            )}

                            {/* Butonlar */}
                            <div className="flex gap-3">
                                {!item.processed ? (
                                    <button
                                        onClick={() => handleProcess(item.id)}
                                        disabled={processing === item.id}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium"
                                    >
                                        <Bot size={16} className={processing === item.id ? 'animate-pulse' : ''} />
                                        {processing === item.id ? 'İşleniyor...' : 'AI ile İşle'}
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => handleCopy(item)}
                                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium"
                                        >
                                            {copied === item.id ? <Check size={16} /> : <Copy size={16} />}
                                            {copied === item.id ? 'Kopyalandı!' : 'Kopyala'}
                                        </button>
                                        <button className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm font-medium">
                                            <Send size={16} />
                                            Telegram
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
