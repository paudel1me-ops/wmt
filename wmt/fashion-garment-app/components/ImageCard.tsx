'use client'

import { useState } from 'react'
import { Edit } from 'lucide-react'
import AnnotationModal from './AnnotationModal'

export interface ImageData {
  id: string
  file_url: string
  ai_description: string
  ai_metadata: any
  user_tags: string[]
  user_notes: string
  designer?: string
}

interface Props {
  image: ImageData
  onUpdate: (updated: ImageData) => void
}

export default function ImageCard({ image, onUpdate }: Props) {
  const [showModal, setShowModal] = useState(false)

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden mb-4"
      data-testid="image-card"
    >
      <div className="w-full aspect-[4/5] overflow-hidden bg-gray-100 dark:bg-gray-700">
        <img
          src={image.file_url}
          alt={image.ai_description}
          className="w-full h-full object-cover object-center"
        />
      </div>
      <div className="p-4">
        <p className="text-sm text-gray-600 dark:text-gray-300 text-justify leading-relaxed" data-testid="ai-description">
          {image.ai_description}
        </p>

        {/* AI-generated attributes */}
        <div className="mt-2 flex flex-wrap gap-1">
          {image.ai_metadata?.garment_type && (
            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
              {image.ai_metadata.garment_type}
            </span>
          )}
          {image.ai_metadata?.style && (
            <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
              {image.ai_metadata.style}
            </span>
          )}
          {image.ai_metadata?.location_context?.city && (
            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
              {image.ai_metadata.location_context.city}
            </span>
          )}
        </div>

        {/* User annotations — clearly labelled */}
        {image.user_tags?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {image.user_tags.map(tag => (
              <span
                key={tag}
                className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                data-testid="user-tag"
              >
                user: {tag}
              </span>
            ))}
          </div>
        )}
        {image.user_notes && (
          <p className="mt-1 text-xs text-gray-500 italic" data-testid="user-notes">
            Note: {image.user_notes}
          </p>
        )}

        {/* Designer attribution */}
        {image.designer && (
          <p className="mt-1 text-xs text-gray-400" data-testid="designer">
            By {image.designer}
          </p>
        )}

        <button
          onClick={() => setShowModal(true)}
          data-testid="annotate-button"
          className="mt-3 text-blue-600 hover:text-blue-800 text-sm flex items-center"
        >
          <Edit className="w-4 h-4 mr-1" />
          Annotate
        </button>
      </div>

      {showModal && (
        <AnnotationModal
          image={image}
          onClose={() => setShowModal(false)}
          onSaved={onUpdate}
        />
      )}
    </div>
  )
}