'use client'

import { useState } from 'react'
import { Key, Save, Eye, EyeOff, CheckCircle } from 'lucide-react'

export default function SettingsPage() {
    const [showKeys, setShowKeys] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    const [settings, setSettings] = useState({
        openaiKey: '',
        telegramToken: '',
        telegramChannel: '@emekgundemi',
    })

    const handleSave = async () => {
        setSaving(true)
        await new Promise(r => setTimeout(r, 1500))
        setSaving(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
    }

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-2">Ayarlar</h1>
            <p className="text-zinc-500 mb-8">API anahtarları ve platform ayarları</p>

            {saved && (
                <div className="mb-6 p-4 bg-green-900/30 border border-green-800 rounded-lg flex items-center gap-3">
                    <CheckCircle size={20} className="text-green-400" />
                    <span className="text-green-300">Ayarlar kaydedildi!</span>
                </div>
            )}

            <div className="space-y-6">
                {/* OpenAI */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
                    <h2 className="font-semibold mb-4 flex items-center gap-2">
                        <Key size={18} className="text-green-400" />
                        OpenAI (ChatGPT)
                    </h2>
                    <div>
                        <label className="block text-sm text-zinc-400 mb-2">API Key</label>
                        <input
                            type={showKeys ? 'text' : 'password'}
                            value={settings.openaiKey}
                            onChange={(e) => setSettings({ ...settings, openaiKey: e.target.value })}
                            placeholder="sk-..."
                            className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                        <p className="text-xs text-zinc-500 mt-2">
                            <a href="https://platform.openai.com/api-keys" target="_blank" className="text-red-400 hover:underline">
                                OpenAI Platform
                            </a>
                            &apos;dan alabilirsiniz
                        </p>
                    </div>
                </div>

                {/* Telegram */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
                    <h2 className="font-semibold mb-4 flex items-center gap-2">
                        <span className="text-blue-400">📨</span>
                        Telegram
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-zinc-400 mb-2">Bot Token</label>
                            <input
                                type={showKeys ? 'text' : 'password'}
                                value={settings.telegramToken}
                                onChange={(e) => setSettings({ ...settings, telegramToken: e.target.value })}
                                placeholder="123456789:ABC..."
                                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                            <p className="text-xs text-zinc-500 mt-2">@BotFather&apos;dan alabilirsiniz</p>
                        </div>
                        <div>
                            <label className="block text-sm text-zinc-400 mb-2">Kanal ID</label>
                            <input
                                type="text"
                                value={settings.telegramChannel}
                                onChange={(e) => setSettings({ ...settings, telegramChannel: e.target.value })}
                                placeholder="@kanal_adi"
                                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Butonlar */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setShowKeys(!showKeys)}
                        className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
                    >
                        {showKeys ? <EyeOff size={18} /> : <Eye size={18} />}
                        {showKeys ? 'Gizle' : 'Göster'}
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg font-medium"
                    >
                        <Save size={18} />
                        {saving ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                </div>
            </div>
        </div>
    )
}
