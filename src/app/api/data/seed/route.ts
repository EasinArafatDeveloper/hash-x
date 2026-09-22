import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import RecordModel from '@/lib/models/Record';
import DatasetModel from '@/lib/models/Dataset';
import ActivityLogModel from '@/lib/models/ActivityLog';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const FIRST_NAMES = [
  'Muhammad', 'Easin', 'Arafat', 'Sajid', 'Tanvir', 'Fatima', 'Nusrat', 'Tasmia', 'Rahim', 'Karim',
  'Arif', 'Zayan', 'Mahmud', 'Sumaiya', 'Anika', 'Hasan', 'Mehedi', 'Farhana', 'Tahmid', 'Sabrina',
  'Shakib', 'Tamim', 'Riyad', 'Mushfiq', 'Taskin', 'Mustafiz', 'Liton', 'Soumya', 'Mehidy', 'Shoriful',
  'Alexander', 'Sophia', 'Liam', 'Emma', 'Noah', 'Olivia', 'Ethan', 'Ava', 'Mason', 'Isabella'
];

const LAST_NAMES = [
  'Rahman', 'Ahmed', 'Hossain', 'Islam', 'Chowdhury', 'Khan', 'Siddique', 'Alam', 'Mahmud', 'Begum',
  'Jahan', 'Haque', 'Mia', 'Kazi', 'Bhuiyan', 'Uddin', 'Smith', 'Johnson', 'Williams', 'Brown'
];

const DISTRICTS = ['Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna', 'Barisal', 'Rangpur', 'Mymensingh', 'Comilla', 'Gazipur'];
const AREAS: Record<string, string[]> = {
  Dhaka: ['Dhanmondi', 'Gulshan', 'Banani', 'Uttara', 'Mirpur', 'Mohakhali', 'Old Dhaka', 'Badda'],
  Chittagong: ['Agrabad', 'GEC Circle', 'Halishahar', 'Nasirabad', 'Panchlaish', 'Chawkbazar'],
  Sylhet: ['Zindabazar', 'Ambarkhana', 'Kumarpara', 'Upashahar', 'Mirabazar'],
  Rajshahi: ['Saheb Bazar', 'Kazla', 'Motihar', 'Shiroil', 'Boalia'],
  Khulna: ['Sonadanga', 'Boyra', 'Khalishpur', 'KDA Avenue'],
  Barisal: ['Sadat Road', 'Nathullabad', 'Chowmatha'],
  Rangpur: ['Modern Mode', 'DAP Complex', 'Cantonment'],
  Mymensingh: ['Ganginarpar', 'Town Hall', 'Charpara'],
  Comilla: ['Kandirpar', 'Tomsom Bridge', 'Paduar Bazar'],
  Gazipur: ['Board Bazar', 'Chowrastah', 'Tongi']
};

const STATUSES = ['Active', 'Active', 'Active', 'Inactive', 'Pending', 'Suspended'];
const AVATAR_TYPES = ['With Avatar', 'With Avatar', 'Without Avatar', 'Custom', 'Initial'];

export async function POST() {
  try {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
      return NextResponse.json(
        { error: 'Dataset seeding is disabled in production.' },
        { status: 403 }
      );
    }

    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only administrators can wipe and reseed the dataset.' },
        { status: 403 }
      );
    }

    await connectToDatabase();

    // Clear existing records
    await RecordModel.deleteMany({});
    await DatasetModel.deleteMany({});

    const totalRecords = 2123;
    const recordsToInsert = [];

    const now = new Date();

    for (let i = 1; i <= totalRecords; i++) {
      const fName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
      const lName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
      const fullName = `${fName} ${lName}`;
      const district = DISTRICTS[Math.floor(Math.random() * DISTRICTS.length)];
      const areaList = AREAS[district] || ['Center'];
      const area = areaList[Math.floor(Math.random() * areaList.length)];
      const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
      const gender = Math.random() < 0.48 ? 'Male' : Math.random() < 0.94 ? 'Female' : 'Other';
      const age = Math.floor(Math.random() * (62 - 18 + 1)) + 18;
      
      const phoneOperator = ['88017', '88018', '88019', '88015', '88016', '88013'][Math.floor(Math.random() * 6)];
      const phoneNum = `${phoneOperator}${Math.floor(1000000 + Math.random() * 9000000)}`;

      const emailDomain = ['gmail.com', 'yahoo.com', 'outlook.com', 'company.io'][Math.floor(Math.random() * 4)];
      const email = `${fName.toLowerCase()}.${lName.toLowerCase()}${i}@${emailDomain}`;

      const daysAgo = Math.floor(Math.random() * 60);
      const lastActive = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      const activeDays = Math.floor(Math.random() * 30) + 1;
      const avatarType = AVATAR_TYPES[Math.floor(Math.random() * AVATAR_TYPES.length)];

      recordsToInsert.push({
        name: fullName,
        email,
        phone: phoneNum,
        age,
        gender,
        location: district,
        area,
        address: `House #${Math.floor(Math.random() * 120) + 1}, Road #${Math.floor(Math.random() * 20) + 1}, ${area}, ${district}`,
        status,
        lastActive,
        activeDays,
        avatarType,
        customFields: {
          accountTier: Math.random() > 0.6 ? 'Enterprise' : Math.random() > 0.3 ? 'Pro' : 'Starter',
          verified: Math.random() > 0.2,
          score: Math.floor(Math.random() * 100),
          segment: Math.random() > 0.5 ? 'B2B' : 'Consumer',
        },
      });
    }

    // Create Dataset entry first
    const newDataset = await DatasetModel.create({
      filename: 'people-data-enterprise.xlsx',
      totalRecords,
      newRecordsCount: totalRecords,
      updatedRecordsCount: 0,
      totalFields: 18,
      fileSize: '1.4 MB',
      status: 'Ready',
      uploadedBy: 'Administrator',
      uploadedAt: new Date(),
    });

    const datasetId = newDataset._id.toString();

    // Assign datasetId to all seeded records
    for (const r of recordsToInsert) {
      (r as any).datasetId = datasetId;
    }

    // Insert in batches of 500
    const chunkSize = 500;
    for (let i = 0; i < recordsToInsert.length; i += chunkSize) {
      const chunk = recordsToInsert.slice(i, i + chunkSize);
      await RecordModel.insertMany(chunk);
    }

    // Log Activity
    await ActivityLogModel.create({
      action: 'Dataset Seeded',
      description: `Seeded ${totalRecords.toLocaleString()} business records with 18 fields`,
      user: 'Easin Arafat',
      type: 'upload',
    });

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${totalRecords} records!`,
      dataset: newDataset,
    });
  } catch (error: any) {
    console.error('Seeding error:', error);
    return NextResponse.json(
      { error: 'Failed to seed dataset', message: error.message },
      { status: 500 }
    );
  }
}
