import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import RecordModel from '@/lib/models/Record';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

import mongoose from 'mongoose';
import crypto from 'crypto';

// GET single record
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid record ID format' }, { status: 400 });
    }
    await connectToDatabase();
    const record = await RecordModel.findById(params.id).select('-avatarBase64 -__v').lean();
    if (!record) return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    return NextResponse.json({ success: true, record });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH — update record fields
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser();
    if (!session || session.role === 'viewer') {
      return NextResponse.json({ error: 'You do not have permission to edit records.' }, { status: 403 });
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid record ID format' }, { status: 400 });
    }

    await connectToDatabase();
    const body = await req.json();

    // Only allow safe editable fields
    const allowed = [
      'name', 'email', 'phone', 'age', 'gender', 'location',
      'area', 'address', 'status', 'tags', 'category',
      'orderAmount', 'orderCount', 'activeDays',
    ];

    const update: Record<string, any> = {};
    for (const key of allowed) {
      if (key in body) update[key] = body[key];
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const record = await RecordModel.findByIdAndUpdate(
      params.id,
      { $set: update },
      { new: true, runValidators: false }
    ).select('-avatarBase64 -__v').lean();

    if (!record) return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    return NextResponse.json({ success: true, record });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE — remove record (managers & admins only)
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser();
    if (!session || (session.role !== 'admin' && session.role !== 'manager')) {
      return NextResponse.json({ error: 'Only administrators and managers can delete records.' }, { status: 403 });
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid record ID format' }, { status: 400 });
    }

    await connectToDatabase();
    // Soft delete — moves the record to the recycle bin (restorable for 30
    // days) instead of destroying it immediately. Each single delete gets
    // its own batch id so the recycle bin can still group/restore it like
    // any other deletion.
    const existing = await RecordModel.findById(params.id).select('name phone').lean();
    if (!existing) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

    const batchId = crypto.randomBytes(8).toString('hex');
    const label = `Manual delete: ${(existing as any).name || (existing as any).phone || 'record'}`;
    const record = await RecordModel.findByIdAndUpdate(params.id, {
      $set: { deletedAt: new Date(), deletionBatchId: batchId, deletionLabel: label },
    });
    if (!record) return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Record moved to recycle bin' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
