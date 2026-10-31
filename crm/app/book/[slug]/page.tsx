import { Logo } from '@/components/brand/Logo'
import { notFound } from 'next/navigation'
import { PublicBookingWidget } from '@/components/PublicBookingWidget'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function load(slug: string) {
  return prisma.bookingPage.findFirst({ where: { slug, active: true }, include: { host: { select: { name: true, image: true } } } })
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<{ title: string }> {
  const page = await load(params.slug)
  return { title: page?.title ?? 'Book a call' }
}

export default async function BookPage({ params }: { params: { slug: string } }): Promise<React.ReactElement> {
  const page = await load(params.slug)
  if (!page) notFound()
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-start p-4 sm:p-6 md:pt-20">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(216_74%_58%/0.18),transparent_60%)]" />
      <Card className="relative w-full max-w-xl">
        <CardHeader>
          <Logo height={28} className="mb-4 self-start" />
          <CardTitle className="text-2xl">{page.title}</CardTitle>
          <CardDescription>
            {page.durationMinutes} min · Google Meet{page.host.name ? ` · with ${page.host.name}` : ''}
            {page.requiresApproval ? ' · confirmed after review' : ''}
          </CardDescription>
          {page.description ? <p className="pt-2 text-sm text-muted-foreground">{page.description}</p> : null}
        </CardHeader>
        <CardContent>
          <PublicBookingWidget slug={page.slug} requiresApproval={page.requiresApproval} />
        </CardContent>
      </Card>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Scheduling by <a href="https://igani.co" className="underline-offset-4 hover:underline">Igani</a>
      </p>
    </main>
  )
}
