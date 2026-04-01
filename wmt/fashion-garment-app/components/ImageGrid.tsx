'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Masonry from 'react-masonry-css'
import InfiniteScroll from 'react-infinite-scroll-component'
import ImageCard from './ImageCard'
import type { ActiveFilters } from '@/app/dashboard/page'

interface Image {
  id: string
  file_url: string
  ai_description: string
  ai_metadata: any
  user_tags: string[]
  user_notes: string
  designer?: string
}

interface Props {
  filters: ActiveFilters
}

function buildQueryString(filters: ActiveFilters, offset: number, limit: number): string {
  const params = new URLSearchParams()
  params.set('offset', String(offset))
  params.set('limit', String(limit))
  const keys = Object.keys(filters) as (keyof ActiveFilters)[]
  for (const k of keys) {
    if (filters[k]) params.set(k, filters[k])
  }
  return params.toString()
}

const PAGE_SIZE = 20

export default function ImageGrid({ filters }: Props) {
  const [images, setImages] = useState<Image[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const fetchIdRef = useRef(0)

  // Reset and reload whenever filters change; cancel stale in-flight fetches
  useEffect(() => {
    let active = true
    const fetchId = ++fetchIdRef.current
    setImages([])
    setOffset(0)
    setHasMore(true)

    const load = async () => {
      const qs = buildQueryString(filters, 0, PAGE_SIZE)
      const res = await fetch(`/api/search?${qs}`)
      if (!active || fetchIdRef.current !== fetchId) return
      if (!res.ok) { setHasMore(false); return }
      const data = await res.json()
      if (!active || fetchIdRef.current !== fetchId) return
      if (!Array.isArray(data)) { setHasMore(false); return }
      setImages(data)
      setOffset(data.length)
      setHasMore(data.length === PAGE_SIZE)
    }

    load()
    return () => { active = false }
  }, [filters])

  const loadMore = useCallback(async () => {
    const fetchId = ++fetchIdRef.current
    const qs = buildQueryString(filters, offset, PAGE_SIZE)
    const res = await fetch(`/api/search?${qs}`)
    if (fetchIdRef.current !== fetchId) return
    if (!res.ok) { setHasMore(false); return }
    const data = await res.json()
    if (fetchIdRef.current !== fetchId) return
    if (!Array.isArray(data)) { setHasMore(false); return }
    setImages(prev => {
      const seen = new Set(prev.map(i => i.id))
      return [...prev, ...data.filter((i: Image) => !seen.has(i.id))]
    })
    setOffset(offset + data.length)
    setHasMore(data.length === PAGE_SIZE)
  }, [filters, offset])

  const refreshImage = (updated: Image) => {
    setImages(prev => prev.map(img => img.id === updated.id ? updated : img))
  }

  const breakpointColumnsObj = {
    default: 5,
    1100: 4,
    700: 3,
    500: 2,
  }

  return (
    <div>
      {images.length === 0 && !hasMore && (
        <p className="text-center text-gray-400 py-16" data-testid="empty-state">
          No images found. Try adjusting filters or upload some photos.
        </p>
      )}
      <InfiniteScroll
        dataLength={images.length}
        next={loadMore}
        hasMore={hasMore}
        loader={<p className="text-center py-4 text-sm text-gray-400">Loading...</p>}
      >
        <Masonry
          breakpointCols={breakpointColumnsObj}
          className="my-masonry-grid"
          columnClassName="my-masonry-grid_column"
        >
          {images.map(image => (
            <ImageCard key={image.id} image={image} onUpdate={refreshImage} />
          ))}
        </Masonry>
      </InfiniteScroll>
    </div>
  )
}