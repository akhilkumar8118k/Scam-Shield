"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const gemini_1 = require("../services/gemini");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
const CaseSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    input_type: zod_1.z.enum(['message', 'email', 'url']),
    submitted_content: zod_1.z.string().min(1),
    user_notes: zod_1.z.string().optional(),
});
router.get('/', async (req, res, next) => {
    try {
        const { data: cases, error } = await db_1.supabase
            .from('cases')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        res.json(cases);
    }
    catch (err) {
        next(err);
    }
});
router.post('/', async (req, res, next) => {
    try {
        const validated = CaseSchema.parse(req.body);
        const { data: newCase, error } = await db_1.supabase
            .from('cases')
            .insert({
            ...validated,
            user_id: req.user.id,
            status: 'pending'
        })
            .select()
            .single();
        if (error)
            throw error;
        res.status(201).json(newCase);
    }
    catch (err) {
        next(err);
    }
});
router.get('/:id', async (req, res, next) => {
    try {
        const { data: caseItem, error } = await db_1.supabase
            .from('cases')
            .select('*, analyses(*)')
            .eq('id', req.params.id)
            .eq('user_id', req.user.id)
            .single();
        if (error)
            return res.status(404).json({ error: 'Case not found' });
        res.json(caseItem);
    }
    catch (err) {
        next(err);
    }
});
router.put('/:id', async (req, res, next) => {
    try {
        const validated = CaseSchema.partial().parse(req.body);
        const caseId = req.params.id;
        const userId = req.user.id;
        // Check if content changed
        const { data: existingCase } = await db_1.supabase
            .from('cases')
            .select('submitted_content')
            .eq('id', caseId)
            .eq('user_id', userId)
            .single();
        if (!existingCase)
            return res.status(404).json({ error: 'Case not found' });
        let statusUpdate = {};
        if (validated.submitted_content && validated.submitted_content !== existingCase.submitted_content) {
            // Mark old analyses as outdated
            await db_1.supabase
                .from('analyses')
                .update({ is_outdated: true })
                .eq('case_id', caseId);
            statusUpdate = { status: 'pending' };
        }
        const { data: updatedCase, error } = await db_1.supabase
            .from('cases')
            .update({ ...validated, ...statusUpdate })
            .eq('id', caseId)
            .eq('user_id', userId)
            .select()
            .single();
        if (error)
            throw error;
        res.json(updatedCase);
    }
    catch (err) {
        next(err);
    }
});
router.delete('/:id', async (req, res, next) => {
    try {
        const { error } = await db_1.supabase
            .from('cases')
            .delete()
            .eq('id', req.params.id)
            .eq('user_id', req.user.id);
        if (error)
            throw error;
        res.status(204).send();
    }
    catch (err) {
        next(err);
    }
});
// Analyze route
router.post('/:id/analyze', async (req, res, next) => {
    try {
        const caseId = req.params.id;
        const userId = req.user.id;
        const { data: caseItem, error } = await db_1.supabase
            .from('cases')
            .select('*')
            .eq('id', caseId)
            .eq('user_id', userId)
            .single();
        if (error || !caseItem)
            return res.status(404).json({ error: 'Case not found' });
        const content = caseItem.submitted_content;
        const type = caseItem.input_type;
        const language = 'en'; // Can be customized later
        // Run programmed checks
        const programmedFindings = (0, gemini_1.runProgrammedChecks)(content, type);
        // Run AI analysis
        const aiResult = await (0, gemini_1.analyzeContent)(content, type, language);
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
        const { data: newAnalysis, error: analysisError } = await db_1.supabase
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
        if (analysisError)
            throw analysisError;
        // Update case status
        await db_1.supabase
            .from('cases')
            .update({ status: 'analyzed' })
            .eq('id', caseId);
        res.json(newAnalysis);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=cases.js.map