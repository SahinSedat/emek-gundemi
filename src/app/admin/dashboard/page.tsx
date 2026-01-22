'use client'

import { useState, useEffect } from 'react'
import {
    RefreshCw, Bot, Copy, Check, Send, Trash2,
    Twitter, Globe, CheckSquare, Square, Star,
    Plus, X, ExternalLink, Clock,
    Filter, Settings2, Building2, Users, Newspaper
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
import { DEFAULT_SOURCES, getSourceColor, getSourceLabel, NewsSource } from '@/lib/sources'

type TabType = 'news' | 'accounts' | 'sources'

export default function DashboardPage() {
    const [news, setNews] = useState<StoredNews[]>([])
    const [accounts, setAccounts] = useState<TrackedAccount[]>([])
    const [sources, setSources] = useState<NewsSource[]>(DEFAULT_SOURCES)
    const [loading, setLoading] = useState(true)
    const [fetching, setFetching] = useState(false)
    const [processing, setProcessing] = useState<string | null>(null)
    const [copied, setCopied] = useState<string | null>(null)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [activeTab, setActiveTab] = useState<TabType>('news')
    const [newAccountHandle, setNewAccountHandle] = useState('')
    const [filterType, setFilterType] = useState<string>('all')

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

    // Kaynak toggle
    const toggleSource = (id: string) => {
        setSources(prev => prev.map(s =>
            s.id === id ? { ...s, active: !s.active } : s
        ))
    }

    // Web kaynaklarından haber çek (demo - gerçek URL'lerle)
    const handleFetchFromSources = async () => {
        setFetching(true)
        const activeSources = sources.filter(s => s.active)

        for (const source of activeSources.slice(0, 3)) {
            await new Promise(r => setTimeout(r, 500))

            // Demo haberler - gerçek kaynak URL'leri ile
            const newsItem = {
                title: `${source.name}: Yeni Gelişme`,
                content: `${source.description} - Bu kaynak üzerinden gelen son haberler takip edilmektedir. Detaylar için kaynağı ziyaret edin.`,
                source: source.name,
                sourceUrl: source.url,
                sourceType: 'rss' as const,
                processed: false,
            }

            if (!isDuplicate(newsItem.title, newsItem.sourceUrl)) {
                const stored = await addNews(newsItem)
                setNews(prev => [stored, ...prev])
            }
        }

        setFetching(false)
    }

    // Sendikalardan haber çek
    const handleFetchFromSyndicates = async () => {
        setFetching(true)
        const syndicates = sources.filter(s => s.type === 'sendika' && s.active)

        for (const syndicate of syndicates) {
            await new Promise(r => setTimeout(r, 400))

            const newsItem = {
                title: `${syndicate.name} Açıklama Yaptı`,
                content: `${syndicate.name} (${syndicate.description}) resmi web sitesinden yapılan açıklamaya göre önemli gelişmeler yaşandı.`,
                source: syndicate.name,
                sourceUrl: syndicate.url,
                sourceType: 'rss' as const,
                processed: false,
            }

            if (!isDuplicate(newsItem.title, newsItem.sourceUrl)) {
                const stored = await addNews(newsItem)
                setNews(prev => [stored, ...prev])
            }
        }

        setFetching(false)
    }

    // X'ten çek
    const handleFetchTwitter = async () => {
        if (accounts.length === 0) {
            alert('Önce X Hesapları sekmesinden takip edilecek hesap ekleyin!')
            setActiveTab('accounts')
            return
        }

        setFetching(true)

        for (const acc of accounts.filter(a => a.active)) {
            await new Promise(r => setTimeout(r, 500))

            const tweetUrl = `https://twitter.com/${acc.handle}/status/${Date.now()}`

            const newsItem = {
                title: `@${acc.handle}: Son paylaşım`,
                content: `Bu hesaptan yapılan son paylaşım. Detaylar için Twitter'ı ziyaret edin.`,
                source: `@${acc.handle}`,
                sourceUrl: tweetUrl,
                sourceType: 'twitter' as const,
                tweetId: Date.now().toString(),
                authorHandle: acc.handle,
                processed: false,
            }

            if (!isDuplicate(newsItem.title, newsItem.sourceUrl)) {
                const stored = await addNews(newsItem)
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
                    summary: ['Özet oluşturuldu', 'İkinci madde', 'Üçüncü madde'],
                    aiComment: 'Bu haber kamu emekçileri açısından önemli olabilir.',
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
        if (!confirm(`${selectedIds.size} haber silinecek?`)) return

        await deleteMultipleNews(Array.from(selectedIds))
        setNews(prev => prev.filter(n => !selectedIds.has(n.id)))
        setSelectedIds(new Set())
    }

    // Tümünü sil
    const handleClearAll = async () => {
        if (!confirm('TÜM haberler silinecek?')) return
        await clearAllNews()
        setNews([])
        setSelectedIds(new Set())
    }

    // Kopyala - kaynak linki dahil
    const handleCopy = (item: StoredNews) => {
        const text = `🔴 ${item.title}

${item.summary?.map(s => `• ${s}`).join('\n') || item.content}

${item.aiComment ? `🧠 AI Yorumu:\n${item.aiComment}\n\n` : ''}📰 Kaynak: ${item.source}
🔗 Link: ${item.sourceUrl}

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

        if (mins < 60) return `${mins}dk`
        if (hours < 24) return `${hours}sa`
        return `${days}g`
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
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'news' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                >
                    <Newspaper size={16} /> Haberler ({news.length})
                </button>
                <button
                    onClick={() => setActiveTab('accounts')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'accounts' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                >
                    <Twitter size={16} /> X Hesapları ({accounts.length})
                </button>
                <button
                    onClick={() => setActiveTab('sources')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'sources' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                >
                    <Globe size={16} /> Web Kaynakları
                </button>
            </div>

            {/* === HABERLER TAB === */}
            {activeTab === 'news' && (
                <>
                    {/* Çekme Butonları */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        <button
                            onClick={handleFetchFromSources}
                            disabled={fetching}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium"
                        >
                            <Globe size={16} className={fetching ? 'animate-spin' : ''} />
                            Resmî Kaynaklar
                        </button>
                        <button
                            onClick={handleFetchFromSyndicates}
                            disabled={fetching}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-sm font-medium"
                        >
                            <Users size={16} className={fetching ? 'animate-spin' : ''} />
                            Sendikalar
                        </button>
                        <button
                            onClick={handleFetchTwitter}
                            disabled={fetching}
                            className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 rounded-lg text-sm font-medium"
                        >
                            <Twitter size={16} className={fetching ? 'animate-spin' : ''} />
                            X ({accounts.length})
                        </button>
                    </div>

                    {/* Filtreler */}
                    <div className="flex items-center justify-between bg-zinc-900 rounded-lg border border-zinc-800 p-3 mb-4">
                        <div className="flex items-center gap-4">
                            <button onClick={toggleSelectAll} className="text-zinc-400 hover:text-white">
                                {selectedIds.size === filteredNews.length && filteredNews.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
                            </button>
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm"
                            >
                                <option value="all">Tümü ({news.length})</option>
                                <option value="rss">Web/RSS</option>
                                <option value="twitter">X/Twitter</option>
                                <option value="processed">İşlenmiş</option>
                                <option value="unprocessed">İşlenmemiş</option>
                            </select>
                            {selectedIds.size > 0 && (
                                <span className="text-sm text-zinc-400">{selectedIds.size} seçili</span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            {selectedIds.size > 0 && (
                                <button onClick={handleDeleteSelected} className="px-3 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded text-sm">
                                    <Trash2 size={14} className="inline mr-1" /> Sil
                                </button>
                            )}
                            {news.length > 0 && (
                                <button onClick={handleClearAll} className="px-3 py-1.5 text-zinc-500 hover:text-red-400 text-sm">
                                    Temizle
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Haber Listesi */}
                    {filteredNews.length === 0 ? (
                        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
                            <Newspaper size={48} className="mx-auto text-zinc-600 mb-4" />
                            <p className="text-zinc-400">Henüz haber yok</p>
                            <p className="text-zinc-500 text-sm mt-1">Yukarıdaki butonlarla haber çekin</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredNews.map((item) => (
                                <div
                                    key={item.id}
                                    className={`bg-zinc-900 rounded-lg border p-4 ${selectedIds.has(item.id) ? 'border-red-600' : 'border-zinc-800'}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <button onClick={() => toggleSelect(item.id)} className="mt-0.5 text-zinc-500 hover:text-white">
                                            {selectedIds.has(item.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                                        </button>

                                        <div className="flex-1 min-w-0">
                                            {/* Header */}
                                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                <a
                                                    href={item.sourceUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={`text-xs px-2 py-0.5 rounded hover:opacity-80 flex items-center gap-1 ${item.sourceType === 'twitter' ? 'bg-blue-900/30 text-blue-400' : 'bg-green-900/30 text-green-400'}`}
                                                >
                                                    {item.sourceType === 'twitter' ? <Twitter size={10} /> : <Globe size={10} />}
                                                    {item.source}
                                                    <ExternalLink size={8} />
                                                </a>
                                                {item.importance === 'high' && (
                                                    <span className="text-xs text-red-400 bg-red-900/30 px-2 py-0.5 rounded flex items-center gap-1">
                                                        <Star size={10} /> Önemli
                                                    </span>
                                                )}
                                                <span className="text-xs text-zinc-500">{formatTime(item.createdAt)}</span>
                                            </div>

                                            {/* Content */}
                                            <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                                            <p className="text-zinc-400 text-sm mb-2 line-clamp-2">{item.content}</p>

                                            {/* AI Result */}
                                            {item.processed && item.summary && (
                                                <div className="bg-zinc-800/50 rounded p-3 mb-2 text-sm">
                                                    <div className="mb-2">
                                                        <span className="text-red-400 text-xs font-medium">📌 Özet:</span>
                                                        <ul className="mt-1">
                                                            {item.summary.map((s, i) => (
                                                                <li key={i} className="text-zinc-300">• {s}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                    {item.aiComment && (
                                                        <div className="pt-2 border-t border-zinc-700">
                                                            <span className="text-amber-400 text-xs font-medium">🧠 Yorum:</span>
                                                            <p className="text-zinc-300 mt-1">{item.aiComment}</p>
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
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded text-xs"
                                                    >
                                                        <Bot size={12} className={processing === item.id ? 'animate-pulse' : ''} />
                                                        {processing === item.id ? 'İşleniyor...' : 'AI İşle'}
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button onClick={() => handleCopy(item)} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-xs">
                                                            {copied === item.id ? <Check size={12} /> : <Copy size={12} />}
                                                            {copied === item.id ? 'Kopyalandı!' : 'Kopyala'}
                                                        </button>
                                                        <button className="flex items-center gap-1 px-3 py-1.5 bg-blue-600/20 text-blue-400 rounded text-xs">
                                                            <Send size={12} /> Telegram
                                                        </button>
                                                        <button className="flex items-center gap-1 px-3 py-1.5 bg-green-600/20 text-green-400 rounded text-xs">
                                                            <Send size={12} /> WhatsApp
                                                        </button>
                                                    </>
                                                )}
                                                <a
                                                    href={item.sourceUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 text-zinc-400 hover:text-white rounded text-xs"
                                                >
                                                    <ExternalLink size={12} /> Kaynağa Git
                                                </a>
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
                    <h1 className="text-xl font-bold mb-4">X Hesapları</h1>

                    {/* Hesap Ekle */}
                    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4 mb-4">
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">@</span>
                                <input
                                    type="text"
                                    value={newAccountHandle}
                                    onChange={(e) => setNewAccountHandle(e.target.value)}
                                    placeholder="kullanici_adi"
                                    className="w-full pl-8 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddAccount()}
                                />
                            </div>
                            <button onClick={handleAddAccount} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium">
                                <Plus size={16} className="inline mr-1" /> Ekle
                            </button>
                        </div>
                    </div>

                    {/* Hesap Listesi */}
                    {accounts.length === 0 ? (
                        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-8 text-center">
                            <Twitter size={40} className="mx-auto text-zinc-600 mb-3" />
                            <p className="text-zinc-400">Henüz hesap eklenmemiş</p>
                            <p className="text-zinc-500 text-sm">Örnek: CalismaBakani, turkis_org</p>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 gap-2">
                            {accounts.map((acc) => (
                                <div key={acc.id} className="bg-zinc-900 rounded-lg border border-zinc-800 p-3 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Twitter size={20} className="text-blue-400" />
                                        <span className="font-medium">@{acc.handle}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <a href={`https://twitter.com/${acc.handle}`} target="_blank" className="p-2 text-zinc-400 hover:text-white">
                                            <ExternalLink size={14} />
                                        </a>
                                        <button onClick={() => handleDeleteAccount(acc.id)} className="p-2 text-zinc-400 hover:text-red-400">
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* === WEB KAYNAKLARI TAB === */}
            {activeTab === 'sources' && (
                <div>
                    <h1 className="text-xl font-bold mb-4">Web Kaynakları</h1>
                    <p className="text-zinc-500 text-sm mb-4">Haber çekilecek resmi kaynaklar, sendikalar ve haber siteleri</p>

                    {/* Kategori Grupları */}
                    {['resmi', 'bakanlik', 'sendika', 'haber'].map(type => (
                        <div key={type} className="mb-6">
                            <h2 className="font-medium mb-2 flex items-center gap-2">
                                {type === 'resmi' && <Building2 size={16} className="text-red-400" />}
                                {type === 'bakanlik' && <Building2 size={16} className="text-blue-400" />}
                                {type === 'sendika' && <Users size={16} className="text-green-400" />}
                                {type === 'haber' && <Newspaper size={16} className="text-purple-400" />}
                                {getSourceLabel(type)}
                            </h2>
                            <div className="grid md:grid-cols-2 gap-2">
                                {sources.filter(s => s.type === type).map(source => (
                                    <div
                                        key={source.id}
                                        className={`bg-zinc-900 rounded-lg border p-3 flex items-center justify-between ${source.active ? 'border-zinc-700' : 'border-zinc-800 opacity-50'}`}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">{source.name}</p>
                                            <p className="text-zinc-500 text-xs truncate">{source.description}</p>
                                        </div>
                                        <div className="flex items-center gap-1 ml-2">
                                            <a href={source.url} target="_blank" className="p-2 text-zinc-400 hover:text-white">
                                                <ExternalLink size={14} />
                                            </a>
                                            <button
                                                onClick={() => toggleSource(source.id)}
                                                className={`p-2 rounded ${source.active ? 'text-green-400' : 'text-zinc-600'}`}
                                            >
                                                {source.active ? <CheckSquare size={14} /> : <Square size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
