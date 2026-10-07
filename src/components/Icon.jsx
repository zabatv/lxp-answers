import { HugeiconsIcon } from '@hugeicons/react'

// Иконки Hugeicons с общими размерами по умолчанию.
export default function Icon({ icon, size = 16, strokeWidth = 1.8, ...rest }) {
  return <HugeiconsIcon icon={icon} size={size} strokeWidth={strokeWidth} aria-hidden="true" {...rest} />
}
