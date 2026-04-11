// server/routes/api/quests.js
const express = require('express');
const router = express.Router();
const questEngine = require('../../engines/questEngine');
const pool = require('../../config/database');
const gamificationService = require('../../services/gamificationService');
const chestService = require('../../services/chestService');
const achievementService = require('../../services/achievementService');

// GET /api/quests/:topic/:subtopicId/:questId
// GET /api/quests/:topic/:subtopicId/:questId
router.get('/:topic/:subtopicId/:questId', async (req, res) => {
    const { topic, subtopicId, questId } = req.params;
    const userId = req.query.userId || 'student-001';
    
    console.log(`🎯 Generating Quest ${questId} for ${topic}/${subtopicId} for user ${userId}`);
    
    try {
        const quest = await questEngine.generateQuest(
            decodeURIComponent(topic),  // topicName
            parseInt(subtopicId),       // subtopicId
            parseInt(questId),           // questId
            userId                       // userId
        );
        
        res.json(quest);
    } catch (err) {
        console.error('❌ Error generating quest:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/quests/complete
router.post('/complete', async (req, res) => {
    const { userId, challengeId, questId, mastery, answers } = req.body;
    
    console.log(`✅ Completing Quest ${questId} for challenge ${challengeId} with mastery ${mastery}%`);
    
    try {
        const columnName = `quest${questId}Mastery`;
        const progressResult = await pool.query(
            `SELECT * FROM user_challenge_progress WHERE "userId" = $1 AND "challengeId" = $2`,
            [userId, challengeId]
        );
        const existingRow = progressResult.rows[0];
        const existingMastery = existingRow ? (existingRow[columnName] || 0) : 0;

        if (existingRow && existingMastery >= mastery) {
            console.log(`⏹ Quest ${questId} mastery ${mastery}% not recorded because existing mastery ${existingMastery}% is higher or equal.`);
            const nextUnlocked = false;

            if (answers && answers.length > 0) {
                for (const answer of answers) {
                    await pool.query(
                        `INSERT INTO user_answer (
                            id, "userId", "questionId", "isCorrect", "selectedAnswer", 
                            "correctAnswer", "timeSpentMs", "hintUsed", "answerChanged", 
                            "pointsEarned", "answeredAt"
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                        [
                            'ans-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
                            userId,
                            answer.questionId,
                            answer.isCorrect,
                            answer.selectedAnswer,
                            answer.correctAnswer,
                            answer.timeSpentMs || 0,
                            answer.hintUsed || false,
                            answer.answerChanged || false,
                            answer.pointsEarned || 0,
                            new Date().toISOString()
                        ]
                    );
                }
            }

            return res.json({
                success: true,
                mastery: existingMastery,
                updated: false,
                nextUnlocked,
                nextQuestId: null,
                message: 'Existing score is higher; progress unchanged.'
            });
        }

        // Update user progress
        await pool.query(
            `INSERT INTO user_challenge_progress 
             ("userId", "challengeId", "quest${questId}Mastery", "currentQuest", "lastPlayed")
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT ("userId", "challengeId") 
             DO UPDATE SET 
                "quest${questId}Mastery" = EXCLUDED."quest${questId}Mastery",
                "currentQuest" = $4,
                "lastPlayed" = NOW()`,
            [userId, challengeId, mastery, questId + 1]
        );
        
        // Check if next quest should be unlocked
        const nextUnlocked = mastery >= 75 && questId < 5;
        
        // If this is Quest 5 and mastery is high, mark challenge as complete
        if (questId === 5 && mastery >= 80) {
            await pool.query(
                `UPDATE user_challenge_progress 
                 SET "completedAt" = NOW() 
                 WHERE "userId" = $1 AND "challengeId" = $2`,
                [userId, challengeId]
            );
        }
        
        // Store individual answers for analytics
        if (answers && answers.length > 0) {
            for (const answer of answers) {
                await pool.query(
                    `INSERT INTO user_answer (
                        id, "userId", "questionId", "isCorrect", "selectedAnswer", 
                        "correctAnswer", "timeSpentMs", "hintUsed", "answerChanged", 
                        "pointsEarned", "answeredAt"
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                    [
                        'ans-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
                        userId,
                        answer.questionId,
                        answer.isCorrect,
                        answer.selectedAnswer,
                        answer.correctAnswer,
                        answer.timeSpentMs || 0,
                        answer.hintUsed || false,
                        answer.answerChanged || false,
                        answer.pointsEarned || 0,
                        new Date().toISOString()
                    ]
                );
            }
        }
        
        // Gamification End of Quest Additions
        let stars = 0;
        if (mastery >= 90) stars = 3;
        else if (mastery >= 70) stars = 2;
        else if (mastery >= 50) stars = 1;

        let gemsAwarded = 0;
        if (stars === 3) {
            gemsAwarded = 1; // Only 3-star mastery earns the rare Gem
            await gamificationService.initializeUser(userId);
            await gamificationService.awardGems(userId, 'general', 0, 1, 'quest_3star_complete');
        }

        let chestAwarded = null;
        if (stars === 3) {
            chestAwarded = 'gold';
            await chestService.awardChest(userId, 'gold');
        } else if (stars === 2) {
            chestAwarded = 'silver';
            await chestService.awardChest(userId, 'silver');
        }

        const achievementsUnlocked = await achievementService.checkAndAwardAchievements(userId);
        
        // Update total cumulative stars
        if (stars > 0) {
            await pool.query(
                `UPDATE user_stats SET "totalStars" = "totalStars" + $2 WHERE "userId" = $1`,
                [userId, stars]
            );
        }
        
        res.json({
            success: true,
            mastery,
            nextUnlocked,
            nextQuestId: nextUnlocked ? questId + 1 : null,
            message: nextUnlocked ? '🎉 Quest complete! Next quest unlocked!' : 'Quest complete!',
            stars,
            gemsAwarded,
            chestAwarded,
            achievementsUnlocked
        });
        
    } catch (err) {
        console.error('❌ Error completing quest:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/quests/progress/:userId/:challengeId
router.get('/progress/:userId/:challengeId', async (req, res) => {
    const { userId, challengeId } = req.params;
    
    try {
        const result = await pool.query(
            `SELECT * FROM user_challenge_progress 
             WHERE "userId" = $1 AND "challengeId" = $2`,
            [userId, challengeId]
        );
        
        res.json(result.rows[0] || null);
    } catch (err) {
        console.error('Error loading quest progress:', err);
        res.status(500).json({ error: err.message });
    }
});
// Add to server/routes/api/quests.js

const fs = require('fs').promises;
const path = require('path');

// GET /api/quests/simulation/* - Serve simulation JSON files
router.get('/simulation/*', async (req, res) => {
    const filePath = req.params[0]; // Capture everything after /simulation/
    
    try {
        // Security: prevent directory traversal
        const normalizedPath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
        
        // Construct full path to the JSON file
        // Files are in public/content/...
        const fullPath = path.join(__dirname, '../../../public/content', normalizedPath);
        
        console.log('📂 Serving simulation:', fullPath);
        
        // Check if file exists
        await fs.access(fullPath);
        
        // Read and send file
        const data = await fs.readFile(fullPath, 'utf8');
        const jsonData = JSON.parse(data);
        
        // Add file path metadata to help with asset resolution
        jsonData._filePath = normalizedPath;
        
        res.json(jsonData);
    } catch (err) {
        console.error('❌ Error serving simulation:', err);
        res.status(404).json({ 
            error: 'Simulation file not found',
            path: filePath 
        });
    }
});
module.exports = router;