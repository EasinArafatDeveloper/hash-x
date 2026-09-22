import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import SavedFilterModel from '@/lib/models/SavedFilter';

import mongoose from 'mongoose';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid filter ID' }, { status: 400 });
    }

    await connectToDatabase();
    const filter = await SavedFilterModel.findById(params.id);
    if (!filter) {
      return NextResponse.json({ error: 'Saved filter not found' }, { status: 404 });
    }

    // Only owner, admin, or manager can delete
    if (session.role !== 'admin' && session.role !== 'manager' && filter.userId && filter.userId !== session.id) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this filter preset.' },
        { status: 403 }
      );
    }

    await SavedFilterModel.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true, message: 'Filter deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
