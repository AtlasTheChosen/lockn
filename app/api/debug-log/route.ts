import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const LOG_PATH = path.join(process.cwd(), '.cursor', 'debug.log');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const line = JSON.stringify({
      ...body,
      timestamp: body?.timestamp ?? Date.now(),
    }) + '\n';

    await fs.mkdir(path.dirname(LOG_PATH), { recursive: true });
    await fs.appendFile(LOG_PATH, line, 'utf8');

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'write_failed' },
      { status: 500 }
    );
  }
}

