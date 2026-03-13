import { NextResponse } from 'next/server';
import db from '../../../../../lib/db';

export async function GET(request, { params }) {
  const { gameId } = await params;
  const database = db.initDb();

  const rows = database
    .prepare('SELECT * FROM momentum_snapshots WHERE game_id = ? ORDER BY snapshot_index')
    .all(gameId);

  return NextResponse.json(rows);
}
