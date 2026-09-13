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

    let body: any = {};
    try {
      body = await req.json();
    } catch {}
    const { mode } = body || {};

    // If 2FA is already active and we are linking a 2nd, 3rd, or team phone -> Return the ACTIVE secret
    if (user.twoFactorEnabled && user.twoFactorSecret && mode !== 'reset') {
      const activeSecret = user.twoFactorSecret;
      const accountLabel = user.email || user.username || 'admin';
      const otpAuthUri = generateOtpAuthUri(accountLabel, activeSecret, 'MORPHEUS');
      const qrCodeDataUrl = await generateQRCodeDataUrl(otpAuthUri);

      return NextResponse.json({
        success: true,
        isExistingSecret: true,
        qrCodeDataUrl,
        secretKey: activeSecret,
        otpAuthUri,
        accountName: accountLabel,
        issuer: 'MORPHEUS',
      });
    }

    // Otherwise: Generate a fresh 160-bit Base32 secret for initial setup or full reset
    const secret = generateTotpSecret(20);

    // Save temporary secret until the user verifies with their first 6-digit code
    user.twoFactorTempSecret = secret;
    await user.save();

    const accountLabel = user.email || user.username || 'admin';
    const otpAuthUri = generateOtpAuthUri(accountLabel, secret, 'MORPHEUS');
    const qrCodeDataUrl = await generateQRCodeDataUrl(otpAuthUri);

    return NextResponse.json({
      success: true,
      isExistingSecret: false,
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
