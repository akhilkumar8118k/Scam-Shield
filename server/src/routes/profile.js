"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
const ProfileSchema = zod_1.z.object({
    display_name: zod_1.z.string().min(2).optional(),
    preferred_language: zod_1.z.string().max(10).optional()
});
router.get('/', async (req, res, next) => {
    try {
        const { data: user, error } = await db_1.supabase
            .from('users')
            .select('id, email, display_name, preferred_language, created_at')
            .eq('id', req.user.id)
            .single();
        if (error)
            throw error;
        res.json(user);
    }
    catch (err) {
        next(err);
    }
});
router.put('/', async (req, res, next) => {
    try {
        const validated = ProfileSchema.parse(req.body);
        const { data: updatedUser, error } = await db_1.supabase
            .from('users')
            .update(validated)
            .eq('id', req.user.id)
            .select('id, email, display_name, preferred_language')
            .single();
        if (error)
            throw error;
        res.json(updatedUser);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=profile.js.map