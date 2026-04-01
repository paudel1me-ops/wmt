'use client'

import { createClient } from '@supabase/supabase-js'
import { ReactNode, createContext, useContext } from 'react'

const SupabaseContext = createContext<any>(null)

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    ''
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ''

  const isPlaceholder = url.includes('your_supabase') || url.includes('<') || url.includes('>')
  let parsedUrl: URL | null = null

  try {
    parsedUrl = new URL(url)
  } catch {
    parsedUrl = null
  }

  if (!url || isPlaceholder || !anonKey || !parsedUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 text-red-900 p-6">
        <div className="max-w-xl text-center space-y-4">
          <h1 className="text-2xl font-bold">Supabase configuration error</h1>
          <p>
            NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is invalid or missing. Please set a valid value in{' '}
            <code>.env.local</code>.
          </p>
          <p>
            Example: <code>https://your-project.supabase.co</code>
          </p>
        </div>
      </div>
    )
  }

  const supabase = createClient(url, anonKey)

  return (
    <SupabaseContext.Provider value={supabase}>
      {children}
    </SupabaseContext.Provider>
  )
}

export function useSupabase() {
  const context = useContext(SupabaseContext)
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider')
  }
  return context
}