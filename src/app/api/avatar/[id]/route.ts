import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db';
import RecordModel from '@/lib/models/Record';

export const dynamic = 'force-dynamic';

function isSafePublicUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname === '169.254.169.254' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function generateSvgAvatar(name: string, gender: string = 'Other'): string {
  const initial = (name && name.trim() ? name.trim()[0] : 'U').toUpperCase();

  // Deterministic gradient colors based on initial / gender
  let bgStart = '#4F46E5';
  let bgEnd = '#7C3AED';

  if (gender === 'Female') {
    bgStart = '#EC4899';
    bgEnd = '#DB2777';
  } else if (gender === 'Male') {
    bgStart = '#2563EB';
    bgEnd = '#1D4ED8';
  } else {
    const charCode = initial.charCodeAt(0) % 5;
    if (charCode === 0) { bgStart = '#059669'; bgEnd = '#047857'; }
    else if (charCode === 1) { bgStart = '#D97706'; bgEnd = '#B45309'; }
    else if (charCode === 2) { bgStart = '#7C3AED'; bgEnd = '#6D28D9'; }
    else if (charCode === 3) { bgStart = '#0284C7'; bgEnd = '#0369A1'; }
    else { bgStart = '#4F46E5'; bgEnd = '#4338CA'; }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${bgStart};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${bgEnd};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="64" fill="url(#grad)"/>
  <text x="50%" y="54%" font-family="system-ui, -apple-system, sans-serif" font-size="52" font-weight="700" fill="#FFFFFF" text-anchor="middle" dominant-baseline="central">${initial}</text>
</svg>`;
}

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const { id } = params;
    if (!id || id === 'undefined' || id === 'null' || !mongoose.isValidObjectId(id)) {
      const svg = generateSvgAvatar('User');
      return new NextResponse(svg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    await connectToDatabase();
    const record = await RecordModel.findById(id).select('name gender avatarUrl avatarBase64 avatarOriginalUrl').lean();

    if (!record) {
      const svg = generateSvgAvatar('User');
      return new NextResponse(svg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // 1. If we already have the permanent Base64 in MongoDB
    if (record.avatarBase64 && record.avatarBase64.startsWith('data:image/')) {
      const matches = record.avatarBase64.match(/^data:(image\/[a-zA-Z0-9\+\.-]+);base64,(.+)$/);
      if (matches && matches[2]) {
        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': mimeType,
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      }
    }

    // 2. If avatarUrl is a direct data URI
    if (record.avatarUrl && record.avatarUrl.startsWith('data:image/')) {
      const matches = record.avatarUrl.match(/^data:(image\/[a-zA-Z0-9\+\.-]+);base64,(.+)$/);
      if (matches && matches[2]) {
        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': mimeType,
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      }
    }

    // 3. If there is a safe remote URL, fetch and permanently cache it into MongoDB
    const targetUrl = record.avatarOriginalUrl || record.avatarUrl;
    if (targetUrl && isSafePublicUrl(targetUrl)) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(targetUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const contentType = response.headers.get('content-type') || 'image/jpeg';
          const base64Str = `data:${contentType};base64,${buffer.toString('base64')}`;

          // Save permanently in MongoDB asynchronously so it never gets lost!
          RecordModel.updateOne(
            { _id: record._id },
            {
              $set: {
                avatarBase64: base64Str,
                avatarOriginalUrl: targetUrl,
              },
            }
          ).catch((e) => console.error('Failed to cache avatarBase64:', e));

          return new NextResponse(buffer, {
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=31536000, immutable',
            },
          });
        }
      } catch (fetchErr) {
        console.warn(`Remote avatar fetch failed for record ${id}, falling back to SVG:`, fetchErr);
      }
    }

    // 4. Resilient Fallback SVG
    const svg = generateSvgAvatar(record.name, record.gender);
    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error: any) {
    console.error('Avatar route error:', error);
    const svg = generateSvgAvatar('User');
    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }
}
