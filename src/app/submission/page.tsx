'use client'

import { useState } from 'react'
import { Container } from '@/components/Container'
import { openDB } from 'idb'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

export default function SubmissionPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    try {
      setLoading(true)
      const zip = new JSZip()
      
      // Open IndexedDB and get data
      const db = await openDB('imageStore', 1)
      const productName = await db.get('images', 'productName') || 'untitled'
      const imageCount = await db.get('images', 'imageCount') as number
      const generatedCaptions = await db.get('images', 'generatedCaptions') as string[] // Get stored captions
      
      // Get all images and their captions
      const images = await Promise.all(
        Array.from(Array(imageCount).keys()).map(async (i) => {
          const imageData = await db.get('images', `image_${i}`)
          return {
            ...imageData,
            caption: generatedCaptions[i] // Add the caption from our stored captions
          }
        })
      )

      console.log('Images with captions:', images) // Debug log

      // Add each image and its caption to the zip
      await Promise.all(images.map(async (image, index) => {
        if (!image || !image.preview) return

        // Create padded number for filename (01, 02, etc.)
        const paddedIndex = String(index + 1).padStart(2, '0')
        const baseFileName = `IMG_${paddedIndex}`
        
        // Add image
        const response = await fetch(image.preview)
        const imageBlob = await response.blob()
        zip.file(`${baseFileName}.png`, imageBlob)
        
        // Add caption if it exists
        if (image.caption) {
          console.log(`Adding caption for ${baseFileName}:`, image.caption) // Debug log
          zip.file(`${baseFileName}.txt`, image.caption)
        }
      }))
      
      // Generate and download zip
      const safeProductName = productName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
      const content = await zip.generateAsync({ type: 'blob' })
      saveAs(content, `${safeProductName}_dataset.zip`)
      
    } catch (error) {
      console.error('Download error:', error)
      setError('Failed to generate download. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex flex-col min-h-screen">
      <div className="fixed inset-0 bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-blue-400/5" />
      
      <Container className="relative flex-grow pt-12 pb-16">
        <div className="mx-auto w-full max-w-2xl text-center">
          <h1 className="font-display text-4xl font-medium tracking-tight text-slate-900 sm:text-5xl">
            Your Dataset is Ready!
          </h1>
          <p className="mt-4 text-lg tracking-tight text-slate-700">
            Click the button below to download your dataset as a ZIP file.
          </p>

          {error && (
            <div className="mt-8 p-4 bg-red-50 text-red-600 rounded-lg">
              {error}
            </div>
          )}

          <button
            onClick={handleDownload}
            disabled={loading}
            className={`mt-8 inline-flex items-center gap-2 px-6 py-3 text-lg font-semibold text-white 
              rounded-lg transition-all duration-200
              ${loading 
                ? 'bg-blue-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
              }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle 
                    className="opacity-25" 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="4"
                  />
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Processing...
              </>
            ) : (
              <>
                Download Dataset
                <svg 
                  className="w-5 h-5" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              </>
            )}
          </button>
        </div>
      </Container>
    </div>
  )
} 