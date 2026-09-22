import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import SavedFilterModel from '@/lib/models/SavedFilter';
import ActivityLogModel from '@/lib/models/ActivityLog';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectToDatabase();
    const savedFilters = await SavedFilterModel.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json(savedFilters);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const currentUser = session?.name || session?.username || 'Administrator';

    const body = await request.json();
    const { name, filters } = body;

    if (!name || !filters) {
      return NextResponse.json({ error: 'Name and filters required' }, { status: 400 });
    }

    const savedFilter = await SavedFilterModel.create({
      name,
      filters,
      userId: session.id,
      createdBy: currentUser,
      createdAt: new Date(),
    });

    await ActivityLogModel.create({
      action: 'Saved Filter Created',
      description: `Saved filter preset "${name}"`,
      user: currentUser,
      type: 'filter',
    });

    return NextResponse.json(savedFilter, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
