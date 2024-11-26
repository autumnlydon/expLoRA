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
  caption?: string
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

export default function Labelling() {
  const [images, setImages] = useState<ProcessedImage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    loadImages()
  }, [])

  const loadImages = async () => {
    try {
      const db = await initDB()
      const imageCount = await db.get('images', 'imageCount') as number
      const generatedCaptions = await db.get('images', 'generatedCaptions') as string[]
      
      console.log('Generated Captions:', generatedCaptions)
      
      if (!imageCount) {
        throw new Error('No images found')
      }

      const loadedImages = await Promise.all(
        Array.from(Array(imageCount).keys()).map(async (i) => {
          const imageData = await db.get('images', `image_${i}`) as ProcessedImage
          return {
            ...imageData,
            caption: generatedCaptions?.[i] || ''
          }
        })
      )

      console.log('Loaded Images with Captions:', loadedImages)
      setImages(loadedImages.filter(Boolean))
      setLoading(false)
    } catch (error) {
      console.error('Failed to load images:', error)
      setError('Failed to load images. Please try uploading again.')
      setLoading(false)
    }
  }

  const handleCaptionChange = async (index: number, caption: string) => {
    try {
      const updatedImages = [...images]
      updatedImages[index] = { ...updatedImages[index], caption }
      setImages(updatedImages)

      // Auto-save to IndexedDB
      const db = await initDB()
      await db.put('images', updatedImages[index], `image_${index}`)
    } catch (error) {
      console.error('Failed to save caption:', error)
    }
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)
      router.push('/download')
    } catch (error) {
      console.error('Failed to process labels:', error)
      setError('Failed to process labels. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex flex-col min-h-screen">
      <div className="fixed inset-0 bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-blue-400/5" />
      
      <Container className="relative flex-grow pt-12 pb-16">
        <div className="mx-auto w-full">
          <div className="text-center mb-8">
            <h1 className="font-display text-4xl font-medium tracking-tight text-slate-900 sm:text-5xl">
              Label Your Images
            </h1>
            <p className="mt-4 text-lg tracking-tight text-slate-700 max-w-2xl mx-auto">
              Add descriptive labels to your images. These will be used to train the AI model.
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Images Column */}
                <div className="flex flex-col gap-4">
                  <h2 className="text-xl font-semibold text-slate-900">Images</h2>
                  {images.map((image, index) => (
                    <div key={image.id || index} className="h-[250px]"> {/* Reduced height */}
                      <div className="relative rounded-xl overflow-hidden bg-white shadow-md h-full">
                        <div className="relative h-[200px]"> {/* Reduced image height */}
                          <Image
                            src={image.preview}
                            alt={`Image ${index + 1}`}
                            fill
                            className="object-contain p-3"
                          />
                        </div>
                        <div className="p-2 bg-white/50 backdrop-blur-sm border-t border-blue-100/20">
                          <p className="text-sm text-center text-slate-600">
                            {`IMG_${String(index + 1).padStart(2, '0')}.png`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Captions Column */}
                <div className="flex flex-col gap-4">
                  <h2 className="text-xl font-semibold text-slate-900">Captions</h2>
                  {images.map((image, index) => (
                    <div key={image.id || index} className="h-[250px]"> {/* Matching reduced height */}
                      <div className="rounded-xl overflow-hidden bg-white shadow-md p-4 h-full">
                        <p className="text-sm text-slate-600 mb-2">
                          {`IMG_${String(index + 1).padStart(2, '0')}.png`}
                        </p>
                        <textarea
                          value={image.caption ?? ''}
                          onChange={(e) => handleCaptionChange(index, e.target.value)}
                          placeholder="Enter a description for this image..."
                          className="w-full h-[180px] rounded-lg border-slate-200 bg-white/50 
                            focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200
                            resize-none p-3 text-slate-700 placeholder-slate-400"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-12 flex justify-center">
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="group relative flex items-center justify-center gap-2 rounded-xl 
                    bg-white/30 backdrop-blur-xl
                    px-8 py-4 text-lg font-semibold text-slate-800
                    shadow-lg shadow-blue-100/30 border border-white/40
                    hover:bg-white/40 hover:border-white/50 hover:scale-[1.02]
                    transform transition-all duration-200
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    <>
                      Submit Labels
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
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </Container>
    </div>
  )
} 