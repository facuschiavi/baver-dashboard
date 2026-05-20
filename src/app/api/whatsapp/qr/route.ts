import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';

function getProfile(): string {
  // Detect profile from the dashboard path: /var/www/clients/{client}/dashboard/
  const parts = process.cwd().split('/');
  const idx = parts.indexOf('clients');
  if (idx >= 0 && idx + 1 < parts.length) {
    return 'vib3-' + parts[idx + 1];
  }
  return process.env.OPENCLAW_PROFILE || 'vib3-demo';
}

export async function POST(req: NextRequest) {
  try {
    const profile = getProfile();
    const body = await req.json().catch(() => ({}));
    const force = body?.force === true;
    const params = JSON.stringify({ force, timeoutMs: 30000 });
    const out = execSync(
      `openclaw --profile "${profile}" gateway call web.login.start --json --params '${params}' --timeout 30000 2>/dev/null || openclaw --profile "${profile}" gateway call web.login.start --params '${params}' --timeout 30000 2>/dev/null || echo '{"error":"gateway_no_respondio"}'`,
      { timeout: 35000, encoding: 'utf-8', shell: '/bin/bash' }
    );
    const data = JSON.parse(out.trim());
    const connected = data?.connected === true || (typeof data?.message === 'string' && data.message.includes('linked'));
    return NextResponse.json({ ok: true, ...data, connected });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: (e.message || String(e)).substring(0, 200) }, { status: 500 });
  }
}
