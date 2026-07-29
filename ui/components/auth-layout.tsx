import { Footer } from '@/components/footer'
import { Logo } from '@/components/logo'

export function AuthLayout({
  children,
  subtitle,
  title,
}: {
  children: React.ReactNode
  title: string
  subtitle: string
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <Logo href="/login" />
            <div>
              <h1 className="font-heading text-2xl font-semibold tracking-tight">{title}</h1>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          {children}
        </div>
      </main>
      <Footer />
    </div>
  )
}
