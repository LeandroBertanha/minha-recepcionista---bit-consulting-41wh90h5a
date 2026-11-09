import { ProductLogo } from './ProductLogo'

interface BrandLogoProps {
  className?: string
  compact?: boolean
}

export function BrandLogo({ className }: BrandLogoProps) {
  return <ProductLogo tone="light" className={className} />
}
