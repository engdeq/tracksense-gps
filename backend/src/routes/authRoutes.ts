import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts, try again later' },
});

router.post('/login', authLimiter, validate(authController.loginSchema), authController.login);
router.post('/refresh', authLimiter, validate(authController.refreshSchema), authController.refresh);
router.post('/logout', validate(authController.refreshSchema.partial()), authController.logout);
router.post('/forgot-password', authLimiter, validate(authController.forgotSchema), authController.forgotPassword);
router.post('/reset-password', authLimiter, validate(authController.resetSchema), authController.resetPassword);
router.get('/me', authenticate, authController.me);

export default router;
