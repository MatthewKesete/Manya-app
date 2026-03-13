// server/routes/api/hint.js
const express = require('express');
const router = express.Router();
const pool = require('../../config/database');

// GET /api/hint/:questionId
router.get('/:questionId', async (req, res) => {
    const questionId = req.params.questionId;
    console.log('💡 Hint requested for question:', questionId);
    
    try {
        const result = await pool.query(
            'SELECT "Hint" FROM qbrss WHERE "Q_ID" = $1',
            [questionId]
        );
        
        const hint = result.rows[0]?.Hint || "Think carefully about what you've learned!";
        console.log('✅ Hint found:', hint.substring(0, 50) + '...');
        
        res.json({ hint });
    } catch (err) {
        console.error('❌ Error getting hint:', err);
        res.status(500).json({ 
            hint: "Sorry, couldn't load hint. Try thinking it through!" 
        });
    }
});

module.exports = router;