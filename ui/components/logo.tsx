import Image from 'next/image'
import Link from 'next/link'

import { cn } from '@/lib/utils'

type LogoProps = {
  className?: string
  showLabel?: boolean
  href?: string
}

export function Logo({ className, showLabel = true, href = '/dashboard' }: LogoProps) {
  return (
    <Link className={cn('inline-flex items-center gap-2 text-foreground', className)} href={href}>
      <Image
        alt="Greenlight"
        className="admin-logo-mark--dark"
        height={40}
        priority
        src="/logo/greenlight-mark-dark.svg"
        width={40}
      />
      <Image
        alt="Greenlight"
        className="admin-logo-mark--light"
        height={40}
        priority
        src="/logo/greenlight-mark-light.svg"
        width={40}
      />
      {showLabel ? (
        <span className="font-heading text-base font-semibold">Greenlight Admin</span>
      ) : null}
    </Link>
  )
}
