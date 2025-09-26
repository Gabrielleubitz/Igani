import { NextResponse } from 'next/server';
import 'server-only';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // TODO: read JSON body and run repo creation
    // const body = await req.json();

    // Validate env at runtime, not build time
    const required = [
      'GITHUB_APP_ID',
      'GITHUB_APP_PRIVATE_KEY',
      'GITHUB_APP_CLIENT_ID',
      'GITHUB_APP_CLIENT_SECRET'
    ];
    const missing = required.filter(k => !process.env[k]);
    if (missing.length) {
      return NextResponse.json(
        { error: `Missing env: ${missing.join(', ')}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('create-repo error:', e?.message);
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}