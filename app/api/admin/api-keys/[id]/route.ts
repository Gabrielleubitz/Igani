import { NextRequest, NextResponse } from 'next/server'
import { deleteApiKeyRecord } from '@/lib/api-keys'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

/** DELETE /api/admin/api-keys/:id — revoke a key */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Missing key ID' }, { status: 400, headers: CORS })
    }
    await deleteApiKeyRecord(id)
    return NextResponse.json({ success: true }, { headers: CORS })
  } catch (err) {
    console.error('[api-keys] DELETE error:', err)
    return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500, headers: CORS })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS })
}
