import type { LucideIcon } from 'lucide-react'

type PageHeaderProps = {
  icon: LucideIcon
  title: string
  description?: string
  actions?: React.ReactNode
}

export function PageHeader({ icon: Icon, title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-5" />
        </div>
        <div>
          <h1>{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions}
    </div>
  )
}
