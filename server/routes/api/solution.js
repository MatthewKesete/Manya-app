// server/routes/api/solution.js
const express = require('express');
const router = express.Router();
const pool = require('../../config/database');

// GET /api/solution/:questionId
router.get('/:questionId', async (req, res) => {
    const questionId = req.params.questionId;
    
    try {
        const result = await pool.query(
            'SELECT "Detailed_Solution", "Hint", "Correct_Answer" FROM qbrss WHERE "Q_ID" = $1',
            [questionId]
        );
        
        const row = result.rows[0];
        
        res.json({
            detailedSolution: row?.Detailed_Solution || "No detailed solution available.",
            hint: row?.Hint || "No hint available.",
            correctAnswer: row?.Correct_Answer || ""
        });
        
    } catch (err) {
        console.error('Error getting solution:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;