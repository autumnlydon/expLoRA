'use client'

import { useEffect, useState } from 'react'
import { Container } from '@/components/Container'
import { openDB } from 'idb'
import { useRouter } from 'next/navigation'

interface ProcessedImage {
  id: string
  name: string
  preview: string
}

export default function Labelling() {
  const [images, setImages] = useState<ProcessedImage[]>([])
  const [captions, setCaptions] = useState<{[key: string]: string}>({})
  const [editedCaptions, setEditedCaptions] = useState<{[key: string]: string}>({})
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const loadData = async () => {
      try {
        const db = await openDB('imageStore', 1)
        const imageCount = await db.get('images', 'imageCount') || 0
        const storedCaptions = await db.get('images', 'captions') || {}
        
        const loadedImages = []
        for (let i = 0; i < imageCount; i++) {
          const imageData = await db.get('images', `image_${i}`)
          if (imageData) loadedImages.push(imageData)
        }
        
        setImages(loadedImages)
        setCaptions(storedCaptions)
        setEditedCaptions(storedCaptions)
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  const handleCaptionEdit = (imageId: string, newCaption: string) => {
    setEditedCaptions(prev => ({
      ...prev,
      [imageId]: newCaption
    }))
  }

  const saveChanges = async () => {
    try {
      const db = await openDB('imageStore', 1)
      await db.put('images', editedCaptions, 'captions')
      setCaptions(editedCaptions)
      alert('Changes saved successfully!')
    } catch (error) {
      console.error('Failed to save changes:', error)
      alert('Failed to save changes')
    }
  }

  const handleSubmit = async () => {
    for (const [imageId, caption] of Object.entries(captions)) {
      const textContent = caption;
      const blob = new Blob([textContent], { type: 'text/plain' });
      const fileName = `IMG_${imageId.padStart(2, '0')}.txt`;
      
      await window.localStorage.setItem(`caption_${fileName}`, textContent);
    }
    
    router.push('/submission');
  };

  if (isLoading) return <div>Loading...</div>

  return (
    <Container className="pt-12 pb-16">
      <div className="mx-auto max-w-[1800px]">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Image Labelling</h1>
          <button
            onClick={saveChanges}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Save Changes
          </button>
          <button 
            onClick={handleSubmit}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Submit Labels
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-8">
          {images.map((image) => (
            <div key={image.id} className="flex gap-6">
              <div className="w-1/2">
                <img
                  src={image.preview}
                  alt={image.name}
                  className="max-w-full h-auto rounded-lg shadow-md"
                />
              </div>
              <div className="w-1/2">
                <textarea
                  value={editedCaptions[image.id] || ''}
                  onChange={(e) => handleCaptionEdit(image.id, e.target.value)}
                  className="w-full h-48 p-4 border rounded-md"
                  placeholder="Enter caption..."
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Container>
  )
} 