const STORAGE_KEY = 'portfolio_tracker_auth_token';
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export const ADMIN_EMAIL = 'sudinshrestha41@gmail.com';
const ADMIN_PASSWORD = 'Techmint1#';

export interface AuthToken {
  email: string;
  issuedAt: number;
  expiresAt: number;
  signature: string;
}

const encode = (value: string) => btoa(unescape(encodeURIComponent(value)));
const decode = (value: string) => decodeURIComponent(escape(atob(value)));

const sign = (email: string, issuedAt: number, expiresAt: number) =>
  encode(`${email}.${issuedAt}.${expiresAt}.portfolio-tracker-secret`);

export const verifyCredentials = (email: string, password: string) =>
  email.trim().toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD;

export const createToken = (email: string): AuthToken => {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + TOKEN_TTL_MS;
  return {
    email,
    issuedAt,
    expiresAt,
    signature: sign(email, issuedAt, expiresAt),
  };
};

export const serializeToken = (token: AuthToken) => encode(JSON.stringify(token));

const parseToken = (raw: string): AuthToken | null => {
  try {
    const parsed = JSON.parse(decode(raw)) as AuthToken;
    if (
      typeof parsed.email !== 'string' ||
      typeof parsed.issuedAt !== 'number' ||
      typeof parsed.expiresAt !== 'number' ||
      typeof parsed.signature !== 'string'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const isTokenValid = (token: AuthToken | null): token is AuthToken => {
  if (!token) return false;
  if (Date.now() >= token.expiresAt) return false;
  return token.signature === sign(token.email, token.issuedAt, token.expiresAt);
};

export const saveToken = (token: AuthToken) => {
  localStorage.setItem(STORAGE_KEY, serializeToken(token));
};

export const loadToken = (): AuthToken | null => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const token = parseToken(raw);
  if (!isTokenValid(token)) {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
  return token;
};

export const clearToken = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const millisecondsUntilExpiry = (token: AuthToken) =>
  Math.max(0, token.expiresAt - Date.now());
