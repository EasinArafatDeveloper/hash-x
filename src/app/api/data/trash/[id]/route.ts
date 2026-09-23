import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db';
import RecordModel from '@/lib/models/Record';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// DELETE — permanently purge a single trashed record immediately, instead
// of waiting for the 30-day auto-purge. Irreversible. Admin only.
export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getSessionUser();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Only administrators can permanently delete records.' }, { status: 403 });
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid record ID format' }, { status: 400 });
    }

    await connectToDatabase();

    const result = await RecordModel.deleteOne({ _id: params.id, deletedAt: { $ne: null } });
    if (!result.deletedCount) {
      return NextResponse.json({ error: 'Record not found in recycle bin' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error permanently deleting record:', error);
    return NextResponse.json({ error: 'Failed to permanently delete record' }, { status: 500 });
  }
}
