import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/auth';

// ─── GET /api/collections ─────────────────────────────────────────────────────

export async function GET(_req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  const collections = await db.collection.findMany({
    where: { userId: user.id },
    include: {
      _count: { select: { bookmarks: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(collections);
}

// ─── POST /api/collections ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  const body: { name?: string; description?: string; emoji?: string } = await req.json();

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const collection = await db.collection.create({
    data: {
      userId: user.id,
      name: body.name.trim(),
      description: body.description ?? null,
      emoji: body.emoji ?? null,
    },
  });

  return NextResponse.json(collection, { status: 201 });
}
