'use client'

import { useEffect, useState } from 'react'
import { Container } from '@/components/Container'

interface ProcessedImage {
  id: string
  name: string
  preview: string
  type?: string
}

export default function Results() {
  const [images, setImages] = useState<ProcessedImage[]>([])
  const [description, setDescription] = useState('')

  useEffect(() => {
    try {
      const imageCount = Number(sessionStorage.getItem('imageCount') || '0')
      const loadedImages = []
      
      // Load each image individually
      for (let i = 0; i < imageCount; i++) {
        const imageData = sessionStorage.getItem(`image_${i}`)
        if (imageData) {
          loadedImages.push(JSON.parse(imageData))
        }
      }
      
      console.log('First image preview:', loadedImages[0]?.preview?.substring(0, 50))
      setImages(loadedImages)
    } catch (error) {
      console.error('Failed to load images:', error)
    }
  }, [])

  return (
    <Container className="pt-12 pb-16">
      <div className="mx-auto max-w-[1800px]">
        <h1 className="text-3xl font-bold mb-6">Results</h1>
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
      </div>
    </Container>
  )
} 