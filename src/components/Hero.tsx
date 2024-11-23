import { Button } from '@/components/Button'
import { Container } from '@/components/Container'

export function Hero() {
  return (
    <Container className="pb-16 pt-20 text-center lg:pt-32">
      <h1 className="mx-auto max-w-4xl font-display text-5xl font-medium tracking-tight text-slate-900 sm:text-7xl">
        Create a clean, polished dataset. Ready for LoRA training.
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg tracking-tight text-slate-700">
        Upload 10-25 images of your product. We'll return a zip file that is ready to use for training your own AI model using LoRa.
      </p>
      <div className="mt-10 flex justify-center gap-x-6">
        <Button href="/upload">Start Uploading For Free</Button>
      </div>

    </Container>
  )
}
