// server/routes/api/gamification.js
const express = require('express');
const router = express.Router();
const gamificationService = require('../../services/gamificationService');
const chestService = require('../../services/chestService');
const achievementService = require('../../services/achievementService');

// Get user's gems
router.get('/gems/:userId', async (req, res) => {
    const { userId } = req.params;
    
    try {
        const subjects = ['math', 'english', 'social', 'science'];
        const subjectGems = {};
        
        for (const subject of subjects) {
            subjectGems[subject] = await gamificationService.getSubjectGems(userId, subject);
        }
        
        const overallGems = await gamificationService.getOverallGems(userId);
        const streak = await gamificationService.getStreak(userId);
        
        res.json({
            userId,
            overallGems,
            subjectGems,
            streak
        });
    } catch (err) {
        console.error('Error getting gems:', err);
        res.status(500).json({ error: err.message });
    }
});

// Award gems (called when answering questions)
// Award gems (called when answering questions)
router.post('/award', async (req, res) => {
    const { userId, subject, isCorrect, hintUsed, context } = req.body;
    
    try {
        // Get streak info
        const streak = await gamificationService.getStreak(userId);
        const streakMultiplier = gamificationService.getStreakMultiplier(streak.current_streak || 0);
        
        // Calculate gems
        const gems = gamificationService.calculateGems(isCorrect, hintUsed, subject, streakMultiplier);
        
        // Award gems
        const result = await gamificationService.awardGems(
            userId, 
            subject, 
            gems.subjectGems, 
            gems.overallGems, 
            context
        );
        
        let chestAwarded = null;
        let achievementsUnlocked = [];

        if (isCorrect && Math.random() < 0.20) {
            await chestService.awardChest(userId, 'bronze');
            chestAwarded = 'bronze';
        }

        achievementsUnlocked = await achievementService.checkAndAwardAchievements(userId);
        
        res.json({
            success: true,
            awarded: gems,
            newTotals: result,
            streak: {
                current: streak.current_streak || 0,
                multiplier: streakMultiplier
            },
            chestAwarded,
            achievementsUnlocked
        });
    } catch (err) {
        console.error('Error awarding gems:', err);
        res.status(500).json({ error: err.message });
    }
});

// Track emotion
// Track emotion
router.post('/emotion', async (req, res) => {
    const { userId, emotion, intensity, context, responseTime } = req.body;
    
    try {
        // Ensure responseTime is an integer
        const responseTimeMs = Math.floor(parseInt(responseTime) || 0);
        
        await gamificationService.trackEmotion(
            userId, 
            emotion, 
            intensity, 
            context, 
            responseTimeMs
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Error tracking emotion:', err);
        res.status(500).json({ error: err.message });
    }
});

// Check challenge unlock
router.post('/challenge/unlock-check', async (req, res) => {
    const { userId, challengeLevel, subject, previousMastery } = req.body;
    
    try {
        const result = await gamificationService.canUnlockChallenge(
            userId, 
            challengeLevel, 
            subject, 
            previousMastery
        );
        res.json(result);
    } catch (err) {
        console.error('Error checking unlock:', err);
        res.status(500).json({ error: err.message });
    }
});
// Add after other routes

// Update streak
router.post('/streak/update', async (req, res) => {
    const { userId, isCorrect } = req.body;
    
    try {
        const result = await gamificationService.updateUserStreak(userId, isCorrect);
        res.json(result);
    } catch (err) {
        console.error('Error updating streak:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get user gamification summary
router.get('/summary/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const stats = await gamificationService.getSummary(userId);
        res.json({ stats });
    } catch (err) {
        console.error('Error getting summary:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get user achievements (badges)
router.get('/achievements/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await pool.query(`
            SELECT a.*, ua.earned_at 
            FROM achievements a
            JOIN user_achievements ua ON a.id = ua.achievement_id
            WHERE ua.user_id = $1
            ORDER BY ua.earned_at DESC
        `, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error getting achievements:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get user's unlocked content (Treasure Box)
router.get('/library/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await pool.query(`
            SELECT * FROM unlocked_content 
            WHERE user_id = $1 
            ORDER BY unlocked_at DESC
        `, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error getting library:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;