import 'server-only'
import { openaiFetch } from '@/lib/ai-usage'
import { env } from '@/lib/env'

/**
 * Cover art for Igani's social posts, made with OpenAI's image model. The art carries no text or logo: the reel job
 * lays the Igani logo, the "TRUE STORY" tag and the title over it, so every cover reads the same and nothing is misspelt.
 */
export function coverPrompt(title: string, story: string): string {
  return [
    `Vertical cover illustration for a short social media video titled "${title.slice(0, 120)}".`,
    `The story: ${story.slice(0, 600)}`,
    'Match Igani’s brand look: a premium, cinematic tech aesthetic on a deep navy-to-black background, lit by glossy electric-blue light (#2f6bff, #8db6f7): flowing glass ribbons, neon edge light, soft blue glow and reflections.',
    'Render the single most striking object or moment of the story in that style, as one clear hero subject: sculpted, glossy, high detail, dramatic rim light, shallow depth of field.',
    'Mostly navy, black and electric blue; at most one small warm accent.',
    'Keep the top-left corner and the bottom third calm and uncluttered: a logo and a title will be placed there.',
    'No text, letters, numbers, captions, logos, watermarks or brand marks anywhere. No real people’s likenesses.',
  ].join(' ')
}

/** Returns the generated image as base64 PNG (1024×1536). */
export async function generateCoverArt(title: string, story: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY is not set')
  const res = await openaiFetch('social-cover', 'https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: env().OPENAI_IMAGE_MODEL || 'gpt-image-1', prompt: coverPrompt(title, story), size: '1024x1536', quality: 'high', n: 1 }),
  })
  const j = (await res.json().catch(() => ({}))) as { data?: { b64_json?: string }[]; error?: { message?: string } }
  if (!res.ok || !j.data?.[0]?.b64_json) throw new Error(`OpenAI image: ${j.error?.message || res.status}`)
  return j.data[0].b64_json
}
