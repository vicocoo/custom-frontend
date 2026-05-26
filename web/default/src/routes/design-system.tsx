import { createFileRoute } from '@tanstack/react-router'
import { DesignSystemPreview } from '@/features/design-system'

export const Route = createFileRoute('/design-system')({
  component: DesignSystemPreview,
})
