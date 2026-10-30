import { Skeleton } from '@/components/ui/skeleton'

export default function Loading(): React.ReactElement {
  return (
    <div className="mx-auto max-w-7xl space-y-4 p-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80" />
      <div className="grid gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  )
}
