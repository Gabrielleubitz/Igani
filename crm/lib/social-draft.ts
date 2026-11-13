/** A generated post: the words drawn on the video, the caption and the hashtags. Shared by the server and the browser. */
export const SOCIAL_VISUALS = ['pipeline', 'recording', 'analysis', 'manager'] as const
export type SocialVisual = (typeof SOCIAL_VISUALS)[number]

export type SocialDraft = {
  topic: string
  visual: SocialVisual
  hook: string
  sub: string
  points: string[]
  cta: string
  caption: string
  hashtags: string[]
}

/** What goes in the caption box: the caption, a blank line, the hashtags. */
export const fullCaption = (d: Pick<SocialDraft, 'caption' | 'hashtags'>): string => `${d.caption.trim()}\n\n${d.hashtags.join(' ')}`.trim()
