import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import DatasetModel from '@/lib/models/Dataset';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const session = await getSessionUser();
    if (!session || session.role === 'viewer') {
      return NextResponse.json(
        { error: 'You do not have permission to upload datasets.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { filename, fileSize, totalRows = 0, totalFields = 18 } = body || {};

    if (totalRows > 500000) {
      return NextResponse.json(
        { error: 'Maximum allowed dataset size is 500,000 rows per file.' },
        { status: 400 }
      );
    }

    const uploaderName = session?.name || session?.username || 'Administrator';

    const dataset = await DatasetModel.create({
      filename: filename || 'uploaded-dataset.csv',
      totalRecords: 0,
      totalRowsInFile: totalRows,
      newRecordsCount: 0,
      updatedRecordsCount: 0,
      unchangedRecordsCount: 0,
      skippedRowsCount: 0,
      fieldUpdatesSummary: {
        emailUpdated: 0,
        phoneUpdated: 0,
        nameUpdated: 0,
        ageUpdated: 0,
        genderUpdated: 0,
        locationUpdated: 0,
        avatarUpdated: 0,
        tagsUpdated: 0,
        activeDaysUpdated: 0,
        lastActiveUpdated: 0,
        customFieldsUpdated: 0,
      },
      auditSample: [],
      totalFields: totalFields || 18,
      fileSize: fileSize || '0 KB',
      status: 'Processing',
      uploadedBy: uploaderName,
      uploadedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      datasetId: dataset._id.toString(),
      message: 'Upload session initialized successfully',
    });
  } catch (error: any) {
    console.error('Upload init error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initialize upload session' },
      { status: 500 }
    );
  }
}
