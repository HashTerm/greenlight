import { Footer } from '@/components/footer'
import { Header } from '@/components/header'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="container flex-1 py-6">{children}</main>
      <Footer />
    </div>
  )
}
