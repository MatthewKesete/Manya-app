// server/routes/index.js
const express = require('express');
const router = express.Router();

// Import all route modules
const questionsRoutes = require('./api/questions');
const answersRoutes = require('./api/answers');
const statsRoutes = require('./api/stats');
const questsRoutes = require('./api/quests');
const challengesRoutes = require('./api/challenges');
const psychologicalRoutes = require('./api/psychological');
const userProfileRoutes = require('./api/userProfile');
const hintRoutes = require('./api/hint');
const solutionRoutes = require('./api/solution');
const rewardsRoutes = require('./api/rewards');
// Add with other route imports
const simulationRoutes = require('./api/simulation');
// Debug middleware
router.use('/api', (req, res, next) => {
    console.log(`📡 API Request: ${req.method} ${req.url}`);
    next();
});

// Register routes
router.use('/api', questionsRoutes);
router.use('/api', answersRoutes);
router.use('/api', statsRoutes);
router.use('/api', hintRoutes);
router.use('/api', solutionRoutes);
router.use('/api/psychological', psychologicalRoutes);
router.use('/api/challenges', challengesRoutes);
router.use('/api/quests', questsRoutes);
router.use('/api/quests/rewards', rewardsRoutes);
router.use('/api/profile', userProfileRoutes);

// Add with other route registrations
router.use('/api/simulation', simulationRoutes);
// Test endpoint
router.get('/api/test', async (req, res) => {
    const pool = require('../config/database');
    try {
        const result = await pool.query('SELECT COUNT(*) as count FROM qbrss');
        const answerCount = await pool.query('SELECT COUNT(*) as count FROM user_answer');
        res.json({ 
            message: '✅ Server working!',
            questions: parseInt(result.rows[0].count) || 0,
            answers: parseInt(answerCount.rows[0].count) || 0,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('Test endpoint error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;