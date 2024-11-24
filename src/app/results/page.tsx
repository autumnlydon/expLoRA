'use client'

import { useEffect, useState } from 'react'
import { Container } from '@/components/Container'
import { openDB } from 'idb'
import JSZip from 'jszip'

interface ProcessedImage {
  id: string
  name: string
  preview: string
}

export default function Results() {
  const [images, setImages] = useState<ProcessedImage[]>([])
  const [productName, setProductName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadImages = async () => {
      try {
        const db = await openDB('imageStore', 1)
        const imageCount = await db.get('images', 'imageCount') || 0
        const loadedProductName = await db.get('images', 'productName') || ''
        setProductName(loadedProductName)
        
        console.log('Found', imageCount, 'images in storage')
        
        const loadedImages = []
        for (let i = 0; i < imageCount; i++) {
          const imageData = await db.get('images', `image_${i}`)
          if (imageData) {
            loadedImages.push(imageData)
          }
        }
        
        setImages(loadedImages)
      } catch (error) {
        console.error('Failed to load images:', error)
        setError('Failed to load images. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    loadImages()
  }, [])

  const handleDownload = async () => {
    try {
      setIsDownloading(true)
      const zip = new JSZip()
      
      for (const image of images) {
        const response = await fetch(image.preview)
        const blob = await response.blob()
        zip.file(image.name, blob)
      }
      
      const content = await zip.generateAsync({ type: 'blob' })
      const url = window.URL.createObjectURL(content)
      const a = document.createElement('a')
      a.href = url
      const safeProductName = productName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
      a.download = `${safeProductName}_images.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
      setError('Failed to download images. Please try again.')
    } finally {
      setIsDownloading(false)
    }
  }

  if (error) {
    return (
      <Container className="pt-12 pb-16">
        <div className="text-red-500">{error}</div>
      </Container>
    )
  }

  return (
    <Container className="pt-12 pb-16">
      <div className="mx-auto max-w-[1800px]">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Results</h1>
            {productName && (
              <h2 className="text-xl text-gray-600 mt-2">{productName}</h2>
            )}
          </div>
          {images.length > 0 && (
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
            >
              {isDownloading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating ZIP...
                </span>
              ) : (
                'Download All Images'
              )}
            </button>
          )}
        </div>

        {error && (
          <div className="text-red-500 mb-4">{error}</div>
        )}

        {isLoading ? (
          <div>Loading images...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {images.map((image) => (
              <div key={image.id} className="flex flex-col items-center">
                <img
                  src={image.preview}
                  alt={image.name}
                  className="max-w-full h-auto rounded-lg shadow-md"
                  style={{ maxHeight: '300px', objectFit: 'contain' }}
                />
                <p className="mt-2 text-sm text-gray-600">
                  {image.name}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Container>
  )
} 