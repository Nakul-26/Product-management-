import crypto from 'crypto';

const DEFAULT_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7;

type JwtPayload = {
  sub: string;
  role: 'owner' | 'staff';
  email: string;
  name: string;
  iat: number;
  exp: number;
};

const toBase64Url = (input: Buffer | string) => Buffer.from(input).toString('base64url');

const fromBase64Url = (input: string) => Buffer.from(input, 'base64url').toString('utf8');

const getJwtSecret = () => process.env.JWT_SECRET || 'change-me-in-production';

export const hashPassword = async (password: string): Promise<string> => {
  const salt = crypto.randomBytes(16);
  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, key) => {
      if (err) return reject(err);
      resolve(key as Buffer);
    });
  });

  return `${salt.toString('hex')}:${derivedKey.toString('hex')}`;
};

export const verifyPassword = async (password: string, storedHash: string): Promise<boolean> => {
  const [saltHex, hashHex] = storedHash.split(':');
  if (!saltHex || !hashHex) return false;

  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, Buffer.from(saltHex, 'hex'), 64, (err, key) => {
      if (err) return reject(err);
      resolve(key as Buffer);
    });
  });

  const expected = Buffer.from(hashHex, 'hex');
  return expected.length === derivedKey.length && crypto.timingSafeEqual(expected, derivedKey);
};

export const signJwt = (data: Omit<JwtPayload, 'iat' | 'exp'>): string => {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (Number(process.env.JWT_EXPIRES_IN) || DEFAULT_EXPIRES_IN_SECONDS);

  const header = { alg: 'HS256', typ: 'JWT' };
  const payload: JwtPayload = { ...data, iat: now, exp };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const signature = toBase64Url(crypto.createHmac('sha256', getJwtSecret()).update(unsigned).digest());

  return `${unsigned}.${signature}`;
};

export const verifyJwt = (token: string): JwtPayload | null => {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const expectedSig = toBase64Url(crypto.createHmac('sha256', getJwtSecret()).update(unsigned).digest());

  if (expectedSig !== signature) return null;

  const payload = JSON.parse(fromBase64Url(encodedPayload)) as JwtPayload;
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) return null;
  return payload;
};
