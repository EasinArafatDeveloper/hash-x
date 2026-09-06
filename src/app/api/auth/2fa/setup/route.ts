import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import UserModel from '@/lib/models/User';
import { getSessionUser } from '@/lib/auth';
import { generateTotpSecret, generateOtpAuthUri, generateQRCodeDataUrl } from '@/lib/totp';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized. Please log in first.' }, { status: 401 });
    }

    await connectToDatabase();
    const user = await UserModel.findById(sessionUser.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // Generate a fresh 160-bit Base32 secret for TOTP
    const secret = generateTotpSecret(20);

    // Save temporary secret until the user verifies with their first 6-digit code
    user.twoFactorTempSecret = secret;
    await user.save();

    const accountLabel = user.email || user.username || 'admin';
    const otpAuthUri = generateOtpAuthUri(accountLabel, secret, 'MORPHEUS');
    const qrCodeDataUrl = await generateQRCodeDataUrl(otpAuthUri);

    return NextResponse.json({
      success: true,
      qrCodeDataUrl,
      secretKey: secret,
      otpAuthUri,
      accountName: accountLabel,
      issuer: 'MORPHEUS',
    });
  } catch (error: any) {
    console.error('2FA setup error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initialize 2FA setup.' },
      { status: 500 }
    );
  }
}
