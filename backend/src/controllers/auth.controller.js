import crypto from 'node:crypto';
import {
  createUserSession,
  deleteCurrentSession,
  getClearSessionCookie,
  getCurrentUserFromRequest,
  getSessionCookie,
  upsertGoogleUser,
} from '../services/auth.service.js';
import AppError from '../utils/AppError.js';

const googleAuthEndpoint = 'https://accounts.google.com/o/oauth2/v2/auth';
const googleTokenEndpoint = 'https://oauth2.googleapis.com/token';
const googleUserInfoEndpoint = 'https://www.googleapis.com/oauth2/v3/userinfo';
const oauthStateCookie = 'at2_google_oauth_state';

function getFrontendUrl() {
  const fallbackOrigin = (process.env.FRONTEND_ORIGINS || 'http://localhost:5173').split(',')[0]?.trim();
  return process.env.FRONTEND_URL || fallbackOrigin || 'http://localhost:5173';
}

function getEnvValue(name) {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : undefined;
}

function getBackendUrl(request) {
  if (!request?.headers?.host) {
    return 'http://localhost:5000';
  }

  const protocol = request.protocol || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  return `${protocol}://${request.headers.host}`;
}

function getGoogleAuthConfig(request) {
  return {
    clientId: getEnvValue('GOOGLE_CLIENT_ID'),
    clientSecret: getEnvValue('GOOGLE_CLIENT_SECRET'),
    redirectUri: getEnvValue('GOOGLE_REDIRECT_URI') || `${getBackendUrl(request)}/api/auth/google/callback`,
  };
}

function getCookie(request, name) {
  const cookieHeader = request.headers.cookie || '';

  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function getStateCookie(value = '', maxAge = 600) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const encodedValue = encodeURIComponent(value);

  return `${oauthStateCookie}=${encodedValue}; Max-Age=${maxAge}; HttpOnly; SameSite=Lax; Path=/api/auth/google/callback${secure}`;
}

function redirectToFrontend(response, params = {}) {
  const redirectUrl = new URL(process.env.GOOGLE_AUTH_SUCCESS_REDIRECT || getFrontendUrl());

  Object.entries(params).forEach(([key, value]) => {
    if (value) redirectUrl.searchParams.set(key, value);
  });

  response.redirect(redirectUrl.toString());
}

export function startGoogleAuth(request, response, next) {
  try {
    const { clientId, redirectUri } = getGoogleAuthConfig(request);

    if (!clientId) {
      throw new AppError('Google sign-in is not configured. Add GOOGLE_CLIENT_ID to backend/.env.', 503);
    }

    const state = crypto.randomBytes(24).toString('hex');
    const googleUrl = new URL(googleAuthEndpoint);

    googleUrl.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    }).toString();

    response.setHeader('Set-Cookie', getStateCookie(state));
    response.redirect(googleUrl.toString());
  } catch (error) {
    next(error);
  }
}

export async function handleGoogleCallback(request, response, next) {
  try {
    const { code, error, state } = request.query;

    const clearStateCookie = getStateCookie('', 0);
    response.setHeader('Set-Cookie', clearStateCookie);

    if (error) {
      redirectToFrontend(response, {
        auth_error: 'Google sign-in was cancelled.',
      });
      return;
    }

    const savedState = decodeURIComponent(getCookie(request, oauthStateCookie) || '');
    if (!state || !savedState || state !== savedState) {
      throw new AppError('Google sign-in state could not be verified. Please try again.', 400);
    }

    if (!code) {
      throw new AppError('Google authorization code is missing. Please try again.', 400);
    }

    const { clientId, clientSecret, redirectUri } = getGoogleAuthConfig(request);
    if (!clientId || !clientSecret) {
      throw new AppError('Google sign-in is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to backend/.env.', 503);
    }

    const tokenResponse = await fetch(googleTokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json().catch(() => null);
    if (!tokenResponse.ok || !tokenData?.access_token) {
      throw new AppError('Google sign-in failed while requesting an access token.', 502);
    }

    const userResponse = await fetch(googleUserInfoEndpoint, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/json',
      },
    });
    const profile = await userResponse.json().catch(() => null);

    if (!userResponse.ok || !profile?.email) {
      throw new AppError('Google sign-in failed while loading your profile.', 502);
    }

    if (!profile.sub) {
      throw new AppError('Google profile did not include an account ID.', 502);
    }

    const user = await upsertGoogleUser(profile);
    const session = await createUserSession(user, request);

    response.setHeader('Set-Cookie', [clearStateCookie, getSessionCookie(session.token)]);

    redirectToFrontend(response, {
      auth: 'google_success',
    });
  } catch (error) {
    next(error);
  }
}

export async function getCurrentUser(request, response, next) {
  try {
    const user = await getCurrentUserFromRequest(request);

    response.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(request, response, next) {
  try {
    await deleteCurrentSession(request);
    response.setHeader('Set-Cookie', getClearSessionCookie());
    response.status(200).json({
      success: true,
      message: 'Signed out successfully.',
    });
  } catch (error) {
    next(error);
  }
}

