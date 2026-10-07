"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../../.env') });
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod';
const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid token' });
        }
        const token = authHeader.split(' ')[1];
        let payload;
        try {
            payload = jsonwebtoken_1.default.verify(token, JWT_SECRET, {
                algorithms: ['HS256'],
                issuer: 'scamshield-api',
                audience: 'scamshield-client'
            });
        }
        catch (err) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        // Verify session in DB
        const { data: session, error } = await db_1.supabase
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
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Internal server error during authentication' });
    }
};
exports.requireAuth = requireAuth;
//# sourceMappingURL=auth.js.map