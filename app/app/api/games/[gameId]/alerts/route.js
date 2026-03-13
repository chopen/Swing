import { NextResponse } from 'next/server';
import db from '../../../../../lib/db';

export async function GET(request, { params }) {
  const { gameId } = await params;
  const database = db.initDb();

  const rows = database
    .prepare('SELECT * FROM alerts WHERE game_id = ? ORDER BY detected_at')
    .all(gameId);

  return NextResponse.json(rows);
}
