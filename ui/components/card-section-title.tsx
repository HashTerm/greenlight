import type { LucideIcon } from 'lucide-react'

import { CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type CardSectionTitleProps = {
  icon: LucideIcon
  children: React.ReactNode
  className?: string
}

export function CardSectionTitle({ icon: Icon, children, className }: CardSectionTitleProps) {
  return (
    <CardTitle className={cn('flex items-center gap-2', className)}>
      <Icon className="size-4 text-muted-foreground" />
      {children}
    </CardTitle>
  )
}
