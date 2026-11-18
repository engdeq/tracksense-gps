import { describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';

describe('JWT access token shape', () => {
  it('signs and verifies a payload', () => {
    const secret = 'test_secret_key_123456';
    const token = jwt.sign({ sub: 'user1', role: 'admin' }, secret, { expiresIn: '15m' });
    const payload = jwt.verify(token, secret) as jwt.JwtPayload;
    expect(payload.sub).toBe('user1');
    expect(payload.role).toBe('admin');
  });
});
