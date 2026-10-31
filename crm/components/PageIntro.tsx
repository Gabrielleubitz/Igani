/** Page title with a one-line plain-English explanation of what the page is for. */
export function PageIntro({ title, hint, className = '' }: { title: string; hint: string; className?: string }): React.ReactElement {
  return (
    <div className={className}>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
    </div>
  )
}
