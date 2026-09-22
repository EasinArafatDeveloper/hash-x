import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import connectToDatabase from '@/lib/db';
import UserModel from '@/lib/models/User';
import ActivityLogModel from '@/lib/models/ActivityLog';
import { UserSession } from '@/types';

export const SESSION_COOKIE_NAME = 'dataflow_session';
const SESSION_EXPIRATION_SECONDS = 60 * 60 * 24 * 7; // 7 days

const getSecretKey = () => {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      'AUTH_SECRET environment variable is not set. Refusing to sign/verify session tokens with an insecure default.'
    );
  }
  return new TextEncoder().encode(secret);
};

/**
 * Creates a signed JWT session token
 */
export async function createSessionToken(payload: UserSession): Promise<string> {
  const secretKey = getSecretKey();
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_EXPIRATION_SECONDS}s`)
    .sign(secretKey);
}

/**
 * Creates a signed temporary JWT for 2FA verification challenge (Valid for 5 minutes)
 */
export async function create2FAPendingToken(userId: string, username: string): Promise<string> {
  const secretKey = getSecretKey();
  return new SignJWT({ userId, username, stage: '2fa_pending' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('300s') // 5 minutes
    .sign(secretKey);
}

/**
 * Verifies a temporary 2FA pending JWT token
 */
export async function verify2FAPendingToken(
  token: string
): Promise<{ userId: string; username: string } | null> {
  try {
    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    });

    if (payload.stage !== '2fa_pending' || !payload.userId || !payload.username) {
      return null;
    }

    return {
      userId: payload.userId as string,
      username: payload.username as string,
    };
  } catch {
    return null;
  }
}

/**
 * Verifies a JWT session token (Works in Edge Middleware and Node runtime)
 */
export async function verifySessionToken(token: string): Promise<UserSession | null> {
  try {
    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    });
    return {
      id: (payload.id || payload.sub) as string,
      username: payload.username as string,
      name: payload.name as string,
      email: payload.email as string | undefined,
      role: (payload.role as 'admin' | 'manager' | 'viewer') || 'viewer',
    };
  } catch (err) {
    return null;
  }
}

/**
 * Hashes a plain-text password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verifies a plain-text password against a bcrypt hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Ensures the default admin user exists in the database
 */
export async function ensureDefaultAdmin() {
  await connectToDatabase();
  const count = await UserModel.countDocuments();
  if (count === 0) {
    const defaultUsername = (process.env.ADMIN_USERNAME || 'admin').toLowerCase();
    const defaultPassword = process.env.ADMIN_PASSWORD;
    if (!defaultPassword) {
      throw new Error(
        'ADMIN_PASSWORD environment variable is not set. Refusing to seed a default admin account with an insecure hardcoded password.'
      );
    }
    const hashedPassword = await hashPassword(defaultPassword);

    await UserModel.create({
      username: defaultUsername,
      password: hashedPassword,
      name: 'Easin Arafat',
      email: 'easin@dataflow.io',
      role: 'admin',
      failedLoginAttempts: 0,
    });

    console.log(`[AUTH] Seeded initial admin account: username="${defaultUsername}"`);
  }
}

/**
 * Gets the current authenticated session user in Server Components / API Routes
 */
export async function getSessionUser(): Promise<UserSession | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

/**
 * Logs an authentication event into ActivityLog
 */
export async function logAuthActivity(action: string, description: string, user: string = 'System') {
  try {
    await connectToDatabase();
    await ActivityLogModel.create({
      action,
      description,
      user,
      type: 'auth',
    });
  } catch (err) {
    console.error('Failed to log auth activity:', err);
  }
}
