'use client'

import { useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { Container } from '@/components/Container'
import { useRouter } from 'next/navigation'
import { openDB } from 'idb'

const MIN_RESOLUTION = 900

interface ImageFile extends File {
  preview?: string
  dimensions?: {
    width: number
    height: number
  }
  isValid?: boolean
  id?: string
}

interface FormData {
  description: string
  images: ImageFile[]
}

// Add this helper function at the top level
const initDB = async () => {
  return openDB('imageStore', 1, {
    upgrade(db) {
      // Create the store if it doesn't exist
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images')
      }
    },
  })
}

// Modify the convertToPNG function to ensure we keep the base64 data
const convertToPNG = (file: File, index: number): Promise<ImageFile> => {
  return new Promise((resolve) => {
    const img = new window.Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(img, 0, 0)
      
      const base64Data = canvas.toDataURL('image/png')
      
      // Create padded number for filename (01, 02, etc.)
      const paddedIndex = String(index + 1).padStart(2, '0')
      const newFileName = `IMG_${paddedIndex}.png`
      
      const imageFile: ImageFile = new File(
        [file], 
        newFileName,  // Use our new filename
        { type: 'image/png' }
      ) as ImageFile
      
      imageFile.preview = base64Data
      imageFile.dimensions = {
        width: img.width,
        height: img.height
      }
      imageFile.id = crypto.randomUUID()
      imageFile.isValid = img.width >= MIN_RESOLUTION && img.height >= MIN_RESOLUTION

      resolve(imageFile)
    }
    img.src = URL.createObjectURL(file)
  })
}

// Modify your checkImageDimensions function to include conversion
const checkImageDimensions = async (file: File, index: number): Promise<ImageFile> => {
  const pngFile = await convertToPNG(file, index)
  
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const img = new window.Image()
      img.src = reader.result as string
      img.onload = () => {
        const imageFile: ImageFile = pngFile
        imageFile.preview = reader.result as string
        imageFile.dimensions = {
          width: img.width,
          height: img.height
        }
        imageFile.isValid = img.width >= MIN_RESOLUTION && img.height >= MIN_RESOLUTION
        imageFile.id = crypto.randomUUID()
        resolve(imageFile)
      }
    }
    reader.readAsDataURL(pngFile)
  })
}

export default function Upload() {
  const router = useRouter()
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<ImageFile[]>([])
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [productName, setProductName] = useState('')

  useEffect(() => {
    // Clear old images when component mounts fresh (not from back navigation)
    if (!document.referrer.includes('/results')) {
      sessionStorage.removeItem('processedImages')
      sessionStorage.removeItem('imageDescription')
      setFiles([])
    } else {
      // Only load from storage if coming back from results page
      const savedImages = sessionStorage.getItem('processedImages')
      if (savedImages) {
        setFiles(JSON.parse(savedImages))
      }
    }
  }, [])

  // Modify your useEffect for storage
  useEffect(() => {
    if (files.length > 0) {
      const storeImages = async () => {
        try {
          const db = await initDB()
          
          // Clear existing images
          await Promise.all(
            Array.from(Array(await db.get('images', 'imageCount') || 0).keys())
              .map(i => db.delete('images', `image_${i}`))
          )
          
          // Store new images
          await Promise.all(files.map(async (file, index) => {
            await db.put('images', {
              id: file.id,
              name: file.name,
              preview: file.preview
            }, `image_${index}`)
          }))
          
          // Store the count
          await db.put('images', files.length, 'imageCount')
          
          console.log('Successfully stored', files.length, 'images')
        } catch (error) {
          console.error('Failed to store images:', error)
        }
      }

      storeImages()
    }
  }, [files])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    const imageFiles = droppedFiles.filter(file => file.type.startsWith('image/'))
    
    // Pass index to convertToPNG
    Promise.all(imageFiles.map((file, index) => convertToPNG(file, index)))
      .then(processedFiles => setFiles(prev => [...prev, ...processedFiles]))
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      // Pass index to convertToPNG
      Promise.all(newFiles.map((file, index) => convertToPNG(file, index)))
        .then(processedFiles => setFiles(prev => [...prev, ...processedFiles]))
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDeleteImage = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const db = await initDB()
      
      // Store the product name
      await db.put('images', productName, 'productName')
      console.log('Stored product name:', productName) // Debug log
      
      // Store the files
      await Promise.all(files.map(async (file, index) => {
        await db.put('images', {
          id: file.id,
          name: file.name,
          preview: file.preview
        }, `image_${index}`)
      }))
      
      await db.put('images', files.length, 'imageCount')
      
      router.push('/results')
    } catch (error) {
      console.error('Submission failed:', error)
      alert('Failed to process images. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative flex flex-col min-h-screen">
      <div className="fixed inset-0 bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-blue-400/5" />
      
      <Container className="relative flex-grow pt-12 pb-16">
        <div className="mx-auto max-w-[1800px]">
          <div className="text-center mb-8">
            <h1 className="font-display text-4xl font-medium tracking-tight text-slate-900 sm:text-5xl">
              Upload Your Images
            </h1>
            <p className="mt-4 text-lg tracking-tight text-slate-700 max-w-2xl mx-auto">
              Upload your images to get started. We accept all image formats up to 10MB per file.
            </p>
          </div>

          <div className="max-w-2xl mx-auto mb-12 bg-blue-50/70 rounded-2xl p-6 border border-blue-100 shadow-lg shadow-blue-100/50">
            <h2 className="font-display text-lg font-medium text-slate-900 mb-4">
              Guidelines
            </h2>
            <ul className="space-y-3 text-slate-700">
              <li className="flex items-start">
                <span className="text-blue-500 mr-3">•</span>
                <span>Your images will go through a test to see if they are at least {MIN_RESOLUTION}px in both width and height, so don't worry about picking the perfect ones just yet.</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-3">•</span>
                <span>Try to upload a variety of angles and settings of images to get the best results.</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-3">•</span>
                <span>Upload all photos at once for the best experience.</span>
              </li>
            </ul>
          </div>

          <div
            className={`
              relative border-2 border-dashed rounded-2xl p-12
              flex flex-col items-center justify-center
              min-h-[300px] w-full mb-12
              transition-all duration-200 ease-in-out
              ${isDragging 
                ? 'border-blue-500 bg-blue-50/50' 
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
              }
            `}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="mb-4">
              <svg
                className={`mx-auto h-12 w-12 ${isDragging ? 'text-blue-500' : 'text-slate-400'}`}
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileInput}
              className="hidden"
              id="fileInput"
            />

            <div className="text-center space-y-2">
              <div>
                <label
                  htmlFor="fileInput"
                  className="relative cursor-pointer rounded-md font-medium text-lg text-blue-600 hover:text-blue-500"
                >
                  Upload files
                </label>
                <span className="text-slate-700 text-lg"> or drag and drop</span>
              </div>
              <p className="text-slate-500 text-sm">
                Any format up to 10MB
              </p>
            </div>
          </div>

          {files.length > 0 && (
            <>
              <div className="mt-16 max-w-[1800px] mx-auto">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-blue-100 shadow-xl shadow-blue-100/20 ring-1 ring-blue-100/50">
                  <h2 className="text-2xl font-medium text-slate-900 mb-6">
                    Uploaded Images
                  </h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {files.map((file, index) => (
                      <div key={index} className="relative group min-h-[200px]">
                        <button
                          onClick={() => handleDeleteImage(index)}
                          className="absolute -right-2 -top-2 z-10 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg opacity-0 group-hover:opacity-100 focus:opacity-100"
                        >
                          ×
                        </button>
                        <div className={`
                          relative rounded-xl overflow-hidden bg-white shadow-md hover:shadow-xl transition-all duration-200
                          min-h-[200px] flex items-center justify-center p-4
                          ${!file.isValid ? 'ring-2 ring-red-500' : 'hover:scale-[1.02]'}
                        `}>
                          <Image
                            src={file.preview || ''}
                            alt={`Preview ${index + 1}`}
                            width={file.dimensions?.width}
                            height={file.dimensions?.height}
                            className="max-w-full max-h-[300px] w-auto h-auto object-contain"
                          />
                          {!file.isValid && (
                            <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white text-sm py-2 px-3 backdrop-blur-sm bg-opacity-90">
                              Image must be at least {MIN_RESOLUTION}px in both dimensions
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="mt-8 max-w-2xl mx-auto">
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-blue-100 shadow-xl shadow-blue-100/20 ring-1 ring-blue-100/50 space-y-6">
                    <div>
                      <label 
                        htmlFor="productName" 
                        className="block text-base font-medium text-slate-900 mb-2"
                      >
                        Product Name
                      </label>
                      <input
                        id="productName"
                        type="text"
                        className="w-full rounded-lg border-slate-200 bg-white/50 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200"
                        placeholder="Enter product name..."
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div>
                      <label 
                        htmlFor="description" 
                        className="block text-base font-medium text-slate-900 mb-2"
                      >
                        Product Description
                      </label>
                      <textarea
                        id="description"
                        rows={4}
                        className="w-full rounded-lg border-slate-200 bg-white/50 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200"
                        placeholder="Enter a description of your product..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center rounded-lg bg-blue-600 px-6 py-4 text-lg font-medium text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 hover:shadow-xl transition-all duration-200"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Processing...' : 'Continue'}
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </Container>
    </div>
  )
} 