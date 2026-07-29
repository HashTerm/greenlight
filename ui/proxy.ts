import { auth } from '@/middleware-auth'
import { NextResponse } from 'next/server'

const publicPaths = ['/login', '/setup', '/api/auth', '/api/health']

export default auth((req) => {
  const { pathname } = req.nextUrl
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
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/health).*)'],
}
