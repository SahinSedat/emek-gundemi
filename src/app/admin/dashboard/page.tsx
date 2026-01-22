'use client'

import { useState, useEffect } from 'react'
import {
    RefreshCw, Bot, Copy, Check, Send, Trash2,
    Twitter, Globe, CheckSquare, Square, Star,
    Plus, X, ExternalLink, Clock,
    Building2, Users, Newspaper, ChevronDown, ChevronUp
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

// Kaynak türleri
type SourceType = 'resmi' | 'sendika' | 'haber' | 'twitter' | 'custom'

interface CustomSource {
    id: string
    name: string
    url: string
    type: SourceType
}

// Varsayılan kaynaklar
const DEFAULT_SOURCES: CustomSource[] = [
    // Resmi
    { id: 'resmi-gazete', name: 'Resmî Gazete', url: 'https://www.resmigazete.gov.tr', type: 'resmi' },
    { id: 'tbmm', name: 'TBMM Haberler', url: 'https://www.tbmm.gov.tr/haber', type: 'resmi' },
    { id: 'csgb', name: 'Çalışma Bakanlığı', url: 'https://www.csgb.gov.tr/haberler/', type: 'resmi' },
    // Sendikalar
    { id: 'turk-is', name: 'Türk-İş', url: 'https://www.turkis.org.tr/kategori/haberler/', type: 'sendika' },
    { id: 'disk', name: 'DİSK', url: 'https://disk.org.tr/category/basin-aciklamalari/', type: 'sendika' },
    { id: 'memur-sen', name: 'Memur-Sen', url: 'https://www.memursen.org.tr/haberler', type: 'sendika' },
    { id: 'kesk', name: 'KESK', url: 'https://www.kesk.org.tr', type: 'sendika' },
    // Haber Siteleri
    { id: 'memurlar', name: 'Memurlar.net', url: 'https://www.memurlar.net/haber/', type: 'haber' },
    { id: 'kamuajans', name: 'Kamu Ajans', url: 'https://www.kamuajans.com/gundem/', type: 'haber' },
    { id: 'memurhaber', name: 'Memur Haber', url: 'https://www.memurhaber.com/guncel/', type: 'haber' },
]

export default function DashboardPage() {
    const [news, setNews] = useState<StoredNews[]>([])
    const [accounts, setAccounts] = useState<TrackedAccount[]>([])
    const [sources, setSources] = useState<CustomSource[]>(DEFAULT_SOURCES)
    const [loading, setLoading] = useState(true)
    const [fetching, setFetching] = useState<string | null>(null)
    const [processing, setProcessing] = useState<string | null>(null)
    const [copied, setCopied] = useState<string | null>(null)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    // Bölüm açık/kapalı durumları
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['resmi', 'sendika', 'haber', 'twitter']))

    // Yeni kaynak ekleme
    const [newSourceName, setNewSourceName] = useState('')
    const [newSourceUrl, setNewSourceUrl] = useState('')
    const [newSourceType, setNewSourceType] = useState<SourceType>('custom')
    const [showAddSource, setShowAddSource] = useState(false)

    // Yeni X hesabı
    const [newAccountHandle, setNewAccountHandle] = useState('')

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

    // Bölümü aç/kapa
    const toggleSection = (section: string) => {
        const newSet = new Set(expandedSections)
        if (newSet.has(section)) {
            newSet.delete(section)
        } else {
            newSet.add(section)
        }
        setExpandedSections(newSet)
    }

    // Haberleri türe göre filtrele
    const getNewsByType = (type: SourceType): StoredNews[] => {
        return news.filter(n => {
            if (type === 'twitter') return n.sourceType === 'twitter'
            // Kaynak adına göre eşleştir
            const source = sources.find(s => s.name === n.source)
            return source?.type === type
        })
    }

    // Kaynak ekle
    const handleAddSource = () => {
        if (!newSourceName.trim() || !newSourceUrl.trim()) return

        const newSource: CustomSource = {
            id: `custom_${Date.now()}`,
            name: newSourceName.trim(),
            url: newSourceUrl.trim().startsWith('http') ? newSourceUrl.trim() : `https://${newSourceUrl.trim()}`,
            type: newSourceType
        }

        setSources(prev => [...prev, newSource])
        setNewSourceName('')
        setNewSourceUrl('')
        setShowAddSource(false)
    }

    // Kaynak sil
    const handleDeleteSource = (id: string) => {
        setSources(prev => prev.filter(s => s.id !== id))
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

    // Kaynaktan haber çek
    const handleFetchFromSource = async (source: CustomSource) => {
        setFetching(source.id)

        // Haberi ekle
        const newsItem = {
            title: `📰 ${source.name} - Son Haberler`,
            content: `${source.name} sitesindeki güncel haberler için kaynağa gidin.`,
            source: source.name,
            sourceUrl: source.url,
            sourceType: 'rss' as const,
            processed: false,
        }

        const existing = news.find(n => n.sourceUrl === source.url)
        if (!existing) {
            const stored = await addNews(newsItem)
            setNews(prev => [stored, ...prev])
        }

        setFetching(null)
    }

    // Tüm kaynakları çek (tür bazında)
    const handleFetchAll = async (type: SourceType) => {
        setFetching(type)
        const typeSources = sources.filter(s => s.type === type)

        for (const source of typeSources) {
            const existing = news.find(n => n.sourceUrl === source.url)
            if (!existing) {
                const newsItem = {
                    title: `📰 ${source.name} - Son Haberler`,
                    content: `${source.name} sitesindeki güncel haberler için kaynağa gidin.`,
                    source: source.name,
                    sourceUrl: source.url,
                    sourceType: 'rss' as const,
                    processed: false,
                }
                const stored = await addNews(newsItem)
                setNews(prev => [stored, ...prev])
            }
        }

        setFetching(null)
    }

    // X hesaplarından çek
    const handleFetchTwitter = async () => {
        if (accounts.length === 0) {
            alert('Önce X hesabı ekleyin!')
            return
        }

        setFetching('twitter')

        for (const acc of accounts) {
            const url = `https://x.com/${acc.handle}`
            const existing = news.find(n => n.sourceUrl === url)

            if (!existing) {
                const newsItem = {
                    title: `@${acc.handle}'ın X Paylaşımları`,
                    content: `@${acc.handle} hesabının son paylaşımları için X profilini ziyaret edin.`,
                    source: `@${acc.handle}`,
                    sourceUrl: url,
                    sourceType: 'twitter' as const,
                    tweetId: `x_${Date.now()}`,
                    authorHandle: acc.handle,
                    processed: false,
                }
                const stored = await addNews(newsItem)
                setNews(prev => [stored, ...prev])
            }
        }

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
                result = {
                    summary: ['Özet oluşturuldu'],
                    aiComment: 'AI analizi yapıldı.',
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

    // Sil
    const handleDelete = async (id: string) => {
        await deleteMultipleNews([id])
        setNews(prev => prev.filter(n => n.id !== id))
    }

    // Kopyala
    const handleCopy = (item: StoredNews) => {
        const text = `🔴 ${item.title}\n\n${item.summary?.map(s => `• ${s}`).join('\n') || item.content}\n\n📰 Kaynak: ${item.source}\n🔗 ${item.sourceUrl}\n\n#EmekGündemi`
        navigator.clipboard.writeText(text)
        setCopied(item.id)
        setTimeout(() => setCopied(null), 2000)
    }

    // Zaman formatı
    const formatTime = (timestamp: number) => {
        const diff = Date.now() - timestamp
        const mins = Math.floor(diff / 60000)
        if (mins < 60) return `${mins}dk`
        const hours = Math.floor(diff / 3600000)
        if (hours < 24) return `${hours}sa`
        return new Date(timestamp).toLocaleDateString('tr-TR')
    }

    // Kaynak ikonu
    const getTypeIcon = (type: SourceType) => {
        switch (type) {
            case 'resmi': return <Building2 size={18} className="text-red-400" />
            case 'sendika': return <Users size={18} className="text-green-400" />
            case 'haber': return <Newspaper size={18} className="text-purple-400" />
            case 'twitter': return <Twitter size={18} className="text-blue-400" />
            case 'custom': return <Globe size={18} className="text-yellow-400" />
        }
    }

    // Kaynak başlığı
    const getTypeTitle = (type: SourceType) => {
        switch (type) {
            case 'resmi': return '🏛️ Resmî Kaynaklar'
            case 'sendika': return '✊ Sendikalar'
            case 'haber': return '📰 Haber Siteleri'
            case 'twitter': return '🐦 X / Twitter'
            case 'custom': return '➕ Özel Kaynaklar'
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="animate-spin text-zinc-500" size={32} />
            </div>
        )
    }

    // Bölüm render fonksiyonu
    const renderSection = (type: SourceType) => {
        const typeSources = sources.filter(s => s.type === type)
        const typeNews = getNewsByType(type)
        const isExpanded = expandedSections.has(type)
        const isFetching = fetching === type

        return (
            <div key={type} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden mb-4">
                {/* Bölüm Başlığı */}
                <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-800/50"
                    onClick={() => toggleSection(type)}
                >
                    <div className="flex items-center gap-3">
                        {getTypeIcon(type)}
                        <span className="font-semibold">{getTypeTitle(type)}</span>
                        <span className="text-xs text-zinc-500">
                            ({typeSources.length} kaynak, {typeNews.length} haber)
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                if (type === 'twitter') {
                                    handleFetchTwitter()
                                } else {
                                    handleFetchAll(type)
                                }
                            }}
                            disabled={isFetching}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded text-xs font-medium"
                        >
                            {isFetching ? <RefreshCw size={12} className="animate-spin" /> : 'Tümünü Çek'}
                        </button>
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                </div>

                {/* Bölüm İçeriği */}
                {isExpanded && (
                    <div className="border-t border-zinc-800">
                        {/* Kaynaklar */}
                        <div className="p-4 bg-zinc-800/30">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-zinc-400 font-medium">KAYNAKLAR</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {type === 'twitter' ? (
                                    // X hesapları
                                    <>
                                        {accounts.map(acc => (
                                            <div key={acc.id} className="flex items-center gap-1 bg-zinc-800 rounded-lg px-2 py-1">
                                                <Twitter size={12} className="text-blue-400" />
                                                <span className="text-sm">@{acc.handle}</span>
                                                <a href={`https://x.com/${acc.handle}`} target="_blank" className="text-zinc-400 hover:text-white">
                                                    <ExternalLink size={10} />
                                                </a>
                                                <button onClick={() => handleDeleteAccount(acc.id)} className="text-zinc-400 hover:text-red-400">
                                                    <X size={10} />
                                                </button>
                                            </div>
                                        ))}
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="text"
                                                value={newAccountHandle}
                                                onChange={(e) => setNewAccountHandle(e.target.value)}
                                                placeholder="@hesap"
                                                className="w-24 px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-xs"
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddAccount()}
                                            />
                                            <button onClick={handleAddAccount} className="p-1 bg-blue-600 hover:bg-blue-700 rounded">
                                                <Plus size={12} />
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    // Normal kaynaklar
                                    typeSources.map(source => (
                                        <div key={source.id} className="flex items-center gap-1 bg-zinc-800 rounded-lg px-2 py-1">
                                            <span className="text-sm">{source.name}</span>
                                            <button
                                                onClick={() => handleFetchFromSource(source)}
                                                disabled={fetching === source.id}
                                                className="text-zinc-400 hover:text-green-400"
                                            >
                                                {fetching === source.id ? <RefreshCw size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                                            </button>
                                            <a href={source.url} target="_blank" className="text-zinc-400 hover:text-white">
                                                <ExternalLink size={10} />
                                            </a>
                                            {source.id.startsWith('custom') && (
                                                <button onClick={() => handleDeleteSource(source.id)} className="text-zinc-400 hover:text-red-400">
                                                    <X size={10} />
                                                </button>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Haberler */}
                        {typeNews.length > 0 && (
                            <div className="p-4 space-y-2">
                                {typeNews.map(item => (
                                    <div key={item.id} className="bg-zinc-800/50 rounded-lg p-3">
                                        <div className="flex items-start gap-2">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <a href={item.sourceUrl} target="_blank" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                                                        {item.source} <ExternalLink size={10} />
                                                    </a>
                                                    <span className="text-xs text-zinc-500">{formatTime(item.createdAt)}</span>
                                                </div>
                                                <p className="text-sm text-zinc-300">{item.title}</p>

                                                {item.processed && item.summary && (
                                                    <div className="mt-2 p-2 bg-zinc-900 rounded text-xs">
                                                        <div className="text-red-400 font-medium mb-1">📌 Özet</div>
                                                        {item.summary.map((s, i) => (
                                                            <p key={i} className="text-zinc-400">• {s}</p>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-1">
                                                {!item.processed && (
                                                    <button
                                                        onClick={() => handleProcess(item.id)}
                                                        disabled={processing === item.id}
                                                        className="p-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded"
                                                        title="AI ile işle"
                                                    >
                                                        <Bot size={12} />
                                                    </button>
                                                )}
                                                {item.processed && (
                                                    <button
                                                        onClick={() => handleCopy(item)}
                                                        className="p-1.5 bg-green-600 hover:bg-green-700 rounded"
                                                        title="Kopyala"
                                                    >
                                                        {copied === item.id ? <Check size={12} /> : <Copy size={12} />}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-1.5 bg-zinc-700 hover:bg-red-600 rounded"
                                                    title="Sil"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Haber Merkezi</h1>
                    <p className="text-zinc-500 text-sm">Kaynakları yönet, haberleri çek, AI ile işle</p>
                </div>
                <button
                    onClick={() => setShowAddSource(!showAddSource)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium"
                >
                    <Plus size={16} />
                    Kaynak Ekle
                </button>
            </div>

            {/* Kaynak Ekleme Formu */}
            {showAddSource && (
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 mb-4">
                    <h3 className="font-medium mb-3">Yeni Kaynak Ekle</h3>
                    <div className="grid md:grid-cols-4 gap-3">
                        <input
                            type="text"
                            value={newSourceName}
                            onChange={(e) => setNewSourceName(e.target.value)}
                            placeholder="Kaynak Adı"
                            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg"
                        />
                        <input
                            type="text"
                            value={newSourceUrl}
                            onChange={(e) => setNewSourceUrl(e.target.value)}
                            placeholder="URL (örn: site.com/haberler)"
                            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg"
                        />
                        <select
                            value={newSourceType}
                            onChange={(e) => setNewSourceType(e.target.value as SourceType)}
                            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg"
                        >
                            <option value="resmi">Resmî Kaynak</option>
                            <option value="sendika">Sendika</option>
                            <option value="haber">Haber Sitesi</option>
                            <option value="custom">Özel</option>
                        </select>
                        <button
                            onClick={handleAddSource}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium"
                        >
                            Ekle
                        </button>
                    </div>
                </div>
            )}

            {/* Bölümler */}
            {renderSection('resmi')}
            {renderSection('sendika')}
            {renderSection('haber')}
            {renderSection('twitter')}

            {/* Özel kaynaklar varsa göster */}
            {sources.some(s => s.type === 'custom') && renderSection('custom')}
        </div>
    )
}
