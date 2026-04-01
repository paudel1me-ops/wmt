'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Loader } from 'lucide-react'
import { useRouter } from 'next/navigation'

type UploadStatus = 'idle' | 'classifying' | 'success' | 'error'

export default function ImageUploader() {
  const [files, setFiles] = useState<File[]>([])
  const [designer, setDesigner] = useState('')
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [inputKey, setInputKey] = useState(0)
  const router = useRouter()

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length) {
      const firstError = rejectedFiles[0]?.errors?.[0]?.code
      if (firstError === 'file-too-large') {
        setErrorMessage('File too large. Maximum size is 10 MB.')
      } else if (firstError === 'file-invalid-type') {
        setErrorMessage('Invalid file type. Please upload an image.')
      } else {
        setErrorMessage('Could not accept that file.')
      }
      setStatus('error')
      return
    }
    setErrorMessage('')
    setStatus('idle')
    setFiles(acceptedFiles)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxSize: 10 * 1024 * 1024,
    multiple: true,
  })

  const handleUpload = async () => {
    if (!files.length) return
    setStatus('classifying')
    setErrorMessage('')

    const failures: string[] = []
    for (const file of files) {
      const formData = new FormData()
      formData.append('image', file)
      if (designer.trim()) formData.append('designer', designer.trim())

      const res = await fetch('/api/classify', { method: 'POST', body: formData })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        failures.push(body?.error ?? `Failed: ${file.name}`)
      }
    }

    if (failures.length) {
      setErrorMessage(failures.join('; '))
      setStatus('error')
    } else {
      setFiles([])
      setDesigner('')
      setInputKey(k => k + 1)
      setStatus('success')
      setTimeout(() => router.push('/dashboard'), 1200)
    }
  }

  return (
    <div className="w-full space-y-4">
      <div
        {...getRootProps()}
        data-testid="dropzone"
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} data-testid="file-input" key={inputKey} />
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          {isDragActive ? 'Drop the files here…' : 'Drag & drop images, or click to select'}
        </p>
        <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WEBP — max 10 MB each</p>
      </div>

      {/* Optional designer attribution */}
      <div>
        <label htmlFor="designer-input" className="block text-sm font-medium text-gray-700 mb-1">
          Designer / Photographer (optional)
        </label>
        <input
          id="designer-input"
          type="text"
          value={designer}
          onChange={e => setDesigner(e.target.value)}
          placeholder="e.g. Jane Smith"
          data-testid="designer-input"
          className="w-full px-3 py-2 border rounded text-sm dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* File preview list */}
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, index) => (
            <li key={index} className="flex items-center space-x-2">
              <img
                src={URL.createObjectURL(file)}
                alt={file.name}
                className="w-16 h-16 object-cover rounded"
              />
              <span className="text-sm text-gray-600">{file.name}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Status messages */}
      {status === 'success' && (
        <p className="text-green-700 font-medium text-sm" data-testid="upload-success">
          Upload successful — redirecting to gallery…
        </p>
      )}
      {status === 'error' && (
        <p className="text-red-700 text-sm" data-testid="upload-error">
          {errorMessage || 'Upload failed.'}
        </p>
      )}

      {files.length > 0 && status !== 'success' && (
        <button
          onClick={handleUpload}
          disabled={status === 'classifying'}
          data-testid="upload-button"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded disabled:opacity-50 flex items-center justify-center hover:bg-blue-700"
        >
          {status === 'classifying' ? (
            <>
              <Loader className="animate-spin mr-2 h-4 w-4" />
              Classifying…
            </>
          ) : (
            'Upload & Classify'
          )}
        </button>
      )}
    </div>
  )
}