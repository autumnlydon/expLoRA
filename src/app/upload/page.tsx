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
    <Container className="pt-12 pb-16">
      <div className="mx-auto max-w-[1800px]">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-3">Image Upload</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Upload your images to get started. Each image must be at least {MIN_RESOLUTION}px in both width and height. 
            We accept PNG, JPG, and GIF formats up to 10MB per file.
          </p>
        </div>

        <div
          className={`
            border-2 border-dashed rounded-xl p-8
            flex flex-col items-center justify-center
            min-h-[250px] w-full
            mb-8 mt-4
            transition-all duration-200 ease-in-out
            ${isDragging 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="mb-4">
            <svg
              className={`mx-auto h-12 w-12 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`}
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
              <span className="text-gray-500 text-lg"> or drag and drop</span>
            </div>
            <p className="text-gray-500 text-sm">
              PNG, JPG, GIF up to 10MB
            </p>
          </div>
        </div>

        {files.length > 0 && (
          <>
            <div className="mt-6">
              <h2 className="text-2xl font-semibold mb-6">Uploaded Images</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 auto-rows-auto">
                {files.map((file, index) => (
                  <div key={index} className="relative group">
                    <button
                      onClick={() => handleDeleteImage(index)}
                      className="absolute -right-2 -top-2 z-10 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      ×
                    </button>
                    <div className={`relative rounded-lg overflow-hidden ${
                      !file.isValid ? 'border-4 border-red-500' : ''
                    }`}>
                      <Image
                        src={file.preview || ''}
                        alt={`Preview ${index + 1}`}
                        width={file.dimensions?.width}
                        height={file.dimensions?.height}
                        className="w-full h-auto"
                      />
                      {!file.isValid && (
                        <div className="absolute bottom-0 left-0 right-0 bg-red-500/80 text-white text-sm py-3 text-center">
                          Image must be at least {MIN_RESOLUTION}px in both dimensions
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-12 max-w-2xl mx-auto">
              <div className="mb-6">
                <label 
                  htmlFor="productName" 
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Enter Name of Product
                </label>
                <input
                  id="productName"
                  type="text"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter product name..."
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  required
                />
              </div>
              
              <div className="mb-6">
                <label 
                  htmlFor="description" 
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Product Description
                </label>
                <textarea
                  id="description"
                  rows={4}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter a description of your product..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="w-full flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </form>
          </>
        )}
      </div>
    </Container>
  )
} 