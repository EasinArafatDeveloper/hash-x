import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db';
import RecordModel from '@/lib/models/Record';
import ActivityLogModel from '@/lib/models/ActivityLog';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST — restore a soft-deleted record out of the recycle bin, admin only
export async function POST(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getSessionUser();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Only administrators can restore records.' }, { status: 403 });
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid record ID format' }, { status: 400 });
    }

    await connectToDatabase();

    const record = await RecordModel.findOneAndUpdate(
      { _id: params.id, deletedAt: { $ne: null } },
      { $set: { deletedAt: null, deletionBatchId: null, deletionLabel: '' } },
      { new: true }
    ).setOptions({ includeSoftDeleted: true });

    if (!record) {
      return NextResponse.json({ error: 'Record not found in recycle bin' }, { status: 404 });
    }

    await ActivityLogModel.create({
      action: 'Record Restored',
      description: `Restored "${record.name || record.phone}" from the recycle bin`,
      user: session.name,
      type: 'system',
    });

    return NextResponse.json({ success: true, record });
  } catch (error: any) {
    console.error('Error restoring record:', error);
    return NextResponse.json({ error: 'Failed to restore record' }, { status: 500 });
  }
}
