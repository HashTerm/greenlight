import { cn } from '@/lib/utils'

export function PlatformIcon({
  className,
  iconSvg,
}: {
  className?: string
  iconSvg: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-flex size-4 shrink-0 [&_svg]:size-4', className)}
      dangerouslySetInnerHTML={{ __html: iconSvg }}
    />
  )
}
