import { NextFunction, Request, Response } from 'express';
import { User } from '../models/User';
import { verifyJwt } from '../utils/auth';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: 'owner' | 'staff';
  };
}

const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
};

export const optionalAuth = async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  const token = extractToken(req);
  if (!token) return next();

  const payload = verifyJwt(token);
  if (!payload) return next();

  const user = await User.findById(payload.sub).select('name email role isActive');
  if (!user || !user.isActive) return next();

  req.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };

  next();
};

export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const payload = verifyJwt(token);
  if (!payload) return res.status(401).json({ error: 'Invalid or expired token' });

  const user = await User.findById(payload.sub).select('name email role isActive');
  if (!user || !user.isActive) return res.status(401).json({ error: 'Unauthorized' });

  req.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };

  next();
};

export const authorizeRoles = (...roles: Array<'owner' | 'staff'>) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
};
