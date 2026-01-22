import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createHash } from 'crypto'

// Basit admin kimlik bilgileri (gerçek uygulamada veritabanından gelecek)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@emekgundemi.com'
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || hashPassword('admin123') // Değiştirin!

function hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex')
}

function generateToken(): string {
    return createHash('sha256').update(Date.now().toString() + Math.random().toString()).digest('hex')
}

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json()

        if (!email || !password) {
            return NextResponse.json(
                { error: 'E-posta ve şifre gerekli' },
                { status: 400 }
            )
        }

        // Kimlik doğrulama
        const passwordHash = hashPassword(password)

        if (email !== ADMIN_EMAIL || passwordHash !== ADMIN_PASSWORD_HASH) {
            return NextResponse.json(
                { error: 'E-posta veya şifre hatalı' },
                { status: 401 }
            )
        }

        // Session token oluştur
        const token = generateToken()
        const cookieStore = await cookies()

        // Cookie'yi ayarla (7 gün geçerli)
        cookieStore.set('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 gün
            path: '/',
        })

        // Token'ı geçici olarak kaydet (gerçek uygulamada Redis veya DB)
        // Bu basit implementasyonda cookie varlığı yeterli olacak

        return NextResponse.json({
            success: true,
            message: 'Giriş başarılı'
        })
    } catch (error) {
        console.error('Login error:', error)
        return NextResponse.json(
            { error: 'Giriş işlemi başarısız' },
            { status: 500 }
        )
    }
}
