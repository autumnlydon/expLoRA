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
  const [currentPage, setCurrentPage] = useState(1)
  const imagesPerPage = 9
  const [images, setImages] = useState<ProcessedImage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generatingCaptions, setGeneratingCaptions] = useState(false)
  const router = useRouter()

  // Initial load of images without captions
  useEffect(() => {
    const loadImages = async () => {
      try {
        const db = await initDB()
        const imageCount = await db.get('images', 'imageCount') as number
        
        const loadedImages = await Promise.all(
          Array.from(Array(imageCount).keys()).map(async (i) => {
            const imageData = await db.get('images', `image_${i}`)
            return imageData
          })
        )
        
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

  // Handle continue button click
  const handleContinue = async () => {
    try {
      setGeneratingCaptions(true)
      const db = await initDB()
      
      // Get product name and trigger word from IndexedDB
      const productName = await db.get('images', 'productName')
      const triggerWord = await db.get('images', 'triggerWord')

      // Generate captions
      const generatedCaptions = await generateCaptionsSequentially(
        images,
        productName,
        triggerWord
      )

      // Store captions in IndexedDB
      await db.put('images', generatedCaptions, 'generatedCaptions')
      console.log('Stored AI captions:', generatedCaptions)

      // Navigate to labelling page
      router.push('/labelling')
    } catch (error) {
      console.error('Failed to generate captions:', error)
      setError('Failed to generate captions. Please try again.')
    } finally {
      setGeneratingCaptions(false)
    }
  }

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

              <div className="mt-8 flex justify-center">
                <button
                  onClick={handleContinue}
                  disabled={loading || generatingCaptions}
                  className="w-full max-w-md flex items-center justify-center rounded-lg bg-blue-600 px-6 py-4 text-lg font-medium text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingCaptions ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating Captions...
                    </>
                  ) : (
                    'Continue to Labelling'
                  )}
                </button>
              </div>

              {error && (
                <div className="mt-4 text-center text-red-600">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
      </Container>
    </div>
  )
} 