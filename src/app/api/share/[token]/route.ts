import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectToDatabase from '@/lib/db';
import ShareLinkModel from '@/lib/models/ShareLink';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    await connectToDatabase();

    const { token } = params;
    if (!token || token.trim().length < 8) {
      return NextResponse.json(
        { error: 'Invalid share link format.' },
        { status: 400 }
      );
    }

    const shareLink = await ShareLinkModel.findOne({ token });

    if (!shareLink) {
      return NextResponse.json(
        {
          error: 'Link not found or has been permanently deleted.',
          statusType: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // 1. Check if link has expired by time
    if (new Date(shareLink.expiresAt).getTime() < Date.now()) {
      if (!shareLink.isBurned) {
        shareLink.isBurned = true;
        await shareLink.save();
      }
      return NextResponse.json(
        {
          error: 'This secure share link has expired.',
          statusType: 'EXPIRED',
          expiresAt: shareLink.expiresAt,
          isBurned: true,
        },
        { status: 410 }
      );
    }

    // 2. Check if link was already burned / single-use exhausted
    if (shareLink.isBurned || shareLink.viewCount >= shareLink.maxViews) {
      if (!shareLink.isBurned) {
        shareLink.isBurned = true;
        await shareLink.save();
      }
      const burnMsg =
        shareLink.maxViews === 1
          ? 'This single-use secure link has already been opened and burned.'
          : `This secure link has reached its maximum view limit (${shareLink.maxViews}/${shareLink.maxViews}) and has been permanently burned.`;

      return NextResponse.json(
        {
          error: burnMsg,
          statusType: 'BURNED',
          isBurned: true,
          viewCount: shareLink.viewCount,
          maxViews: shareLink.maxViews,
        },
        { status: 410 }
      );
    }

    // 3. If link requires a passcode, prompt the user for passcode first
    if (shareLink.hasPasscode) {
      return NextResponse.json({
        requiresPasscode: true,
        title: shareLink.title,
        recordCount: shareLink.recordCount,
        expiresAt: shareLink.expiresAt,
        maxViews: shareLink.maxViews,
        isOneTime: shareLink.maxViews === 1,
        createdBy: shareLink.createdBy,
        theme: shareLink.theme || 'indigo',
        themeMode: shareLink.themeMode || 'dark',
      });
    }

    // 4. Record the view & burn if single-use
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'Unknown IP';
    const userAgent = request.headers.get('user-agent') || 'Unknown Browser';

    shareLink.viewCount += 1;
    if (shareLink.viewCount >= shareLink.maxViews) {
      shareLink.isBurned = true;
    }
    shareLink.accessLogs.push({
      ip,
      userAgent,
      accessedAt: new Date(),
    });

    await shareLink.save();

    // 5. Generate dynamic session watermark code
    const sessionWatermark = `CONFIDENTIAL • ONE-TIME ACCESS • #${token.slice(4, 10).toUpperCase()} • ${new Date().toISOString().split('T')[0]}`;

    return NextResponse.json({
      success: true,
      title: shareLink.title,
      recordCount: shareLink.recordCount,
      records: shareLink.recordsSnapshot,
      viewCount: shareLink.viewCount,
      maxViews: shareLink.maxViews,
      isOneTime: shareLink.maxViews === 1,
      isBurned: shareLink.isBurned,
      expiresAt: shareLink.expiresAt,
      createdBy: shareLink.createdBy,
      theme: shareLink.theme || 'indigo',
      themeMode: shareLink.themeMode || 'dark',
      sessionWatermark,
      accessedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching share link:', error);
    return NextResponse.json(
      { error: 'Failed to access secure share link', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    await connectToDatabase();

    const { token } = params;
    const body = await request.json();
    const { passcode } = body || {};

    const shareLink = await ShareLinkModel.findOne({ token });

    if (!shareLink) {
      return NextResponse.json(
        { error: 'Link not found or has been permanently deleted.', statusType: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Expiry check
    if (new Date(shareLink.expiresAt).getTime() < Date.now()) {
      shareLink.isBurned = true;
      await shareLink.save();
      return NextResponse.json(
        { error: 'This secure share link has expired.', statusType: 'EXPIRED', isBurned: true },
        { status: 410 }
      );
    }

    // Burn check
    if (shareLink.isBurned || shareLink.viewCount >= shareLink.maxViews) {
      if (!shareLink.isBurned) {
        shareLink.isBurned = true;
        await shareLink.save();
      }
      const burnMsg =
        shareLink.maxViews === 1
          ? 'This single-use secure link has already been opened and burned.'
          : `This secure link has reached its maximum view limit (${shareLink.maxViews}/${shareLink.maxViews}) and has been permanently burned.`;

      return NextResponse.json(
        {
          error: burnMsg,
          statusType: 'BURNED',
          isBurned: true,
          viewCount: shareLink.viewCount,
          maxViews: shareLink.maxViews,
        },
        { status: 410 }
      );
    }

    // Verify Passcode with 3-Attempt Auto-Lock / Self-Destruct Protection
    if (shareLink.hasPasscode) {
      if (!passcode) {
        return NextResponse.json(
          { error: 'Passcode is required to unlock this data.' },
          { status: 401 }
        );
      }
      const hashedInput = crypto
        .createHash('sha256')
        .update(String(passcode).trim())
        .digest('hex');

      if (hashedInput !== shareLink.passcodeHash) {
        const attempts = (shareLink.failedPasscodeAttempts || 0) + 1;
        shareLink.failedPasscodeAttempts = attempts;
        const maxAttempts = shareLink.maxPasscodeAttempts || 3;

        if (attempts >= maxAttempts) {
          shareLink.isBurned = true;
          await shareLink.save();
          return NextResponse.json(
            {
              error: `Maximum failed passcode attempts (${maxAttempts}/${maxAttempts}) reached. This link has self-destructed and been permanently burned.`,
              statusType: 'BURNED',
              isBurned: true,
              remainingAttempts: 0,
            },
            { status: 410 }
          );
        }

        await shareLink.save();
        const remaining = maxAttempts - attempts;
        return NextResponse.json(
          {
            error: `Incorrect passcode. ${remaining} attempt(s) remaining before this link self-destructs!`,
            statusType: 'INVALID_PASSCODE',
            remainingAttempts: remaining,
          },
          { status: 401 }
        );
      }

      // Successful passcode unlock -> reset failed attempts
      shareLink.failedPasscodeAttempts = 0;
    }

    // Passcode validated -> consume view
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'Unknown IP';
    const userAgent = request.headers.get('user-agent') || 'Unknown Browser';

    shareLink.viewCount += 1;
    if (shareLink.viewCount >= shareLink.maxViews) {
      shareLink.isBurned = true;
    }
    shareLink.accessLogs.push({
      ip,
      userAgent,
      accessedAt: new Date(),
    });

    await shareLink.save();

    const sessionWatermark = `CONFIDENTIAL • ONE-TIME ACCESS • #${token.slice(4, 10).toUpperCase()} • ${new Date().toISOString().split('T')[0]}`;

    return NextResponse.json({
      success: true,
      title: shareLink.title,
      recordCount: shareLink.recordCount,
      records: shareLink.recordsSnapshot,
      viewCount: shareLink.viewCount,
      maxViews: shareLink.maxViews,
      isOneTime: shareLink.maxViews === 1,
      isBurned: shareLink.isBurned,
      expiresAt: shareLink.expiresAt,
      createdBy: shareLink.createdBy,
      theme: shareLink.theme || 'indigo',
      themeMode: shareLink.themeMode || 'dark',
      sessionWatermark,
      accessedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error verifying passcode for share link:', error);
    return NextResponse.json(
      { error: 'Failed to unlock secure share link', message: error.message },
      { status: 500 }
    );
  }
}
