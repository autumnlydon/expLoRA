'use client'

import { Container } from '@/components/Container'

export function Header() {
  return (
    <header className="pt-6 pb-0">
      <Container>
        <div className="flex justify-start">
          <h1 className="text-xl font-semibold tracking-tight">
            <span className="text-slate-900">exp</span>
            <span className="text-blue-700">LoRA</span>
          </h1>
        </div>
      </Container>
    </header>
  )
}
