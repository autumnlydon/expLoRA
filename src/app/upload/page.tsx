'use client'

import { useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { Container } from '@/components/Container'

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

export default function Upload() {
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<ImageFile[]>([])

  useEffect(() => {
    const savedImages = localStorage.getItem('uploadedImages')
    if (savedImages) {
      setFiles(JSON.parse(savedImages))
    }
  }, [])

  useEffect(() => {
    if (files.length > 0) {
      localStorage.setItem('uploadedImages', JSON.stringify(files))
    }
  }, [files])

  const checkImageDimensions = async (file: File): Promise<ImageFile> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const img = new window.Image()
        img.src = reader.result as string
        img.onload = () => {
          const imageFile: ImageFile = file
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
      reader.readAsDataURL(file)
    })
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    const imageFiles = droppedFiles.filter(file => file.type.startsWith('image/'))
    
    Promise.all(imageFiles.map(checkImageDimensions))
      .then(processedFiles => setFiles(prev => [...prev, ...processedFiles]))
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      Promise.all(newFiles.map(checkImageDimensions))
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

  return (
    <Container className="pt-12 pb-16">
      <div className="mx-auto max-w-[1800px]">
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
        )}
      </div>
    </Container>
  )
} 