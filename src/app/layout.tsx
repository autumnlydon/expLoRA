import { type Metadata } from 'next'
import { Inter, Lexend } from 'next/font/google'
import clsx from 'clsx'

import '@/styles/tailwind.css'
import { IndexedDBCleanup } from '@/components/IndexedDBCleanup'

export const metadata: Metadata = {
  title: {
    template: '%s - ExpLoRA',
    default: 'expLoRA - Create a clean, polished dataset. Ready for LoRA training.  ',
  },
  description:
    'LoRA training is hard. We make it easy.',
}

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const lexend = Lexend({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-lexend',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={clsx(
        'h-full scroll-smooth bg-white antialiased',
        inter.variable,
        lexend.variable,
      )}
    >
      <body className="flex h-full flex-col">
        <IndexedDBCleanup />
        {children}
      </body>
    </html>
  )
}
