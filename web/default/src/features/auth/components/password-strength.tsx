import { useMemo } from 'react'
import { cn } from '@/lib/utils'

type PasswordStrength = 0 | 1 | 2 | 3 | 4

interface PasswordStrengthProps {
  password: string
  className?: string
}

function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) return 0

  let score = 0

  // Length check
  if (password.length >= 8) score++
  if (password.length >= 12) score++

  // Character variety
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++

  return Math.max(1, score) as PasswordStrength
}

export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const strength = useMemo(() => calculatePasswordStrength(password), [password])

  return (
    <div className={cn('lm-strength', `s${strength}`, className)}>
      <i />
      <i />
      <i />
      <i />
    </div>
  )
}
