/**
 * POST /api/admin/projects  — create a new project (website entry)
 * GET  /api/admin/projects  — list all projects
 *
 * Both endpoints require a valid API key:
 *   Authorization: Bearer sk_live_<key>
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { collection, addDoc, getDocs, query, orderBy, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { withApiKeyAuth } from '@/lib/api-key-auth'

const PROJECTS_COLLECTION = 'websites'

// ── Validation schema ────────────────────────────────────────────────────────

const CreateProjectSchema = z.object({
  /** Human-readable project title */
  name: z
    .string({ required_error: '"name" is required' })
    .trim()
    .min(1, '"name" cannot be empty')
    .max(120, '"name" must be ≤ 120 characters'),

  /** Short description of the project */
  description: z
    .string({ required_error: '"description" is required' })
    .trim()
    .min(1, '"description" cannot be empty')
    .max(500, '"description" must be ≤ 500 characters'),

  /** Optional public URL */
  url: z.string().url('"url" must be a valid URL').optional().or(z.literal('')),

  /** Optional image URL */
  image: z.string().url('"image" must be a valid URL').optional().or(z.literal('')),

  /** Category label */
  category: z.string().trim().max(60).optional().default('General'),

  /** Whether to feature the project on the homepage */
  featured: z.boolean().optional().default(false),
})

type CreateProjectInput = z.infer<typeof CreateProjectSchema>

// ── Helpers ──────────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function validationError(issues: z.ZodIssue[]) {
  return NextResponse.json(
    {
      error: 'Validation failed',
      issues: issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    },
    { status: 422, headers: CORS }
  )
}

// ── Route handlers ───────────────────────────────────────────────────────────

async function handleGet(_req: NextRequest) {
  try {
    const q = query(collection(db, PROJECTS_COLLECTION), orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    const projects = snap.docs.map((d) => {
      const data = d.data()
      return {
        id: d.id,
        name: data.title ?? data.name ?? '',
        description: data.description ?? '',
        url: data.url ?? '',
        image: data.image ?? '',
        category: data.category ?? '',
        featured: data.featured ?? false,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
      }
    })
    return NextResponse.json({ projects }, { headers: CORS })
  } catch (err) {
    console.error('[projects] GET error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500, headers: CORS }
    )
  }
}

async function handlePost(req: NextRequest) {
  // Parse body — guard against non-JSON payloads (n8n sometimes sends text/plain)
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'Request body must be valid JSON' },
      { status: 400, headers: CORS }
    )
  }

  // Validate
  const parsed = CreateProjectSchema.safeParse(raw)
  if (!parsed.success) {
    return validationError(parsed.error.issues)
  }

  const data: CreateProjectInput = parsed.data

  try {
    const docRef = await addDoc(collection(db, PROJECTS_COLLECTION), {
      title: data.name,
      description: data.description,
      url: data.url ?? '',
      image: data.image ?? '',
      category: data.category,
      featured: data.featured,
      createdAt: Timestamp.now(),
      source: req.headers.get('x-api-key-name') ?? 'api',
    })

    return NextResponse.json(
      {
        id: docRef.id,
        name: data.name,
        description: data.description,
        url: data.url ?? '',
        category: data.category,
        featured: data.featured,
      },
      { status: 201, headers: CORS }
    )
  } catch (err) {
    console.error('[projects] POST Firestore error:', err)
    return NextResponse.json(
      { error: 'Failed to save project' },
      { status: 500, headers: CORS }
    )
  }
}

// Apply auth middleware to both handlers
export const GET = withApiKeyAuth(handleGet)
export const POST = withApiKeyAuth(handlePost)

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS })
}
