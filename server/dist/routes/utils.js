"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const time_1 = require("../utils/time");
const rustCore_1 = require("../utils/rustCore");
const router = (0, express_1.Router)();
/**
 * GET /api/utils/time
 * Returns standardized time information from the server.
 * This can be used to synchronize clients and ensure consistent "Today" definitions.
 */
router.get('/time', (_req, res) => {
    try {
        const timeInfo = (0, time_1.getCurrentTimeInfo)();
        res.json(timeInfo);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to retrieve time information' });
    }
});
/**
 * POST /api/utils/rust-analytics
 * Executes analytics and data transforms in the Rust core binary.
 */
router.post('/rust-analytics', async (req, res) => {
    try {
        const result = await (0, rustCore_1.runRustAnalytics)(req.body);
        res.json(result);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Rust core unavailable';
        res.status(503).json({ error: message });
    }
});
exports.default = router;
