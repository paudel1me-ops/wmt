'use client'

import { useState } from 'react'
import ImageGrid from '@/components/ImageGrid'
import Filters from '@/components/Filters'

export interface ActiveFilters {
  q: string
  garment_type: string
  style: string
  material: string
  color: string
  pattern: string
  season: string
  occasion: string
  consumer_profile: string
  trend_notes: string
  continent: string
  country: string
  city: string
  designer: string
  year: string
  month: string
}

const EMPTY_FILTERS: ActiveFilters = {
  q: '', garment_type: '', style: '', material: '', color: '', pattern: '',
  season: '', occasion: '', consumer_profile: '', trend_notes: '',
  continent: '', country: '', city: '', designer: '', year: '', month: '',
}

export default function Dashboard() {
  const [filters, setFilters] = useState<ActiveFilters>(EMPTY_FILTERS)

  const setFilter = (key: keyof ActiveFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearAll = () => setFilters(EMPTY_FILTERS)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Fashion Gallery</h1>
            <a href="/upload" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Upload
            </a>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6 items-start">
          {/* Image grid — takes remaining width */}
          <div className="flex-1 min-w-0">
            <ImageGrid filters={filters} />
          </div>
          {/* Filter sidebar — fixed width, sticky */}
          <aside className="w-72 flex-shrink-0 sticky top-4">
            <Filters filters={filters} setFilter={setFilter} clearAll={clearAll} />
          </aside>
        </div>
      </main>
    </div>
  )
}