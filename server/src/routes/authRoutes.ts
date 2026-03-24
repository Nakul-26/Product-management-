import { Router } from 'express';
import { login, me, register } from '../controllers/authController';
import { optionalAuth, requireAuth } from '../middleware/authMiddleware';

const router = Router();

router.post('/register', optionalAuth, register);
router.post('/login', login);
router.get('/me', requireAuth, me);

export default router;
