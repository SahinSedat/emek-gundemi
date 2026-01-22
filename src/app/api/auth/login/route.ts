import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createHash } from 'crypto'

// Admin giriş bilgileri
const ADMIN_EMAIL = 'sdat.sahin@gmail.com'
const ADMIN_PASSWORD = 'Kamulog.34'

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
        if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
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
            secure: false, // HTTP için false
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        })

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
