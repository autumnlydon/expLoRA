import { Button } from '@/components/Button'
import { Container } from '@/components/Container'

export function Hero() {
  return (
    <section className="pt-16 pb-24 sm:pt-24 sm:pb-32">
      <Container className="text-center">
        <h1 className="mx-auto max-w-4xl font-display text-5xl font-medium tracking-tight text-slate-900 sm:text-7xl">
          Create a clean, polished dataset.{' '}
          <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 bg-clip-text text-transparent">
            Ready for LoRA training.
          </span>
        </h1>
        <p className="mx-auto mt-8 max-w-2xl text-lg tracking-tight text-slate-700">
          Upload 10-25 images of your product. We'll return a zip file that is ready to use for training your own AI model using LoRa.
        </p>
        <div className="mt-12 flex flex-col items-center gap-8">
          <Button 
            href="/upload" 
            className="text-xl px-8 py-4 transform transition-all duration-200 shadow-lg hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 active:shadow-md"
          >
            Start Uploading For Free
          </Button>
          
          <div className="flex flex-col items-center text-slate-600">
            <p className="text-lg mb-3">
              Scroll to learn more
            </p>
            <svg 
              className="w-6 h-6 animate-bounce"
              fill="none" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
            </svg>
          </div>
        </div>
      </Container>
    </section>
  )
}
