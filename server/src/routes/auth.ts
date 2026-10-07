import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { supabase } from '../db';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod';

const router = Router();

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  display_name: z.string().min(2)
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, display_name } = RegisterSchema.parse(req.body);
    const normalizedEmail = email.toLowerCase();

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        email: normalizedEmail,
        password_hash,
        display_name
      })
      .select('id, email, display_name')
      .single();

    if (error || !newUser) {
      console.error('Supabase error inserting user:', error);
      throw new Error('Failed to create user');
    }

    res.status(201).json({ user: newUser });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);
    const normalizedEmail = email.toLowerCase();

    const { data: user, error } = await supabase
      .from('users')
      .select('id, password_hash, display_name')
      .eq('email', normalizedEmail)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Create session
    const token = jwt.sign({ sub: user.id }, JWT_SECRET, {
      algorithm: 'HS256',
      issuer: 'scamshield-api',
      audience: 'scamshield-client',
      expiresIn: '1d'
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);

    const { error: sessionError } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        session_token: token,
        expires_at: expiresAt.toISOString(),
        revoked: false
      });

    if (sessionError) {
      throw new Error('Failed to create session');
    }

    res.json({
      token,
      user: {
        id: user.id,
        email: normalizedEmail,
        display_name: user.display_name
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { sessionId } = req.user!;
    
    await supabase
      .from('sessions')
      .update({ revoked: true })
      .eq('session_token', sessionId);
      
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
