import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../db';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

const ProfileSchema = z.object({
  display_name: z.string().min(2).optional(),
  preferred_language: z.string().max(10).optional()
});

router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, display_name, preferred_language, created_at')
      .eq('id', req.user!.id)
      .single();

    if (error) throw error;
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.put('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const validated = ProfileSchema.parse(req.body);
    
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(validated)
      .eq('id', req.user!.id)
      .select('id, email, display_name, preferred_language')
      .single();

    if (error) throw error;
    res.json(updatedUser);
  } catch (err) {
    next(err);
  }
});

export default router;
