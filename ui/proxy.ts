import { auth } from '@/middleware-auth'
import { NextResponse } from 'next/server'

const publicPaths = ['/login', '/setup', '/api/auth', '/api/health', '/logo']

function isStaticPublicAsset(pathname: string): boolean {
  return pathname.startsWith('/logo/') || pathname === '/favicon.svg' || pathname === '/favicon.ico'
}

export default auth((req) => {
  const { pathname } = req.nextUrl

  if (isStaticPublicAsset(pathname)) {
    return NextResponse.next()
  }

  const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  if (!req.auth && !isPublic) {
    const login = new URL('/login', req.url)
    login.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(login)
  }

  if (req.auth && (pathname === '/login' || pathname === '/setup')) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
})

export const config = {
  // Exclude static public assets — unauthenticated requests to /logo/* must not redirect to /login
  matcher: ['/((?!_next/static|_next/image|favicon.ico|favicon.svg|logo/|api/health).*)'],
}
