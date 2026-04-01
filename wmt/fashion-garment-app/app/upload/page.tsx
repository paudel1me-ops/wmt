import ImageUploader from '@/components/ImageUploader'

export default function UploadPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-8">Upload Garment</h1>
        <ImageUploader />
      </div>
    </div>
  )
}