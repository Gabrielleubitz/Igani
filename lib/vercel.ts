// Vercel REST API client: read recent deployments and trigger a redeploy via a deploy hook.
const API = 'https://api.vercel.com'

export interface VercelDeployment {
  id: string
  url: string
  state: string
  target: string | null
  createdAt: number
  commit: string | null
}

export function isVercelConfigured(): boolean {
  return !!(process.env.VERCEL_API_TOKEN && process.env.VERCEL_PROJECT_ID)
}

export async function listDeployments(limit = 10): Promise<VercelDeployment[]> {
  const token = process.env.VERCEL_API_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID
  if (!token || !projectId) throw new Error('VERCEL_API_TOKEN and VERCEL_PROJECT_ID are not set')

  const qs = new URLSearchParams({ projectId, limit: String(Math.min(Math.max(limit, 1), 50)) })
  if (process.env.VERCEL_TEAM_ID) qs.set('teamId', process.env.VERCEL_TEAM_ID)

  const res = await fetch(`${API}/v6/deployments?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Vercel API responded ${res.status}`)

  const data = await res.json()
  return (data.deployments ?? []).map((d: any) => ({
    id: d.uid,
    url: d.url,
    state: d.state ?? d.readyState,
    target: d.target ?? null,
    createdAt: d.createdAt ?? d.created,
    commit: d.meta?.githubCommitSha ?? null,
  }))
}

export async function triggerRedeploy(): Promise<{ jobId: string | null }> {
  const hook = process.env.VERCEL_DEPLOY_HOOK_URL
  if (!hook || !hook.startsWith('https://api.vercel.com/v1/integrations/deploy/')) {
    throw new Error('VERCEL_DEPLOY_HOOK_URL is not set or is not a Vercel deploy hook')
  }
  const res = await fetch(hook, { method: 'POST' })
  if (!res.ok) throw new Error(`Vercel deploy hook responded ${res.status}`)
  const data = await res.json().catch(() => ({}))
  return { jobId: data?.job?.id ?? null }
}
