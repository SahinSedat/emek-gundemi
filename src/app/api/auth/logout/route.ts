import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
    const cookieStore = await cookies()

    // Auth cookie'yi sil
    cookieStore.delete('auth_token')

    return NextResponse.json({
        success: true,
        message: 'Çıkış yapıldı'
    })
}
