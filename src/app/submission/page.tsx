'use client';

import { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { openDB } from 'idb';

export default function SubmissionPage() {
  const handleDownload = async () => {
    try {
      const zip = new JSZip();
      
      // Open IndexedDB and get data
      const db = await openDB('imageStore', 1);
      const productName = await db.get('images', 'productName') || 'untitled';
      const allImages = await db.getAll('images');
      const captions = await db.get('images', 'captions') || {};
      
      // Filter valid images and process them sequentially
      const imageEntries = allImages.filter(entry => entry && entry.preview);
      
      // Use Promise.all to ensure all files are added before generating zip
      await Promise.all(imageEntries.map(async (image, index) => {
        // Create sequential filename (IMG_01, IMG_02, etc.)
        const paddedIndex = String(index + 1).padStart(2, '0');
        const baseFileName = `IMG_${paddedIndex}`;
        
        // Add image
        if (image.preview) {
          const response = await fetch(image.preview);
          const imageBlob = await response.blob();
          zip.file(`${baseFileName}.png`, imageBlob);
        }
        
        // Add caption
        if (captions[image.id]) {
          zip.file(`${baseFileName}.txt`, captions[image.id]);
        }
      }));
      
      // Generate and download zip
      const safeProductName = productName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${safeProductName}_labelled_images.zip`);
      
    } catch (error) {
      console.error('Download failed:', error);
      alert(`Failed to create zip file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Download Labelled Images</h1>
      <button
        onClick={handleDownload}
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
      >
        Download Zip File
      </button>
    </div>
  );
} 