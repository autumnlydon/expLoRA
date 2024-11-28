'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Container } from '@/components/Container'
import { useRouter } from 'next/navigation'
import { openDB } from 'idb'
import { fetchWithRetry } from '@/utils/api'

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

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const generateCaptionsSequentially = async (
  loadedImages: ProcessedImage[],
  productName: string,
  triggerWord: string
) => {
  const captions = [];
  
  for (const image of loadedImages) {
    try {
      const data = await fetchWithRetry('/api/openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: image.preview,
          productName,
          triggerWord
        }),
      });
      
      captions.push(data.result);
      await delay(1000); // Add 1 second delay between successful requests
    } catch (error) {
      console.error('Failed to generate caption:', error);
      captions.push('Failed to generate caption');
    }
  }
  
  return captions;
};

export default function Results() {
  const [images, setImages] = useState<ProcessedImage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalImages, setTotalImages] = useState(0)
  const imagesPerPage = 9
  const router = useRouter()

  useEffect(() => {
    const loadImages = async () => {
      try {
        const db = await initDB()
        const imageCount = await db.get('images', 'imageCount') as number
        const productName = await db.get('images', 'productName') as string
        const triggerWord = await db.get('images', 'triggerWord') as string
        
        if (!imageCount) {
          throw new Error('No images found')
        }

        const loadedImages = await Promise.all(
          Array.from(Array(imageCount).keys()).map(async (i) => {
            const imageData = await db.get('images', `image_${i}`)
            return imageData as ProcessedImage
          })
        )

        const generatedCaptions = []
        for (const image of loadedImages) {
          try {
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            const response = await fetch('/api/openai', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                image: image.preview,
                productName,
                triggerWord
              }),
            })

            if (!response.ok) {
              throw new Error('Failed to generate caption')
            }

            const data = await response.json()
            generatedCaptions.push(data.result)
          } catch (error) {
            console.error('Failed to generate caption:', error)
            generatedCaptions.push('Failed to generate caption')
          }
        }

        await db.put('images', generatedCaptions, 'generatedCaptions')
        console.log('Stored AI captions:', generatedCaptions)
        
        setImages(loadedImages)
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
                {images
                  .slice((currentPage - 1) * imagesPerPage, currentPage * imagesPerPage)
                  .map((image, index) => (
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

              <div className="mt-8 flex items-center justify-center gap-4">
  <button
    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
    disabled={currentPage === 1}
    className="px-4 py-2 rounded-lg bg-blue-100 text-blue-900 disabled:opacity-50"
  >
    Previous
  </button>
  <span className="px-4 py-2">
    Page {currentPage} of {Math.ceil(images.length / imagesPerPage)}
  </span>
  <button
    onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(images.length / imagesPerPage)))}
    disabled={currentPage >= Math.ceil(images.length / imagesPerPage)}
    className="px-4 py-2 rounded-lg bg-blue-100 text-blue-900 disabled:opacity-50"
  >
    Next
  </button>
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