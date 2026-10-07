"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const errorHandler = (err, req, res, next) => {
    console.error('Unhandled error:', err);
    if (err instanceof zod_1.ZodError) {
        return res.status(400).json({
            error: 'Validation Error',
            details: err.errors
        });
    }
    res.status(500).json({ error: 'Internal Server Error' });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=error.js.map