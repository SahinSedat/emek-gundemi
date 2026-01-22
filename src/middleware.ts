import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Login ve API rotalarını atla
    if (pathname === '/login' || pathname.startsWith('/api/auth')) {
        return NextResponse.next()
    }

    // Admin rotalarında auth kontrolü
    if (pathname.startsWith('/admin') || pathname === '/') {
        const token = request.cookies.get('auth_token')

        if (!token) {
            // Giriş yapılmamış, login'e yönlendir
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match paths except:
         * - _next (Next.js internals)
         * - static files
         * - api routes (except auth check)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
    ],
}
