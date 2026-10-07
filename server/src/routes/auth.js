"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../../.env') });
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod';
const router = (0, express_1.Router)();
const RegisterSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    display_name: zod_1.z.string().min(2)
});
const LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string()
});
router.post('/register', async (req, res, next) => {
    try {
        const { email, password, display_name } = RegisterSchema.parse(req.body);
        const normalizedEmail = email.toLowerCase();
        // Check if user exists
        const { data: existingUser } = await db_1.supabase
            .from('users')
            .select('id')
            .eq('email', normalizedEmail)
            .single();
        if (existingUser) {
            return res.status(400).json({ error: 'Email already in use' });
        }
        const saltRounds = 10;
        const password_hash = await bcrypt_1.default.hash(password, saltRounds);
        const { data: newUser, error } = await db_1.supabase
            .from('users')
            .insert({
            email: normalizedEmail,
            password_hash,
            display_name
        })
            .select('id, email, display_name')
            .single();
        if (error || !newUser) {
            throw new Error('Failed to create user');
        }
        res.status(201).json({ user: newUser });
    }
    catch (error) {
        next(error);
    }
});
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = LoginSchema.parse(req.body);
        const normalizedEmail = email.toLowerCase();
        const { data: user, error } = await db_1.supabase
            .from('users')
            .select('id, password_hash, display_name')
            .eq('email', normalizedEmail)
            .single();
        if (error || !user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        const valid = await bcrypt_1.default.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        // Create session
        const token = jsonwebtoken_1.default.sign({ sub: user.id }, JWT_SECRET, {
            algorithm: 'HS256',
            issuer: 'scamshield-api',
            audience: 'scamshield-client',
            expiresIn: '1d'
        });
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 1);
        const { error: sessionError } = await db_1.supabase
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
    }
    catch (error) {
        next(error);
    }
});
router.post('/logout', auth_1.requireAuth, async (req, res, next) => {
    try {
        const { sessionId } = req.user;
        await db_1.supabase
            .from('sessions')
            .update({ revoked: true })
            .eq('session_token', sessionId);
        res.json({ message: 'Logged out successfully' });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map