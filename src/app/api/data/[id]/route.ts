import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import RecordModel from '@/lib/models/Record';

export const dynamic = 'force-dynamic';

// GET single record
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
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

// DELETE — remove record
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const record = await RecordModel.findByIdAndDelete(params.id);
    if (!record) return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Record deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
