import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../db';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    sessionId: string;
  };
}

export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid token' });
    }

    const token = authHeader.split(' ')[1];
    let payload: any;
    try {
      payload = jwt.verify(token, JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: 'scamshield-api',
        audience: 'scamshield-client'
      });
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Verify session in DB
    const { data: session, error } = await supabase
      .from('sessions')
      .select('user_id, revoked, expires_at')
      .eq('session_token', token)
      .single();

    if (error || !session) {
      return res.status(401).json({ error: 'Session not found' });
    }

    if (session.revoked) {
      return res.status(401).json({ error: 'Session revoked' });
    }

    if (new Date(session.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Session expired' });
    }

    req.user = {
      id: session.user_id,
      sessionId: token
    };
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
};
