'use client'

import { BrandedPage } from '@/components/brand/BrandedPage'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }): React.ReactElement {
  return (
    <BrandedPage wide>
      <Card>
        <CardHeader>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>An unexpected error occurred. Try again, or contact an admin if it keeps happening.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error.digest ? <p className="font-mono text-xs text-muted-foreground">Ref: {error.digest}</p> : null}
          <div className="flex gap-2">
            <Button onClick={reset}>Try again</Button>
            <Button variant="outline" asChild>
              <a href="/">Home</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </BrandedPage>
  )
}
