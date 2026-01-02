import { NextResponse } from 'next/server';

// Debug-mode no-op logger for serverless (avoid FS writes)
export async function POST(request: Request) {
  try {
    // Consume body to avoid stream warnings
    await request.json().catch(() => ({}));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

