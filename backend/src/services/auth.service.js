import crypto from 'node:crypto';
import { ObjectId } from 'mongodb';
import {
  ensureDatabaseIndexes,
  getSessionsCollection,
  getUsersCollection,
} from './database.service.js';

export const sessionCookieName = 'at2_session';

function getSessionDays() {
  const days = Number(process.env.AUTH_SESSION_DAYS || 7);
  return Number.isFinite(days) && days > 0 ? days : 7;
}

function getSessionMaxAgeSeconds() {
  return Math.round(getSessionDays() * 24 * 60 * 60);
}

function getSecureCookieFlag() {
  return process.env.NODE_ENV === 'production' ? '; Secure' : '';
}

function hashSessionToken(token = '') {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getCookie(request, name) {
  const cookieHeader = request.headers.cookie || '';

  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export function getSessionCookie(token, maxAge = getSessionMaxAgeSeconds()) {
  return [
    `${sessionCookieName}=${encodeURIComponent(token)}`,
    `Max-Age=${maxAge}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    getSecureCookieFlag().replace(/^;\s*/, ''),
  ]
    .filter(Boolean)
    .join('; ');
}

export function getClearSessionCookie() {
  return getSessionCookie('', 0);
}

export function getSessionTokenFromRequest(request) {
  const token = getCookie(request, sessionCookieName);
  return token ? decodeURIComponent(token) : '';
}

function serializeUser(user) {
  if (!user) return null;

  return {
    id: String(user._id),
    name: user.name || '',
    email: user.email || '',
    picture: user.picture || '',
    provider: user.provider || 'google',
    createdAt: user.createdAt || null,
    lastLoginAt: user.lastLoginAt || null,
  };
}

export async function upsertGoogleUser(profile = {}) {
  await ensureDatabaseIndexes();

  const users = await getUsersCollection();
  const now = new Date();
  const email = String(profile.email || '').trim().toLowerCase();
  const googleId = String(profile.sub || '').trim();

  const existingUser = await users.findOne({
    $or: [{ googleId }, { email }],
  });
  const userDocument = {
    provider: 'google',
    googleId,
    email,
    emailVerified: Boolean(profile.email_verified),
    name: profile.name || '',
    givenName: profile.given_name || '',
    familyName: profile.family_name || '',
    picture: profile.picture || '',
    locale: profile.locale || '',
    updatedAt: now,
    lastLoginAt: now,
  };

  if (existingUser?._id) {
    await users.updateOne(
      { _id: existingUser._id },
      {
        $set: userDocument,
        $setOnInsert: { createdAt: now },
      },
    );
    return serializeUser(await users.findOne({ _id: existingUser._id }));
  }

  const insertResult = await users.insertOne({
    ...userDocument,
    createdAt: now,
  });

  return serializeUser(await users.findOne({ _id: insertResult.insertedId }));
}

export async function createUserSession(user, request) {
  await ensureDatabaseIndexes();

  const sessions = await getSessionsCollection();
  const token = crypto.randomBytes(40).toString('base64url');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + getSessionMaxAgeSeconds() * 1000);

  await sessions.insertOne({
    tokenHash: hashSessionToken(token),
    userId: new ObjectId(user.id),
    createdAt: now,
    lastUsedAt: now,
    expiresAt,
    ip: request.ip || '',
    userAgent: request.get('user-agent') || '',
  });

  return {
    token,
    expiresAt,
  };
}

export async function getCurrentUserFromRequest(request) {
  const token = getSessionTokenFromRequest(request);
  if (!token) return null;

  await ensureDatabaseIndexes();

  const sessions = await getSessionsCollection();
  const users = await getUsersCollection();
  const now = new Date();
  const session = await sessions.findOne({
    tokenHash: hashSessionToken(token),
    expiresAt: { $gt: now },
  });

  if (!session?.userId) return null;

  await sessions.updateOne(
    { _id: session._id },
    {
      $set: {
        lastUsedAt: now,
      },
    },
  );

  const user = await users.findOne({ _id: session.userId });
  return serializeUser(user);
}

export async function deleteCurrentSession(request) {
  const token = getSessionTokenFromRequest(request);
  if (!token) return;

  await ensureDatabaseIndexes();

  const sessions = await getSessionsCollection();
  await sessions.deleteOne({
    tokenHash: hashSessionToken(token),
  });
}
