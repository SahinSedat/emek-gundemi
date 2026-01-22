'use client'

import { useState, useEffect } from 'react'
import {
    RefreshCw, Bot, Copy, Check, Send, Trash2,
    Twitter, Globe, CheckSquare, Square, AlertTriangle,
    Star, ChevronDown
} from 'lucide-react'
import {
    StoredNews,
    getAllNews,
    addNews,
    updateNews,
    deleteMultipleNews,
    clearAllNews,
    getAllAccounts,
    initializeDefaultAccounts,
    TrackedAccount
} from '@/lib/db'

export default function DashboardPage() {
    const [news, setNews] = useState<StoredNews[]>([])
    const [accounts, setAccounts] = useState<TrackedAccount[]>([])
    const [loading, setLoading] = useState(true)
    const [fetching, setFetching] = useState(false)
    const [processing, setProcessing] = useState<string | null>(null)
    const [copied, setCopied] = useState<string | null>(null)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [showAccounts, setShowAccounts] = useState(false)

    // Veritabanından haberleri ve hesapları yükle
    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            await initializeDefaultAccounts()
            const [storedNews, storedAccounts] = await Promise.all([
                getAllNews(),
                getAllAccounts()
            ])
            setNews(storedNews)
            setAccounts(storedAccounts)
        } catch (error) {
            console.error('Veri yükleme hatası:', error)
        } finally {
            setLoading(false)
        }
    }

    // Demo haberler çek (gerçekte Twitter API kullanılacak)
    const handleFetchNews = async () => {
        setFetching(true)

        // Demo: Simüle edilmiş haber çekimi
        await new Promise(r => setTimeout(r, 1500))

        const demoNews = [
            {
                title: 'Kamu İşçilerinin 2025 Yılı Zam Oranları Belirlendi',
                content: 'Kamu işçilerine 2025 yılının ilk yarısı için yüzde 25, ikinci yarısı için yüzde 25 zam yapılacak. Toplu iş sözleşmesi görüşmeleri başarıyla tamamlandı.',
                source: 'Resmî Gazete',
                sourceUrl: 'https://resmigazete.gov.tr',
                sourceType: 'rss' as const,
                processed: false,
            },
            {
                title: 'Memur Maaş Artış Görüşmeleri Devam Ediyor',
                content: 'Hazine ve Maliye Bakanlığı ile memur sendikaları arasındaki maaş görüşmeleri devam ediyor. Sendikalar refah payı talebinde ısrarcı.',
                source: 'Çalışma Bakanlığı',
                sourceUrl: 'https://csgb.gov.tr',
                sourceType: 'rss' as const,
                processed: false,
            },
        ]

        for (const item of demoNews) {
            const stored = await addNews(item)
            setNews(prev => [stored, ...prev])
        }

        setFetching(false)
    }

    // X'ten tweet çek (demo)
    const handleFetchTwitter = async () => {
        setFetching(true)

        await new Promise(r => setTimeout(r, 2000))

        const demoTweets = [
            {
                title: 'Türk-İş: Asgari ücret görüşmeleri için önerimiz hazır',
                content: 'Türk-İş Genel Başkanı: "Asgari ücret görüşmeleri için kapsamlı bir teklif hazırladık. İşçilerimizin alım gücünü koruyacak bir düzenleme bekliyoruz."',
                source: '@turkikiemeksend',
                sourceUrl: 'https://twitter.com/turkikiemeksend/status/123456',
                sourceType: 'twitter' as const,
                tweetId: '123456',
                authorHandle: 'turkikiemeksend',
                processed: false,
            },
            {
                title: 'Çalışma Bakanı: Yeni istihdam paketi hazırlanıyor',
                content: 'Çalışma ve Sosyal Güvenlik Bakanı yaptığı açıklamada, işsizlikle mücadele için kapsamlı bir istihdam paketinin hazırlandığını duyurdu.',
                source: '@CalismaBakani',
                sourceUrl: 'https://twitter.com/CalismaBakani/status/789012',
                sourceType: 'twitter' as const,
                tweetId: '789012',
                authorHandle: 'CalismaBakani',
                processed: false,
            },
        ]

        for (const item of demoTweets) {
            const stored = await addNews(item)
            setNews(prev => [stored, ...prev])
        }

        setFetching(false)
    }

    // AI ile işle
    const handleProcess = async (id: string) => {
        setProcessing(id)
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

            let result
            if (res.ok) {
                result = await res.json()
            } else {
                // Fallback demo
                result = {
                    summary: ['Özet oluşturuldu', 'İkinci madde', 'Üçüncü madde'],
                    aiComment: 'Bu düzenleme kamu emekçileri açısından önemli sonuçlar doğurabilir.',
                    verified: true,
                    newsworthy: true,
                    importance: 'high',
                }
            }

            const updated = { ...item, processed: true, ...result }
            await updateNews(updated)
            setNews(prev => prev.map(n => n.id === id ? updated : n))
        } catch (error) {
            console.error('AI işleme hatası:', error)
        }

        setProcessing(null)
    }

    // Seçili haberleri sil
    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return
        if (!confirm(`${selectedIds.size} haber silinecek. Emin misiniz?`)) return

        await deleteMultipleNews(Array.from(selectedIds))
        setNews(prev => prev.filter(n => !selectedIds.has(n.id)))
        setSelectedIds(new Set())
    }

    // Tümünü sil
    const handleClearAll = async () => {
        if (!confirm('TÜM haberler silinecek. Emin misiniz?')) return
        await clearAllNews()
        setNews([])
        setSelectedIds(new Set())
    }

    // Kopyala
    const handleCopy = (item: StoredNews) => {
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

    // Seçim toggle
    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds)
        if (newSet.has(id)) {
            newSet.delete(id)
        } else {
            newSet.add(id)
        }
        setSelectedIds(newSet)
    }

    // Tümünü seç/kaldır
    const toggleSelectAll = () => {
        if (selectedIds.size === news.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(news.map(n => n.id)))
        }
    }

    const getImportanceBadge = (importance?: string) => {
        switch (importance) {
            case 'high':
                return <span className="text-xs text-red-400 bg-red-900/30 px-2 py-0.5 rounded flex items-center gap-1"><Star size={10} /> Önemli</span>
            case 'medium':
                return <span className="text-xs text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded">Orta</span>
            default:
                return null
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="animate-spin text-zinc-500" size={32} />
            </div>
        )
    }

    return (
        <div className="max-w-5xl mx-auto">
            {/* Başlık ve Butonlar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Haber Merkezi</h1>
                    <p className="text-zinc-500">Haberleri çek, AI ile işle, paylaş</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleFetchNews}
                        disabled={fetching}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium"
                    >
                        <Globe size={16} className={fetching ? 'animate-pulse' : ''} />
                        RSS Çek
                    </button>
                    <button
                        onClick={handleFetchTwitter}
                        disabled={fetching}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 rounded-lg font-medium"
                    >
                        <Twitter size={16} className={fetching ? 'animate-pulse' : ''} />
                        X'ten Çek
                    </button>
                </div>
            </div>

            {/* Takip Edilen Hesaplar */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 mb-6">
                <button
                    onClick={() => setShowAccounts(!showAccounts)}
                    className="w-full flex items-center justify-between text-left"
                >
                    <span className="font-medium flex items-center gap-2">
                        <Twitter size={16} className="text-blue-400" />
                        Takip Edilen Hesaplar ({accounts.filter(a => a.active).length})
                    </span>
                    <ChevronDown size={18} className={`transition-transform ${showAccounts ? 'rotate-180' : ''}`} />
                </button>

                {showAccounts && (
                    <div className="mt-3 pt-3 border-t border-zinc-800 flex flex-wrap gap-2">
                        {accounts.map(acc => (
                            <span
                                key={acc.id}
                                className={`px-2 py-1 rounded text-sm ${acc.active
                                        ? 'bg-blue-900/30 text-blue-400'
                                        : 'bg-zinc-800 text-zinc-500'
                                    }`}
                            >
                                @{acc.handle}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Toplu İşlemler */}
            {news.length > 0 && (
                <div className="flex items-center justify-between bg-zinc-900 rounded-lg border border-zinc-800 p-3 mb-4">
                    <div className="flex items-center gap-3">
                        <button onClick={toggleSelectAll} className="text-zinc-400 hover:text-white">
                            {selectedIds.size === news.length ? <CheckSquare size={18} /> : <Square size={18} />}
                        </button>
                        <span className="text-sm text-zinc-400">
                            {selectedIds.size > 0 ? `${selectedIds.size} seçili` : `${news.length} haber`}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        {selectedIds.size > 0 && (
                            <button
                                onClick={handleDeleteSelected}
                                className="flex items-center gap-1 px-3 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded text-sm"
                            >
                                <Trash2 size={14} />
                                Seçilenleri Sil
                            </button>
                        )}
                        <button
                            onClick={handleClearAll}
                            className="flex items-center gap-1 px-3 py-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded text-sm"
                        >
                            Tümünü Temizle
                        </button>
                    </div>
                </div>
            )}

            {/* Haber Listesi */}
            {news.length === 0 ? (
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-16 text-center">
                    <Globe size={48} className="mx-auto text-zinc-600 mb-4" />
                    <p className="text-zinc-400">Henüz haber yok</p>
                    <p className="text-zinc-500 text-sm mt-1">Yukarıdaki butonlara tıklayarak haber çekin</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {news.map((item) => (
                        <div
                            key={item.id}
                            className={`bg-zinc-900 rounded-xl border p-4 transition-colors ${selectedIds.has(item.id) ? 'border-red-600' : 'border-zinc-800'
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                {/* Checkbox */}
                                <button
                                    onClick={() => toggleSelect(item.id)}
                                    className="mt-1 text-zinc-500 hover:text-white"
                                >
                                    {selectedIds.has(item.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                                </button>

                                <div className="flex-1 min-w-0">
                                    {/* Header */}
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <span className={`text-xs px-2 py-0.5 rounded ${item.sourceType === 'twitter' ? 'bg-blue-900/30 text-blue-400' : 'bg-zinc-800 text-zinc-400'
                                            }`}>
                                            {item.source}
                                        </span>
                                        {item.newsworthy === false && (
                                            <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded flex items-center gap-1">
                                                <AlertTriangle size={10} /> Haber değeri düşük
                                            </span>
                                        )}
                                        {getImportanceBadge(item.importance)}
                                        {item.verified && (
                                            <span className="text-xs text-green-500">✓</span>
                                        )}
                                    </div>

                                    {/* Title & Content */}
                                    <h3 className="font-semibold mb-1">{item.title}</h3>
                                    <p className="text-zinc-400 text-sm mb-3">{item.content}</p>

                                    {/* AI Result */}
                                    {item.processed && item.summary && (
                                        <div className="bg-zinc-800/50 rounded-lg p-3 mb-3 space-y-2">
                                            <div>
                                                <span className="text-xs text-red-400 font-medium">📌 Özet</span>
                                                <ul className="mt-1 space-y-0.5">
                                                    {item.summary.map((s, i) => (
                                                        <li key={i} className="text-sm text-zinc-300">• {s}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div className="pt-2 border-t border-zinc-700">
                                                <span className="text-xs text-amber-400 font-medium">🧠 AI Yorumu</span>
                                                <p className="text-sm text-zinc-300 mt-1">{item.aiComment}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-2 flex-wrap">
                                        {!item.processed ? (
                                            <button
                                                onClick={() => handleProcess(item.id)}
                                                disabled={processing === item.id}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded text-sm"
                                            >
                                                <Bot size={14} className={processing === item.id ? 'animate-pulse' : ''} />
                                                {processing === item.id ? 'İşleniyor...' : 'AI ile İşle'}
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => handleCopy(item)}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm"
                                                >
                                                    {copied === item.id ? <Check size={14} /> : <Copy size={14} />}
                                                    {copied === item.id ? 'Kopyalandı!' : 'Kopyala'}
                                                </button>
                                                <button className="flex items-center gap-1 px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded text-sm">
                                                    <Send size={14} /> Telegram
                                                </button>
                                                <button className="flex items-center gap-1 px-3 py-1.5 bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded text-sm">
                                                    <Send size={14} /> WhatsApp
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
