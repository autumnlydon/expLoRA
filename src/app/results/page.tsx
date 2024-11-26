'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Container } from '@/components/Container'
import { useRouter } from 'next/navigation'
import { openDB } from 'idb'

interface ProcessedImage {
  id: string
  name: string
  preview: string
  caption: string
}

const initDB = async () => {
  return openDB('imageStore', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images')
      }
    },
  })
}

export default function Results() {
  const [images, setImages] = useState<ProcessedImage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const loadImages = async () => {
      try {
        const db = await initDB()
        const imageCount = await db.get('images', 'imageCount') as number
        const productName = await db.get('images', 'productName') as string
        
        if (!imageCount) {
          throw new Error('No images found')
        }

        const loadedImages = await Promise.all(
          Array.from(Array(imageCount).keys()).map(async (i) => {
            const imageData = await db.get('images', `image_${i}`)
            return imageData as ProcessedImage
          })
        )

        const generatedCaptions = await Promise.all(
          loadedImages.map(async (image) => {
            const response = await fetch('/api/openai', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                prompt: `Create a prompt for the following images, describing everything except the ${productName}. Describe the scene, background, lighting, style, and any props & objects. Instead of describing the ${productName}, refer to it as ${productName}. Start each prompt with the prefix sentence “A photo of ${productName} in different colors at different angles”. Adjust the prefix based on the colors or angles or number of ${productName}, for ex “A Photo of a Red ${productName}”.`,
                image: image.preview,
                productName
              }),
            })

            if (!response.ok) {
              throw new Error('Failed to generate caption')
            }

            const data = await response.json()
            return data.result
          })
        )

        await db.put('images', generatedCaptions, 'generatedCaptions')
        console.log('Stored AI captions:', generatedCaptions)

        setImages(loadedImages.filter(Boolean))
        setLoading(false)
      } catch (error) {
        console.error('Failed to load images:', error)
        setError('Failed to load images. Please try uploading again.')
        setLoading(false)
      }
    }

    loadImages()
  }, [])

  return (
    <div className="relative flex flex-col min-h-screen">
      <div className="fixed inset-0 bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-blue-400/5" />
      
      <Container className="relative flex-grow pt-12 pb-16">
        <div className="mx-auto w-full">
          <div className="text-center mb-8">
            <h1 className="font-display text-4xl font-medium tracking-tight text-slate-900 sm:text-5xl">
              Image Processing Results
            </h1>
            <p className="mt-4 text-lg tracking-tight text-slate-700 max-w-2xl mx-auto">
              Your images have been processed successfully. Click continue to add captions to your images.
            </p>
          </div>

          {error ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-red-100 shadow-xl shadow-red-100/20 ring-1 ring-red-100/50">
              <p className="text-red-500 text-center">{error}</p>
            </div>
          ) : loading ? (
            <div className="flex justify-center items-center min-h-[200px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-blue-100 shadow-xl shadow-blue-100/20 ring-1 ring-blue-100/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {images.map((image, index) => (
                  <div key={image.id || index} className="relative group">
                    <div className="relative rounded-xl overflow-hidden bg-white shadow-md hover:shadow-xl transition-all duration-200 flex flex-col">
                      <div className="relative aspect-square w-full">
                        <Image
                          src={image.preview}
                          alt={`Image ${index + 1}`}
                          fill
                          className="object-contain p-4"
                        />
                      </div>
                      <div className="p-4 bg-white/50 backdrop-blur-sm border-t border-blue-100/20">
                        <p className="text-sm md:text-base xl:text-lg font-medium text-slate-700">
                          {`IMG_${String(index + 1).padStart(2, '0')}.png`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-12 flex justify-center">
  <button
    onClick={() => router.push('/labelling')}
    className="group relative flex items-center justify-center gap-2 rounded-xl 
    bg-blue-100/30 backdrop-blur-2xl
    px-8 py-4 text-lg font-semibold text-blue-900
    shadow-lg shadow-blue-100/30
    border-2 border-white/50
    hover:bg-blue-100/40 hover:border-white/60 hover:scale-[1.02]
    transform transition-all duration-200"
  >
    Continue to Labelling
    <svg 
      className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M13 7l5 5m0 0l-5 5m5-5H6"
      />
    </svg>
  </button>
</div>
            </div>
          )}
        </div>
      </Container>
    </div>
  )
} 