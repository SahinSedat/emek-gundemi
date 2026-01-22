'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Settings, LogOut } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' })
        router.push('/login')
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white">
            {/* Üst Bar */}
            <header className="fixed top-0 left-0 right-0 h-14 bg-zinc-900 border-b border-zinc-800 z-50">
                <div className="flex items-center justify-between h-full px-6 max-w-6xl mx-auto">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                            <span className="font-bold">E</span>
                        </div>
                        <span className="font-semibold">Emek Gündemi</span>
                    </div>

                    <nav className="flex items-center gap-1">
                        <Link
                            href="/admin/dashboard"
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === '/admin/dashboard' ? 'bg-red-600' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                                }`}
                        >
                            <LayoutDashboard size={16} />
                            Ana Panel
                        </Link>
                        <Link
                            href="/admin/settings"
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === '/admin/settings' ? 'bg-red-600' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                                }`}
                        >
                            <Settings size={16} />
                            Ayarlar
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg text-sm font-medium transition-colors ml-2"
                        >
                            <LogOut size={16} />
                            Çıkış
                        </button>
                    </nav>
                </div>
            </header>

            {/* İçerik */}
            <main className="pt-14 min-h-screen">
                <div className="p-6">
                    {children}
                </div>
            </main>
        </div>
    )
}
