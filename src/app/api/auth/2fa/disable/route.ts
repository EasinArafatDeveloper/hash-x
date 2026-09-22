import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import UserModel from '@/lib/models/User';
import { getSessionUser, verifyPassword, logAuthActivity } from '@/lib/auth';
import { verifyTotpCode, verifyBackupCode } from '@/lib/totp';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { password, code } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required to disable Two-Factor Authentication.' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const user = await UserModel.findById(sessionUser.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.twoFactorEnabled) {
      return NextResponse.json(
        { error: 'Two-Factor Authentication is not currently enabled.' },
        { status: 400 }
      );
    }

    // Verify current account password
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Incorrect password. Cannot disable 2FA.' },
        { status: 401 }
      );
    }

    if (!code || typeof code !== 'string' || !code.trim()) {
      return NextResponse.json(
        { error: 'A valid Google Authenticator 6-digit code or emergency backup code is required to disable 2FA.' },
        { status: 400 }
      );
    }

    const trimmedCode = code.trim();
    let isCodeValid = false;

    if (user.twoFactorSecret && verifyTotpCode(user.twoFactorSecret, trimmedCode)) {
      isCodeValid = true;
    } else if (user.twoFactorBackupCodes && user.twoFactorBackupCodes.length > 0) {
      const backupCheck = verifyBackupCode(trimmedCode, user.twoFactorBackupCodes);
      if (backupCheck.isValid) {
        isCodeValid = true;
        user.twoFactorBackupCodes = backupCheck.updatedHashedCodes;
      }
    }

    if (!isCodeValid) {
      return NextResponse.json(
        { error: 'Invalid 2FA code or backup code.' },
        { status: 400 }
      );
    }

    // Disable 2FA
    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.twoFactorTempSecret = null;
    user.twoFactorBackupCodes = [];
    user.twoFactorCreatedAt = null;
    await user.save();

    await logAuthActivity(
      '2FA Disabled',
      `User ${user.name} (@${user.username}) disabled Two-Factor Authentication`,
      user.name
    );

    return NextResponse.json({
      success: true,
      message: 'Two-Factor Authentication has been successfully disabled.',
    });
  } catch (error: any) {
    console.error('2FA disable error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to disable 2FA.' },
      { status: 500 }
    );
  }
}
