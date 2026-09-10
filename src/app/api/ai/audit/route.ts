import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import RecordModel from '@/lib/models/Record';
import { aiAuditDataBatch } from '@/lib/deepseek';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { sampleRows = [], columnMapping } = body || {};

    if (!Array.isArray(sampleRows) || sampleRows.length === 0) {
      return NextResponse.json(
        { error: 'sampleRows array is required' },
        { status: 400 }
      );
    }

    // Extract phones from sample rows to lookup against database
    const phones: string[] = [];
    sampleRows.forEach((r) => {
      let rawPhone = '';
      if (columnMapping) {
        const phoneCol = Object.keys(columnMapping).find((k) => columnMapping[k] === 'phone');
        if (phoneCol && r[phoneCol]) rawPhone = String(r[phoneCol]).trim();
      }
      if (!rawPhone) {
        for (const v of Object.values(r)) {
          const clean = String(v || '').replace(/[\s\+\-\(\)]/g, '');
          if (clean.length >= 7 && /^\d+$/.test(clean)) {
            rawPhone = String(v).trim();
            break;
          }
        }
      }
      if (rawPhone && !phones.includes(rawPhone)) {
        phones.push(rawPhone);
      }
    });

    const existingDocs = phones.length > 0
      ? await RecordModel.find({ phone: { $in: phones } })
          .select('phone name email address orderAmount orderCount customFields')
          .lean()
      : [];

    const existingMap = new Map<string, any>();
    existingDocs.forEach((doc: any) => {
      if (doc.phone) existingMap.set(doc.phone, doc);
    });

    const audit = await aiAuditDataBatch(sampleRows, existingMap, columnMapping);

    return NextResponse.json({
      success: true,
      audit,
    });
  } catch (error: any) {
    console.error('AI audit API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to perform AI audit' },
      { status: 500 }
    );
  }
}
