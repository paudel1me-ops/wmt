import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // No auth enforcement in POC mode.
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

