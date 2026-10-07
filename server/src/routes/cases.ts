import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../db';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { analyzeContent, runProgrammedChecks } from '../services/gemini';

const router = Router();
router.use(requireAuth);

const CaseSchema = z.object({
  title: z.string().min(1),
  input_type: z.enum(['message', 'email', 'url']),
  submitted_content: z.string().min(1),
  user_notes: z.string().optional(),
});

router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { status, search } = req.query;
    let query = supabase.from('cases').select('*').eq('user_id', req.user!.id).order('created_at', { ascending: false });
    
    if (status) query = query.eq('status', status);
    if (search) query = query.ilike('title', `%${search}%`);

    const { data: cases, error } = await query;

    if (error) throw error;
    res.json(cases);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const validated = CaseSchema.parse(req.body);
    const { data: newCase, error } = await supabase
      .from('cases')
      .insert({
        ...validated,
        user_id: req.user!.id,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(newCase);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: caseItem, error } = await supabase
      .from('cases')
      .select('*, analyses(*)')
      .eq('id', req.params.id)
      .eq('user_id', req.user!.id)
      .single();

    if (error) return res.status(404).json({ error: 'Case not found' });
    res.json(caseItem);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const validated = CaseSchema.partial().parse(req.body);
    const caseId = req.params.id;
    const userId = req.user!.id;

    // Check if content changed
    const { data: existingCase } = await supabase
      .from('cases')
      .select('submitted_content')
      .eq('id', caseId)
      .eq('user_id', userId)
      .single();

    if (!existingCase) return res.status(404).json({ error: 'Case not found' });

    let statusUpdate = {};
    if (validated.submitted_content && validated.submitted_content !== existingCase.submitted_content) {
        // Mark old analyses as outdated
        await supabase
          .from('analyses')
          .update({ is_outdated: true })
          .eq('case_id', caseId);
        
        statusUpdate = { status: 'pending' };
    }

    const { data: updatedCase, error } = await supabase
      .from('cases')
      .update({ ...validated, ...statusUpdate })
      .eq('id', caseId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    res.json(updatedCase);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data, error } = await supabase
      .from('cases')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user!.id)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Case not found' });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Analyze route
router.post('/:id/analyze', async (req: AuthenticatedRequest, res, next) => {
  try {
    const caseId = req.params.id;
    const userId = req.user!.id;

    const { data: caseItem, error } = await supabase
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .eq('user_id', userId)
      .single();

    if (error || !caseItem) return res.status(404).json({ error: 'Case not found' });

    const content = caseItem.submitted_content;
    const type = caseItem.input_type;
    const language = (req.query.language as string) || 'en'; // Customizable output language

    // Run programmed checks
    const programmedFindings = runProgrammedChecks(content, type);
    
    // Run AI analysis
    const aiResult = await analyzeContent(content, type, language);
    
    let combinedFindings = [...programmedFindings];
    let assessment = aiResult?.assessment || 'insufficient_evidence';
    let summary = aiResult?.summary || 'AI analysis unavailable. Relying on rule-based checks.';
    
    if (aiResult) {
        combinedFindings = [...combinedFindings, ...aiResult.suspicious_findings];
    }

    // Fallback if AI fails completely but we found something via rules
    if (!aiResult && programmedFindings.length > 0) {
        assessment = 'some_concerns';
        summary = 'AI analysis unavailable. Programmed checks detected suspicious patterns.';
    }

    // Ensure assessment, summary, and findings do not contradict each other
    const hasStrictRule = programmedFindings.some(f => !f.source.includes('Uncertain'));
    if (hasStrictRule && aiResult) {
        if (assessment === 'few_signals_detected' || assessment === 'insufficient_evidence') {
            assessment = 'some_concerns';
            summary = summary + ' However, programmed checks detected concrete risk signals requiring your attention.';
        }
    }

    const { data: newAnalysis, error: analysisError } = await supabase
      .from('analyses')
      .insert({
        case_id: caseId,
        user_id: userId,
        content_snapshot: content,
        assessment,
        summary,
        suspicious_findings: combinedFindings,
        reassuring_signals: aiResult?.reassuring_signals || [],
        unknowns: aiResult?.unknowns || '',
        recommended_steps: aiResult?.recommended_steps || [],
        likely_category: aiResult?.likely_category || 'unknown',
        analysis_language: language,
        engine_metadata: { ai_used: !!aiResult, rule_findings: programmedFindings.length }
      })
      .select()
      .single();

    if (analysisError) throw analysisError;

    // Update case status
    await supabase
      .from('cases')
      .update({ status: 'analyzed' })
      .eq('id', caseId);

    res.json(newAnalysis);
  } catch (err) {
    next(err);
  }
});

export default router;
