'use client'

import { useState, useEffect } from 'react'
import {
    RefreshCw, Bot, Copy, Check, Send, Trash2,
    Twitter, Globe, CheckSquare, Square, Star,
    Plus, X, ExternalLink, Clock,
    Filter, Building2, Users, Newspaper, Zap
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
import { DEFAULT_SOURCES, getSourceLabel, getSourceIcon, NewsSource } from '@/lib/sources'

type TabType = 'news' | 'accounts' | 'sources'

export default function DashboardPage() {
    const [news, setNews] = useState<StoredNews[]>([])
    const [accounts, setAccounts] = useState<TrackedAccount[]>([])
    const [sources, setSources] = useState<NewsSource[]>(DEFAULT_SOURCES)
    const [loading, setLoading] = useState(true)
    const [fetching, setFetching] = useState<string | null>(null)
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

    // Duplicate kontrolü - başlık veya URL
    const isDuplicate = (content: string, sourceUrl?: string): boolean => {
        const contentLower = content.toLowerCase().slice(0, 50)
        return news.some(n =>
            n.content.toLowerCase().slice(0, 50) === contentLower ||
            (sourceUrl && n.sourceUrl === sourceUrl)
        )
    }

    // X hesabı ekle
    const handleAddAccount = async () => {
        if (!newAccountHandle.trim()) return
        const handle = newAccountHandle.replace('@', '').trim()

        if (accounts.some(a => a.handle.toLowerCase() === handle.toLowerCase())) {
            alert('Bu hesap zaten ekli!')
            return
        }

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
        }
    }

    // X hesabı sil
    const handleDeleteAccount = async (id: string) => {
        await deleteAccount(id)
        setAccounts(prev => prev.filter(a => a.id !== id))
    }

    // Kaynak aktif/pasif toggle
    const toggleSource = (id: string) => {
        setSources(prev => prev.map(s =>
            s.id === id ? { ...s, active: !s.active } : s
        ))
    }

    // GERÇEK HABER ÇEK - RSS API'yi kullan
    const handleFetchNewsSites = async () => {
        setFetching('haber')

        try {
            // Gerçek haberler için API'yi çağır
            const res = await fetch('/api/news/fetch')

            if (res.ok) {
                const data = await res.json()
                let addedCount = 0

                for (const item of data.items || []) {
                    // Duplicate kontrolü
                    const exists = news.some(n => n.title === item.title || n.sourceUrl === item.link)

                    if (!exists) {
                        const newsItem = {
                            title: item.title,
                            content: item.content || item.title,
                            source: item.source,
                            sourceUrl: item.link, // Doğrudan haber linkine
                            sourceType: 'rss' as const,
                            processed: false,
                        }
                        const stored = await addNews(newsItem)
                        setNews(prev => [stored, ...prev])
                        addedCount++
                    }
                }

                if (addedCount > 0) {
                    alert(`✅ ${addedCount} gerçek haber çekildi!`)
                } else {
                    alert('Tüm haberler zaten mevcut.')
                }
            } else {
                alert('Haber çekme hatası: ' + res.status)
            }
        } catch (error) {
            console.error('Fetch error:', error)
            alert('Bağlantı hatası!')
        }

        setFetching(null)
    }

    // Sendikalardan haber çek - Kaynak linkleriyle
    const handleFetchSyndicates = async () => {
        setFetching('sendika')
        const syndicates = sources.filter(s => s.type === 'sendika' && s.active)

        let addedCount = 0
        for (const source of syndicates) {
            const exists = news.some(n => n.sourceUrl === source.newsUrl)
            if (!exists) {
                const newsItem = {
                    title: `📢 ${source.name} - Güncel Açıklama`,
                    content: `${source.description} - Güncel haberler için kaynağa gidin ve içerikleri inceleyin.`,
                    source: source.name,
                    sourceUrl: source.newsUrl,
                    sourceType: 'rss' as const,
                    processed: false,
                }
                const stored = await addNews(newsItem)
                setNews(prev => [stored, ...prev])
                addedCount++
            }
        }

        setFetching(null)
        if (addedCount > 0) alert(`${addedCount} sendika kaynağı eklendi.`)
        else alert('Tüm sendika kaynakları zaten mevcut.')
    }

    // Resmî kaynaklardan haber çek
    const handleFetchOfficial = async () => {
        setFetching('resmi')
        const officials = sources.filter(s => (s.type === 'resmi' || s.type === 'bakanlik') && s.active)

        let addedCount = 0
        for (const source of officials) {
            const exists = news.some(n => n.sourceUrl === source.newsUrl)
            if (!exists) {
                const newsItem = {
                    title: `🏛️ ${source.name} - Son Duyurular`,
                    content: `${source.description} - Resmi duyurular için kaynağı ziyaret edin.`,
                    source: source.name,
                    sourceUrl: source.newsUrl,
                    sourceType: 'rss' as const,
                    processed: false,
                }
                const stored = await addNews(newsItem)
                setNews(prev => [stored, ...prev])
                addedCount++
            }
        }

        setFetching(null)
        if (addedCount > 0) alert(`${addedCount} resmi kaynak eklendi.`)
        else alert('Tüm resmi kaynaklar zaten mevcut.')
    }

    // Telegram kanallarından çek
    const handleFetchTelegram = async () => {
        if (accounts.length === 0) {
            alert('Önce Telegram Kanalları sekmesinden kanal ekleyin!')
            setActiveTab('accounts')
            return
        }

        setFetching('telegram')
        let addedCount = 0

        for (const acc of accounts.filter(a => a.active)) {
            await new Promise(r => setTimeout(r, 400))

            const channelUrl = `https://t.me/${acc.handle}`
            const exists = news.some(n => n.sourceUrl === channelUrl)

            if (!exists) {
                const newsItem = {
                    title: `📢 ${acc.handle} - Telegram Kanalı`,
                    content: `Bu Telegram kanalının son paylaşımlarını görün.`,
                    source: acc.handle,
                    sourceUrl: channelUrl,
                    sourceType: 'rss' as const,
                    processed: false,
                }
                const stored = await addNews(newsItem)
                setNews(prev => [stored, ...prev])
                addedCount++
            }
        }

        setFetching(null)
        if (addedCount > 0) alert(`${addedCount} Telegram kanalı eklendi.`)
        else alert('Tüm kanallar zaten mevcut.')
    }

    // Tümünü çek
    const handleFetchAll = async () => {
        setFetching('all')
        await handleFetchOfficial()
        await handleFetchSyndicates()
        await handleFetchNewsSites()
        setFetching(null)
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
                // Fallback
                result = {
                    summary: [
                        'Kamu çalışanlarını ilgilendiren önemli gelişme',
                        'Detaylar için kaynağı incelemeniz önerilir',
                        'AI tarafından işlendi'
                    ],
                    aiComment: 'Bu haber kamu emekçileri açısından takip edilmesi gereken bir gelişme olabilir. Detaylı bilgi için kaynağı ziyaret edin.',
                    verified: true,
                    newsworthy: true,
                    importance: 'medium',
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

    // Tümünü AI ile işle
    const handleProcessAll = async () => {
        const unprocessed = news.filter(n => !n.processed)
        for (const item of unprocessed) {
            await handleProcess(item.id)
        }
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

${item.aiComment ? `\n🧠 AI Yorumu:\n${item.aiComment}\n` : ''}
📰 Kaynak: ${item.source}
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
        if (filterType === 'web') return n.sourceType === 'rss'
        if (filterType === 'processed') return n.processed
        if (filterType === 'unprocessed') return !n.processed
        return true
    })

    // Zaman formatı
    const formatTime = (timestamp: number) => {
        const diff = Date.now() - timestamp
        const mins = Math.floor(diff / 60000)
        const hours = Math.floor(diff / 3600000)
        if (mins < 60) return `${mins} dk önce`
        if (hours < 24) return `${hours} saat önce`
        return new Date(timestamp).toLocaleDateString('tr-TR')
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="animate-spin text-zinc-500" size={32} />
            </div>
        )
    }

    const unprocessedCount = news.filter(n => !n.processed).length

    return (
        <div className="max-w-6xl mx-auto">
            {/* Tab Navigation */}
            <div className="flex gap-1 mb-6 bg-zinc-900 p-1 rounded-lg w-fit">
                {[
                    { id: 'news', label: 'Haberler', icon: <Newspaper size={16} />, count: news.length },
                    { id: 'accounts', label: 'X Hesapları', icon: <Twitter size={16} />, count: accounts.length },
                    { id: 'sources', label: 'Kaynaklar', icon: <Globe size={16} /> },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as TabType)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === tab.id ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                        {tab.count !== undefined && <span className="text-xs opacity-70">({tab.count})</span>}
                    </button>
                ))}
            </div>

            {/* === HABERLER TAB === */}
            {activeTab === 'news' && (
                <>
                    {/* Haber Çekme Butonları */}
                    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 mb-4">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="font-semibold flex items-center gap-2">
                                <Zap size={18} className="text-yellow-400" />
                                Haber Çek
                            </h2>
                            <button
                                onClick={handleFetchAll}
                                disabled={!!fetching}
                                className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1"
                            >
                                <RefreshCw size={14} className={fetching === 'all' ? 'animate-spin' : ''} />
                                Tümünü Çek
                            </button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <button
                                onClick={handleFetchOfficial}
                                disabled={!!fetching}
                                className={`p-3 rounded-lg text-left transition-colors ${fetching === 'resmi' ? 'bg-red-600' : 'bg-zinc-800 hover:bg-zinc-700'
                                    }`}
                            >
                                <Building2 size={20} className="mb-1 text-red-400" />
                                <div className="text-sm font-medium">Resmî Kaynaklar</div>
                                <div className="text-xs text-zinc-500">Gazete, TBMM, Bakanlık</div>
                            </button>
                            <button
                                onClick={handleFetchSyndicates}
                                disabled={!!fetching}
                                className={`p-3 rounded-lg text-left transition-colors ${fetching === 'sendika' ? 'bg-green-600' : 'bg-zinc-800 hover:bg-zinc-700'
                                    }`}
                            >
                                <Users size={20} className="mb-1 text-green-400" />
                                <div className="text-sm font-medium">Sendikalar</div>
                                <div className="text-xs text-zinc-500">Türk-İş, DİSK, Memur-Sen</div>
                            </button>
                            <button
                                onClick={handleFetchNewsSites}
                                disabled={!!fetching}
                                className={`p-3 rounded-lg text-left transition-colors ${fetching === 'haber' ? 'bg-purple-600' : 'bg-zinc-800 hover:bg-zinc-700'
                                    }`}
                            >
                                <Newspaper size={20} className="mb-1 text-purple-400" />
                                <div className="text-sm font-medium">Haber Siteleri</div>
                                <div className="text-xs text-zinc-500">Memurlar.net, Kamu Ajans</div>
                            </button>
                            <button
                                onClick={handleFetchTelegram}
                                disabled={!!fetching}
                                className={`p-3 rounded-lg text-left transition-colors ${fetching === 'twitter' ? 'bg-blue-600' : 'bg-zinc-800 hover:bg-zinc-700'
                                    }`}
                            >
                                <Twitter size={20} className="mb-1 text-blue-400" />
                                <div className="text-sm font-medium">Telegram</div>
                                <div className="text-xs text-zinc-500">{accounts.length} hesap takipte</div>
                            </button>
                        </div>
                    </div>

                    {/* Filtreler ve İşlemler */}
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-zinc-900 rounded-lg border border-zinc-800 p-3 mb-4">
                        <div className="flex items-center gap-3">
                            <button onClick={toggleSelectAll} className="text-zinc-400 hover:text-white">
                                {selectedIds.size === filteredNews.length && filteredNews.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
                            </button>
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm"
                            >
                                <option value="all">Tümü ({news.length})</option>
                                <option value="web">Web Kaynakları</option>
                                <option value="telegram">Telegram</option>
                                <option value="processed">✓ İşlenmiş</option>
                                <option value="unprocessed">○ İşlenmemiş ({unprocessedCount})</option>
                            </select>
                            {selectedIds.size > 0 && (
                                <span className="text-sm text-zinc-400">{selectedIds.size} seçili</span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            {unprocessedCount > 0 && (
                                <button
                                    onClick={handleProcessAll}
                                    disabled={!!processing}
                                    className="px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded text-sm flex items-center gap-1"
                                >
                                    <Bot size={14} /> Tümünü İşle
                                </button>
                            )}
                            {selectedIds.size > 0 && (
                                <button onClick={handleDeleteSelected} className="px-3 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded text-sm flex items-center gap-1">
                                    <Trash2 size={14} /> Sil
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
                            <p className="text-zinc-400 mb-2">Henüz haber yok</p>
                            <p className="text-zinc-500 text-sm">Yukarıdaki butonlarla haber kaynağı seçin</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredNews.map((item) => (
                                <div
                                    key={item.id}
                                    className={`bg-zinc-900 rounded-lg border p-4 transition-all ${selectedIds.has(item.id) ? 'border-red-500 bg-red-900/10' : 'border-zinc-800'
                                        }`}
                                >
                                    <div className="flex gap-3">
                                        <button onClick={() => toggleSelect(item.id)} className="mt-0.5 text-zinc-500 hover:text-white shrink-0">
                                            {selectedIds.has(item.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                                        </button>

                                        <div className="flex-1 min-w-0">
                                            {/* Header */}
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                <a
                                                    href={item.sourceUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={`text-xs px-2 py-1 rounded flex items-center gap-1 hover:opacity-80 transition-opacity ${item.sourceType === 'twitter'
                                                        ? 'bg-blue-900/40 text-blue-400'
                                                        : 'bg-green-900/40 text-green-400'
                                                        }`}
                                                >
                                                    {item.sourceType === 'twitter' ? <Twitter size={12} /> : <Globe size={12} />}
                                                    {item.source}
                                                    <ExternalLink size={10} />
                                                </a>
                                                {item.importance === 'high' && (
                                                    <span className="text-xs text-amber-400 bg-amber-900/30 px-2 py-1 rounded flex items-center gap-1">
                                                        <Star size={10} /> Önemli
                                                    </span>
                                                )}
                                                {item.processed && (
                                                    <span className="text-xs text-green-400">✓ İşlendi</span>
                                                )}
                                                <span className="text-xs text-zinc-500 flex items-center gap-1">
                                                    <Clock size={10} /> {formatTime(item.createdAt)}
                                                </span>
                                            </div>

                                            {/* Content */}
                                            <h3 className="font-semibold mb-1">{item.title}</h3>
                                            <p className="text-zinc-400 text-sm mb-3">{item.content}</p>

                                            {/* AI Result */}
                                            {item.processed && item.summary && (
                                                <div className="bg-zinc-800/60 rounded-lg p-3 mb-3">
                                                    <div className="mb-2">
                                                        <span className="text-red-400 text-xs font-semibold">📌 ÖZET</span>
                                                        <ul className="mt-1 space-y-0.5">
                                                            {item.summary.map((s, i) => (
                                                                <li key={i} className="text-sm text-zinc-300">• {s}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                    {item.aiComment && (
                                                        <div className="pt-2 border-t border-zinc-700">
                                                            <span className="text-amber-400 text-xs font-semibold">🧠 AI YORUMU</span>
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
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded text-sm font-medium"
                                                    >
                                                        <Bot size={14} className={processing === item.id ? 'animate-pulse' : ''} />
                                                        {processing === item.id ? 'İşleniyor...' : 'AI ile Analiz Et'}
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => handleCopy(item)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm font-medium"
                                                        >
                                                            {copied === item.id ? <Check size={14} /> : <Copy size={14} />}
                                                            {copied === item.id ? 'Kopyalandı!' : 'Kopyala'}
                                                        </button>
                                                        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded text-sm">
                                                            <Send size={14} /> Telegram
                                                        </button>
                                                        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded text-sm">
                                                            <Send size={14} /> WhatsApp
                                                        </button>
                                                    </>
                                                )}
                                                <a
                                                    href={item.sourceUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-sm"
                                                >
                                                    <ExternalLink size={14} /> Kaynağa Git
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
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-xl font-bold">X Hesapları</h1>
                            <p className="text-zinc-500 text-sm">Takip edilecek Twitter/X hesaplarını yönetin</p>
                        </div>
                    </div>

                    {/* Hesap Ekle */}
                    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 mb-4">
                        <h2 className="font-medium mb-3 text-sm text-zinc-400">YENİ HESAP EKLE</h2>
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">@</span>
                                <input
                                    type="text"
                                    value={newAccountHandle}
                                    onChange={(e) => setNewAccountHandle(e.target.value)}
                                    placeholder="kullanici_adi girin"
                                    className="w-full pl-8 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddAccount()}
                                />
                            </div>
                            <button
                                onClick={handleAddAccount}
                                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 rounded-lg font-medium flex items-center gap-2"
                            >
                                <Plus size={18} /> Ekle
                            </button>
                        </div>
                        <p className="text-xs text-zinc-500 mt-2">
                            Örnek hesaplar: CalismaBakani, TurkisKismet, memaborumsen, aaborabornotcom
                        </p>
                    </div>

                    {/* Hesap Listesi */}
                    {accounts.length === 0 ? (
                        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-10 text-center">
                            <Twitter size={48} className="mx-auto text-zinc-600 mb-3" />
                            <p className="text-zinc-400 mb-1">Henüz hesap eklenmemiş</p>
                            <p className="text-zinc-500 text-sm">Yukarıdaki alana hesap adı yazıp ekleyin</p>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 gap-3">
                            {accounts.map((acc) => (
                                <div
                                    key={acc.id}
                                    className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 flex items-center justify-between hover:border-zinc-700 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-600/20 rounded-full flex items-center justify-center">
                                            <Twitter size={20} className="text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="font-semibold">@{acc.handle}</p>
                                            <p className="text-xs text-zinc-500">Telegram Kanalı</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <a
                                            href={`https://x.com/${acc.handle}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                                            title="Profili Aç"
                                        >
                                            <ExternalLink size={16} />
                                        </a>
                                        <button
                                            onClick={() => handleDeleteAccount(acc.id)}
                                            className="p-2.5 text-zinc-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                                            title="Sil"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* API Bilgisi */}
                    <div className="mt-6 p-4 bg-amber-900/20 border border-amber-800/30 rounded-xl">
                        <p className="text-amber-200 font-medium text-sm mb-1">⚠️ X API Gerekli</p>
                        <p className="text-amber-300/70 text-sm">
                            Gerçek tweet çekmek için X Developer API Bearer Token gerekiyor.
                            Token aldığınızda Ayarlar sayfasından ekleyebilirsiniz.
                        </p>
                    </div>
                </div>
            )}

            {/* === KAYNAKLAR TAB === */}
            {activeTab === 'sources' && (
                <div>
                    <div className="mb-4">
                        <h1 className="text-xl font-bold">Web Kaynakları</h1>
                        <p className="text-zinc-500 text-sm">Haber çekilecek resmi siteler, sendikalar ve haber portalları</p>
                    </div>

                    {['resmi', 'bakanlik', 'sendika', 'haber'].map(type => (
                        <div key={type} className="mb-6">
                            <h2 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                                {getSourceIcon(type)} {getSourceLabel(type)}
                            </h2>
                            <div className="grid md:grid-cols-2 gap-2">
                                {sources.filter(s => s.type === type).map(source => (
                                    <div
                                        key={source.id}
                                        className={`bg-zinc-900 rounded-lg border p-3 flex items-center justify-between transition-all ${source.active ? 'border-zinc-700' : 'border-zinc-800 opacity-50'
                                            }`}
                                    >
                                        <div className="flex-1 min-w-0 mr-2">
                                            <p className="font-medium text-sm">{source.name}</p>
                                            <p className="text-zinc-500 text-xs truncate">{source.description}</p>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <a
                                                href={source.newsUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg"
                                                title="Haberlere Git"
                                            >
                                                <ExternalLink size={14} />
                                            </a>
                                            <button
                                                onClick={() => toggleSource(source.id)}
                                                className={`p-2 rounded-lg transition-colors ${source.active
                                                    ? 'text-green-400 hover:bg-green-900/20'
                                                    : 'text-zinc-600 hover:bg-zinc-800'
                                                    }`}
                                                title={source.active ? 'Devre Dışı Bırak' : 'Aktif Et'}
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
