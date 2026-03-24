import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { User } from '../models/User';
import { hashPassword, signJwt, verifyPassword } from '../utils/auth';

const sanitizeUser = (user: any) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  isActive: user.isActive
});

export const register = async (req: AuthenticatedRequest, res: Response) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email and password are required' });
  }

  const usersCount = await User.countDocuments();

  if (usersCount > 0) {
    if (!req.user || req.user.role !== 'owner') {
      return res.status(403).json({ error: 'Only owner can register new users' });
    }
  }

  const existing = await User.findOne({ email: String(email).toLowerCase() });
  if (existing) return res.status(400).json({ error: 'Email already registered' });

  const userRole: 'owner' | 'staff' = usersCount === 0 ? 'owner' : role === 'owner' ? 'owner' : 'staff';

  const user = await User.create({
    name: String(name).trim(),
    email: String(email).toLowerCase().trim(),
    password: await hashPassword(String(password)),
    role: userRole
  });

  const token = signJwt({
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  });

  res.status(201).json({ token, user: sanitizeUser(user) });
};

export const login = async (req: AuthenticatedRequest, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const user = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid credentials' });

  const isValid = await verifyPassword(String(password), user.password);
  if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signJwt({
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  });

  res.json({ token, user: sanitizeUser(user) });
};

export const me = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const user = await User.findById(req.user.id).select('name email role isActive');
  if (!user) return res.status(404).json({ error: 'User not found' });

  res.json({ user: sanitizeUser(user) });
};
