import { NextResponse } from 'next/server';
import { getAlertLogs } from '../../../../lib/alert-logs';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { gameId } = await params;
  const logs = await getAlertLogs(gameId);
  return NextResponse.json({ gameId, alerts: logs });
}
