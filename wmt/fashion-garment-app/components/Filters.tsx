'use client'

import { useState, useEffect, useMemo } from 'react'
import FilterChip from './FilterChip'
import type { ActiveFilters } from '@/app/dashboard/page'

interface Props {
  filters: ActiveFilters
  setFilter: (key: keyof ActiveFilters, value: string) => void
  clearAll: () => void
}

interface DynamicOptions {
  garment_types: string[]
  styles: string[]
  materials: string[]
  colors: string[]
  patterns: string[]
  seasons: string[]
  occasions: string[]
  consumer_profiles: string[]
  continents: string[]
  countries: string[]
  cities: string[]
  designers: string[]
  years: string[]
}

const EMPTY_OPTIONS: DynamicOptions = {
  garment_types: [], styles: [], materials: [], colors: [], patterns: [], seasons: [],
  occasions: [], consumer_profiles: [], continents: [], countries: [], cities: [],
  designers: [], years: [],
}

export default function Filters({ filters, setFilter, clearAll }: Props) {
  const [options, setOptions] = useState<DynamicOptions>(EMPTY_OPTIONS)

  useEffect(() => {
    const fetchOptions = async () => {
      const res = await fetch('/api/search?limit=1000')
      if (!res.ok) return
      const data = await res.json()
      if (!Array.isArray(data)) return

      const unique = <T>(arr: T[]): T[] => [...new Set(arr.filter(Boolean))]

      setOptions({
        garment_types:     unique(data.map((img: any) => img.ai_metadata?.garment_type)),
        styles:            unique(data.map((img: any) => img.ai_metadata?.style)),
        materials:         unique(data.map((img: any) => img.ai_metadata?.material)),
        colors:            unique(data.flatMap((img: any) =>
          Array.isArray(img.ai_metadata?.color_palette) ? img.ai_metadata.color_palette : []
        )),
        patterns:          unique(data.map((img: any) => img.ai_metadata?.pattern)),
        seasons:           unique(data.map((img: any) => img.ai_metadata?.season)),
        occasions:         unique(data.map((img: any) => img.ai_metadata?.occasion)),
        consumer_profiles: unique(data.map((img: any) => img.ai_metadata?.consumer_profile)),
        continents:        unique(data.map((img: any) => img.ai_metadata?.location_context?.continent)),
        countries:         unique(data.map((img: any) => img.ai_metadata?.location_context?.country)),
        cities:            unique(data.map((img: any) => img.ai_metadata?.location_context?.city)),
        designers:         unique(data.map((img: any) => img.designer).filter((d: any) => d && d.trim())),
        years:             unique(data.map((img: any) => String(new Date(img.created_at).getFullYear()))),
      })
    }
    fetchOptions()
  }, [])

  const hasActive = useMemo(
    () => Object.values(filters).some(v => v !== ''),
    [filters]
  )

  const ChipGroup = ({
    label, filterKey, values,
  }: { label: string; filterKey: keyof ActiveFilters; values: string[] }) => {
    if (!values.length) return null
    return (
      <div className="border-b border-gray-100 dark:border-gray-700 pb-3 last:border-0 last:pb-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
          {label}
        </p>
        <div className="flex flex-wrap gap-1">
          {values.map(v => (
            <FilterChip
              key={v}
              label={v}
              active={filters[filterKey] === v}
              onClick={() => setFilter(filterKey, filters[filterKey] === v ? '' : v)}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-y-auto max-h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">Filters</h2>
        {hasActive && (
          <button
            onClick={clearAll}
            className="text-xs text-red-500 hover:text-red-700 font-medium"
            data-testid="clear-filters"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <input
          type="text"
          aria-label="Search images"
          placeholder='e.g. "embroidered neckline"'
          value={filters.q}
          onChange={e => setFilter('q', e.target.value)}
          className="w-full px-3 py-2 border rounded text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          data-testid="search-input"
        />
      </div>

      {/* Filter chip groups */}
      <div className="px-4 py-3 space-y-4">
        <ChipGroup label="Garment Type"     filterKey="garment_type"     values={options.garment_types} />
        <ChipGroup label="Style"            filterKey="style"            values={options.styles} />
        <ChipGroup label="Material"         filterKey="material"         values={options.materials} />
        <ChipGroup label="Color"            filterKey="color"            values={options.colors} />
        <ChipGroup label="Pattern"          filterKey="pattern"          values={options.patterns} />
        <ChipGroup label="Season"           filterKey="season"           values={options.seasons} />
        <ChipGroup label="Occasion"         filterKey="occasion"         values={options.occasions} />
        <ChipGroup label="Consumer Profile" filterKey="consumer_profile" values={options.consumer_profiles} />
        <ChipGroup label="Location"         filterKey="continent"        values={options.continents} />
        <ChipGroup label="Country"          filterKey="country"          values={options.countries} />
        <ChipGroup label="City"             filterKey="city"             values={options.cities} />
        <ChipGroup label="Designer"         filterKey="designer"         values={options.designers} />
        <ChipGroup label="Year"             filterKey="year"             values={options.years} />
      </div>
    </div>
  )
}