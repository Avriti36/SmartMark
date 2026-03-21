import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';

export async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session.user as { id: string; email: string; name?: string | null };
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
