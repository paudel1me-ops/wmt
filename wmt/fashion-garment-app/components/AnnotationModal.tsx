'use client'

import { useState } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import type { ImageData } from './ImageCard'

interface Props {
  image: ImageData
  onClose: () => void
  onSaved: (updated: ImageData) => void
}

export default function AnnotationModal({ image, onClose, onSaved }: Props) {
  const [tags, setTags] = useState(image.user_tags?.join(', ') || '')
  const [notes, setNotes] = useState(image.user_notes || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const supabase = useSupabase()

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean)
    const { data, error: dbError } = await supabase
      .from('images')
      .update({ user_tags: tagArray, user_notes: notes })
      .eq('id', image.id)
      .select()
      .single()

    setSaving(false)
    if (dbError) {
      setError(dbError.message)
      return
    }
    onSaved({ ...image, user_tags: tagArray, user_notes: notes, ...data })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      data-testid="annotation-modal"
    >
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full">
        <h3 className="text-lg font-semibold mb-1">Edit Annotations</h3>
        <p className="text-xs text-gray-500 mb-4">
          Your tags and notes are separate from AI-generated attributes.
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Tags <span className="text-gray-400 font-normal">(comma separated)</span>
          </label>
          <input
            type="text"
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="e.g. summer, floral, bohemian"
            data-testid="annotation-tags-input"
            className="w-full px-3 py-2 border rounded text-sm dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Observations, context, inspirations…"
            data-testid="annotation-notes-input"
            className="w-full px-3 py-2 border rounded text-sm dark:bg-gray-700 dark:text-white"
            rows={3}
          />
        </div>

        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded text-sm hover:bg-gray-300"
            data-testid="annotation-cancel"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            data-testid="annotation-save"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}