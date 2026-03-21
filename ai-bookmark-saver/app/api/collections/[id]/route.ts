import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/auth';

// ─── GET /api/collections/[id] ───────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  const collection = await db.collection.findFirst({
    where: { id: params.id, userId: user.id },
    include: { _count: { select: { bookmarks: true } } },
  });

  if (!collection) {
    return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
  }

  return NextResponse.json(collection);
}

// ─── PATCH /api/collections/[id] ─────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  const collection = await db.collection.findFirst({
    where: { id: params.id, userId: user.id },
  });

  if (!collection) {
    return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
  }

  const body: { name?: string; description?: string | null; emoji?: string | null } =
    await req.json();

  const updated = await db.collection.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined && { name: body.name.trim() }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.emoji !== undefined && { emoji: body.emoji }),
    },
  });

  return NextResponse.json(updated);
}

// ─── DELETE /api/collections/[id] ────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  const collection = await db.collection.findFirst({
    where: { id: params.id, userId: user.id },
  });

  if (!collection) {
    return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
  }

  // Prisma's onDelete: SetNull handles nullifying bookmark.collectionId automatically
  await db.collection.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
