import connectToDatabase from './db';
import RateLimitBucketModel from './models/RateLimitBucket';

/**
 * Fixed-window rate limiter backed by MongoDB, so the limit is shared
 * across every server instance/serverless replica rather than being
 * per-process. Fixed windows are slightly less precise than a true sliding
 * window (a client can burst up to ~2x at a window boundary), but the
 * counter update is a single atomic upsert, which is what makes this safe
 * under concurrent requests without extra locking.
 *
 * Fails OPEN (allows the request) if the database is unreachable — rate
 * limiting is a defense-in-depth safeguard, not something that should turn
 * a database hiccup into a full outage.
 */
export async function checkRateLimit(
  identifier: string,
  maxRequests: number = 30,
  windowMs: number = 60000
): Promise<{ allowed: boolean; remaining: number; resetMs: number }> {
  try {
    await connectToDatabase();

    const now = Date.now();
    const bucketIndex = Math.floor(now / windowMs);
    const windowStart = bucketIndex * windowMs;
    const bucketId = `${identifier}:${bucketIndex}`;
    const resetMs = windowStart + windowMs - now;

    const doc = await RateLimitBucketModel.findOneAndUpdate(
      { _id: bucketId },
      {
        $inc: { count: 1 },
        $setOnInsert: { expiresAt: new Date(windowStart + windowMs + 5000) },
      },
      { upsert: true, new: true }
    );

    if (doc.count > maxRequests) {
      return { allowed: false, remaining: 0, resetMs };
    }

    return { allowed: true, remaining: Math.max(0, maxRequests - doc.count), resetMs };
  } catch (err) {
    console.error('Rate limit check failed, failing open:', err);
    return { allowed: true, remaining: maxRequests, resetMs: windowMs };
  }
}
