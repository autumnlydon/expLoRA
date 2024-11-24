'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Container } from '@/components/Container'

interface ProcessedImage {
  preview: string
  name: string
  id: string
}

export default function Results() {
  const [images, setImages] = useState<ProcessedImage[]>([])
  const [description, setDescription] = useState('')

  useEffect(() => {
    try {
      // Combine chunks
      const chunk1 = sessionStorage.getItem('processedImages_1')
      const chunk2 = sessionStorage.getItem('processedImages_2')
      const storedDescription = sessionStorage.getItem('imageDescription')
      
      const images1 = chunk1 ? JSON.parse(chunk1) : []
      const images2 = chunk2 ? JSON.parse(chunk2) : []
      setImages([...images1, ...images2])
      
      if (storedDescription) {
        setDescription(storedDescription)
      }
    } catch (error) {
      console.error('Error loading images:', error)
    }
  }, [])

  if (images.length === 0) {
    return (
      <Container className="pt-12 pb-16">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">No processed images found</h1>
          <p>Please upload images first</p>
        </div>
      </Container>
    )
  }

  return (
    <Container className="pt-12 pb-16">
      <div className="mx-auto max-w-[1800px]">
        <h1 className="text-3xl font-bold mb-6">Results</h1>
        {description && (
          <p className="mb-8 text-gray-600">{description}</p>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {images.map((image) => (
            <div key={image.id} className="relative">
              <Image
                src={image.preview}
                alt={image.name}
                width={400}
                height={400}
                className="rounded-lg"
              />
              <p className="mt-2 text-sm text-gray-600">{image.name}</p>
            </div>
          ))}
        </div>
      </div>
    </Container>
  )
} 