import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const SECRET = process.env.JWT_SECRET!;

export function signToken(payload: object): string {
  return jwt.sign(payload, SECRET, { expiresIn: '8h' });
}

export function verifyToken(token: string): jwt.JwtPayload | null {
  try {
    return jwt.verify(token, SECRET) as jwt.JwtPayload;
  } catch {
    return null;
  }
}

export function requireAuth(req: NextRequest): jwt.JwtPayload | null {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.slice(7));
}
