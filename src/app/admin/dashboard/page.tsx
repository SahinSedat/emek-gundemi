'use client'

import { useState, useEffect } from 'react'
import {
    RefreshCw, Bot, Copy, Check, Send, Trash2,
    Twitter, Globe, CheckSquare, Square, Star,
    ChevronDown, Plus, X, ExternalLink, Clock,
    Filter, Settings2
} from 'lucide-react'
import {
    StoredNews,
    getAllNews,
    addNews,
    updateNews,
    deleteMultipleNews,
    clearAllNews,
    getAllAccounts,
    addAccount,
    deleteAccount,
    TrackedAccount
} from '@/lib/db'

type TabType = 'news' | 'accounts' | 'settings'

export default function DashboardPage() {
    const [news, setNews] = useState<StoredNews[]>([])
    const [accounts, setAccounts] = useState<TrackedAccount[]>([])
    const [loading, setLoading] = useState(true)
    const [fetching, setFetching] = useState(false)
    const [processing, setProcessing] = useState<string | null>(null)
    const [copied, setCopied] = useState<string | null>(null)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [activeTab, setActiveTab] = useState<TabType>('news')
    const [newAccountHandle, setNewAccountHandle] = useState('')
    const [filterType, setFilterType] = useState<string>('all')

    // Veritabanından haberleri ve hesapları yükle
    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
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

    // Duplicate kontrolü
    const isDuplicate = (title: string, sourceUrl: string): boolean => {
        return news.some(n =>
            n.title === title ||
            n.sourceUrl === sourceUrl ||
            (n.tweetId && sourceUrl.includes(n.tweetId))
        )
    }

    // Son 1 hafta kontrolü
    const isWithinLastWeek = (dateStr: string): boolean => {
        const date = new Date(dateStr)
        const oneWeekAgo = new Date()
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
        return date >= oneWeekAgo
    }

    // X hesabı ekle
    const handleAddAccount = async () => {
        if (!newAccountHandle.trim()) return
        const handle = newAccountHandle.replace('@', '').trim()

        try {
            const acc = await addAccount({
                handle,
                name: handle,
                type: 'diger',
                active: true
            })
            setAccounts(prev => [...prev, acc])
            setNewAccountHandle('')
        } catch (error) {
            console.error('Hesap ekleme hatası:', error)
            alert('Bu hesap zaten ekli!')
        }
    }

    // X hesabı sil
    const handleDeleteAccount = async (id: string) => {
        await deleteAccount(id)
        setAccounts(prev => prev.filter(a => a.id !== id))
    }

    // Demo: X'ten çek (gerçekte API kullanılacak)
    const handleFetchTwitter = async () => {
        if (accounts.length === 0) {
            alert('Önce takip edilecek hesap ekleyin!')
            setActiveTab('accounts')
            return
        }

        setFetching(true)

        // Her hesap için son 5 post çek (demo)
        for (const acc of accounts.filter(a => a.active)) {
            await new Promise(r => setTimeout(r, 500))

            const demoTweets = [
                {
                    title: `${acc.name}: Son dakika gelişmesi!`,
                    content: `@${acc.handle} hesabından yapılan açıklama: "Kamu emekçilerini ilgilendiren önemli bir gelişme yaşandı. Detaylar için takipte kalın."`,
                    source: `@${acc.handle}`,
                    sourceUrl: `https://twitter.com/${acc.handle}/status/${Date.now()}`,
                    sourceType: 'twitter' as const,
                    tweetId: Date.now().toString(),
                    authorHandle: acc.handle,
                    processed: false,
                }
            ]

            for (const tweet of demoTweets) {
                // Duplicate kontrolü
                if (!isDuplicate(tweet.title, tweet.sourceUrl)) {
                    const stored = await addNews(tweet)
                    setNews(prev => [stored, ...prev])
                }
            }
        }

        setFetching(false)
    }

    // Demo: RSS/Web'den çek
    const handleFetchWeb = async () => {
        setFetching(true)
        await new Promise(r => setTimeout(r, 1500))

        const demoNews = [
            {
                title: 'Resmî Gazete\'de Yeni Karar Yayımlandı',
                content: 'Cumhurbaşkanlığı Kararnamesi ile kamu çalışanlarını ilgilendiren yeni düzenleme yürürlüğe girdi. Karara göre 2025 yılı için belirlenen katsayılar güncellendi.',
                source: 'Resmî Gazete',
                sourceUrl: `https://resmigazete.gov.tr/eskiler/2025/01/${Date.now()}.htm`,
                sourceType: 'rss' as const,
                processed: false,
            },
            {
                title: 'Çalışma Bakanlığı Açıklama Yaptı',
                content: 'Çalışma ve Sosyal Güvenlik Bakanlığı, 2025 yılı asgari ücret desteği uygulamasına ilişkin detayları açıkladı.',
                source: 'ÇSGB',
                sourceUrl: `https://csgb.gov.tr/haberler/${Date.now()}`,
                sourceType: 'rss' as const,
                processed: false,
            },
        ]

        for (const item of demoNews) {
            if (!isDuplicate(item.title, item.sourceUrl)) {
                const stored = await addNews(item)
                setNews(prev => [stored, ...prev])
            }
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
                result = {
                    summary: ['Özet 1', 'Özet 2', 'Özet 3'],
                    aiComment: 'Bu haber kamu emekçileri açısından dikkate değer.',
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
        const text = `🔴 ${item.title}

${item.summary?.map(s => `• ${s}`).join('\n') || item.content}

${item.aiComment ? `🧠 AI Yorumu:\n${item.aiComment}\n\n` : ''}📰 Kaynak: ${item.source}
🔗 ${item.sourceUrl}

#EmekGündemi #KamuHaber`

        navigator.clipboard.writeText(text)
        setCopied(item.id)
        setTimeout(() => setCopied(null), 2000)
    }

    // Seçim toggle
    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds)
        if (newSet.has(id)) newSet.delete(id)
        else newSet.add(id)
        setSelectedIds(newSet)
    }

    // Tümünü seç
    const toggleSelectAll = () => {
        if (selectedIds.size === filteredNews.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(filteredNews.map(n => n.id)))
        }
    }

    // Filtrelenmiş haberler
    const filteredNews = news.filter(n => {
        if (filterType === 'all') return true
        if (filterType === 'twitter') return n.sourceType === 'twitter'
        if (filterType === 'rss') return n.sourceType === 'rss'
        if (filterType === 'processed') return n.processed
        if (filterType === 'unprocessed') return !n.processed
        return true
    })

    // Zaman formatı
    const formatTime = (timestamp: number) => {
        const diff = Date.now() - timestamp
        const mins = Math.floor(diff / 60000)
        const hours = Math.floor(diff / 3600000)
        const days = Math.floor(diff / 86400000)

        if (mins < 60) return `${mins} dk önce`
        if (hours < 24) return `${hours} saat önce`
        return `${days} gün önce`
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="animate-spin text-zinc-500" size={32} />
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto">
            {/* Tab Navigation */}
            <div className="flex gap-1 mb-6 bg-zinc-900 p-1 rounded-lg w-fit">
                <button
                    onClick={() => setActiveTab('news')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'news' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'
                        }`}
                >
                    📰 Haberler ({news.length})
                </button>
                <button
                    onClick={() => setActiveTab('accounts')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'accounts' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'
                        }`}
                >
                    <Twitter size={14} className="inline mr-1" />
                    X Hesapları ({accounts.length})
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'
                        }`}
                >
                    <Settings2 size={14} className="inline mr-1" />
                    Ayarlar
                </button>
            </div>

            {/* === HABERLER TAB === */}
            {activeTab === 'news' && (
                <>
                    {/* Başlık ve Butonlar */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        <div>
                            <h1 className="text-2xl font-bold">Haber Merkezi</h1>
                            <p className="text-zinc-500 text-sm">Son 7 gün • Duplicate haberleri otomatik filtreler</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleFetchWeb}
                                disabled={fetching}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium"
                            >
                                <Globe size={16} className={fetching ? 'animate-pulse' : ''} />
                                Web/RSS
                            </button>
                            <button
                                onClick={handleFetchTwitter}
                                disabled={fetching}
                                className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 rounded-lg text-sm font-medium"
                            >
                                <Twitter size={16} className={fetching ? 'animate-pulse' : ''} />
                                X Çek ({accounts.filter(a => a.active).length})
                            </button>
                        </div>
                    </div>

                    {/* Filtreler ve Toplu İşlemler */}
                    <div className="flex items-center justify-between bg-zinc-900 rounded-lg border border-zinc-800 p-3 mb-4">
                        <div className="flex items-center gap-4">
                            <button onClick={toggleSelectAll} className="text-zinc-400 hover:text-white">
                                {selectedIds.size === filteredNews.length && filteredNews.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
                            </button>

                            <div className="flex items-center gap-2">
                                <Filter size={14} className="text-zinc-500" />
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm"
                                >
                                    <option value="all">Tümü</option>
                                    <option value="twitter">X/Twitter</option>
                                    <option value="rss">Web/RSS</option>
                                    <option value="processed">İşlenmiş</option>
                                    <option value="unprocessed">İşlenmemiş</option>
                                </select>
                            </div>

                            <span className="text-sm text-zinc-500">
                                {selectedIds.size > 0 ? `${selectedIds.size} seçili` : `${filteredNews.length} haber`}
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
                            {news.length > 0 && (
                                <button
                                    onClick={handleClearAll}
                                    className="flex items-center gap-1 px-3 py-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded text-sm"
                                >
                                    Tümünü Temizle
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Haber Listesi */}
                    {filteredNews.length === 0 ? (
                        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-16 text-center">
                            <Globe size={48} className="mx-auto text-zinc-600 mb-4" />
                            <p className="text-zinc-400">Henüz haber yok</p>
                            <p className="text-zinc-500 text-sm mt-1">Yukarıdaki butonlarla haber çekebilirsiniz</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredNews.map((item) => (
                                <div
                                    key={item.id}
                                    className={`bg-zinc-900 rounded-xl border p-4 transition-colors ${selectedIds.has(item.id) ? 'border-red-600' : 'border-zinc-800'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <button onClick={() => toggleSelect(item.id)} className="mt-1 text-zinc-500 hover:text-white">
                                            {selectedIds.has(item.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                                        </button>

                                        <div className="flex-1 min-w-0">
                                            {/* Header */}
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                <span className={`text-xs px-2 py-0.5 rounded ${item.sourceType === 'twitter' ? 'bg-blue-900/30 text-blue-400' : 'bg-green-900/30 text-green-400'
                                                    }`}>
                                                    {item.sourceType === 'twitter' ? <Twitter size={10} className="inline mr-1" /> : <Globe size={10} className="inline mr-1" />}
                                                    {item.source}
                                                </span>
                                                {item.importance === 'high' && (
                                                    <span className="text-xs text-red-400 bg-red-900/30 px-2 py-0.5 rounded flex items-center gap-1">
                                                        <Star size={10} /> Önemli
                                                    </span>
                                                )}
                                                <span className="text-xs text-zinc-500 flex items-center gap-1">
                                                    <Clock size={10} /> {formatTime(item.createdAt)}
                                                </span>
                                                <a
                                                    href={item.sourceUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-zinc-500 hover:text-blue-400 flex items-center gap-1"
                                                >
                                                    <ExternalLink size={10} /> Kaynak
                                                </a>
                                            </div>

                                            {/* Content */}
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
                                                    {item.aiComment && (
                                                        <div className="pt-2 border-t border-zinc-700">
                                                            <span className="text-xs text-amber-400 font-medium">🧠 AI Yorumu</span>
                                                            <p className="text-sm text-zinc-300 mt-1">{item.aiComment}</p>
                                                        </div>
                                                    )}
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
                </>
            )}

            {/* === X HESAPLARI TAB === */}
            {activeTab === 'accounts' && (
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-2xl font-bold">X Hesapları</h1>
                            <p className="text-zinc-500 text-sm">Takip edilecek hesapları yönetin</p>
                        </div>
                    </div>

                    {/* Hesap Ekle */}
                    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 mb-6">
                        <h2 className="font-medium mb-3">Yeni Hesap Ekle</h2>
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">@</span>
                                <input
                                    type="text"
                                    value={newAccountHandle}
                                    onChange={(e) => setNewAccountHandle(e.target.value)}
                                    placeholder="kullanici_adi"
                                    className="w-full pl-8 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddAccount()}
                                />
                            </div>
                            <button
                                onClick={handleAddAccount}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium"
                            >
                                <Plus size={16} />
                                Ekle
                            </button>
                        </div>
                        <p className="text-xs text-zinc-500 mt-2">
                            Örnek hesaplar: CalismaBakani, turkikiemeksend, memaborumsen
                        </p>
                    </div>

                    {/* Hesap Listesi */}
                    {accounts.length === 0 ? (
                        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
                            <Twitter size={48} className="mx-auto text-zinc-600 mb-4" />
                            <p className="text-zinc-400">Henüz hesap eklenmemiş</p>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 gap-3">
                            {accounts.map((acc) => (
                                <div
                                    key={acc.id}
                                    className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-600/20 rounded-full flex items-center justify-center">
                                            <Twitter size={20} className="text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="font-medium">@{acc.handle}</p>
                                            <p className="text-xs text-zinc-500">{acc.type}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <a
                                            href={`https://twitter.com/${acc.handle}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg"
                                        >
                                            <ExternalLink size={16} />
                                        </a>
                                        <button
                                            onClick={() => handleDeleteAccount(acc.id)}
                                            className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* === AYARLAR TAB === */}
            {activeTab === 'settings' && (
                <div className="max-w-2xl">
                    <h1 className="text-2xl font-bold mb-6">Ayarlar</h1>

                    <div className="space-y-4">
                        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
                            <h2 className="font-medium mb-3">API Anahtarları</h2>
                            <p className="text-sm text-zinc-500 mb-4">
                                X API ve Telegram için ayarları yapılandırın.
                            </p>
                            <a
                                href="/admin/settings"
                                className="text-sm text-red-400 hover:underline"
                            >
                                Ayarlar sayfasına git →
                            </a>
                        </div>

                        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
                            <h2 className="font-medium mb-3">Veri Yönetimi</h2>
                            <p className="text-sm text-zinc-500 mb-4">
                                Tüm verileri tarayıcıdan temizleyin.
                            </p>
                            <button
                                onClick={handleClearAll}
                                className="px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg text-sm"
                            >
                                Tüm Haberleri Sil
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
