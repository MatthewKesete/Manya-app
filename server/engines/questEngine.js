// server/engines/questEngine.js
const challengeLoader = require('../config/challengeLoader');
const pool = require('../config/database');

class QuestEngine {
    constructor() {
        // All parameters from your spec
        this.params = {
            masteryUnlock: 75,           // 75-80% to unlock next quest
            frustrationThreshold: 70,     // >70% frustration triggers guardrail
            confidenceThreshold: 75,      // ≥75% confidence unlocks faster modes
            hintUsageThreshold: 45,       // >45% hint usage elongates quest
            consecutiveErrorThreshold: 2, // ≥2 errors drops variant
            baseLength: 10,               // Default quest length
            maxLength: 20,                // Absolute maximum
            quickFireThreshold: 65,        // Overall accuracy for QuickFire
            timedThreshold: 70             // Topic accuracy for Timed mode
        };
    }
    
    async generateQuest(topicName, subtopicId, questId, userId) {
    console.log(`🎯 Generating Quest ${questId} for ${topicName} / subtopic ${subtopicId} for user ${userId}`);
    
    // 1. Get the challenge structure
    const challenge = challengeLoader.getChallenge(topicName, subtopicId);
    if (!challenge) {
        throw new Error(`Challenge not found: ${topicName} / ${subtopicId}`);
    }
        
        // 2. Load user state from database
        const userState = await this.loadUserState(userId, subtopicId);
        
        // 3. Calculate quest length (8-20 based on parameters)
        const length = this.calculateQuestLength(userState, questId);
        
        // 4. Determine variant distribution (from spec)
        const variants = this.getVariantDistribution(questId);
        
        // 5. Select game mode based on user state
        const gameMode = this.selectGameMode(userState, questId);
        
        // 6. Calculate simulation ratio
        const simRatio = this.getSimulationRatio(questId, userState);
        
        // 7. Select questions from database
        const questions = await this.selectQuestions(
            userId,
            challenge.name,
            length,
            variants,
            simRatio,
            userState
        );
        
        return {
            questId,
            challengeId: subtopicId,
            challengeName: challenge.name,
            challengeIcon: challenge.icon || '📘',
            name: `Quest ${questId}: ${this.getQuestName(questId)}`,
            description: this.getQuestDescription(questId, challenge),
            icon: this.getQuestIcon(questId),
            length,
            gameMode,
            gameModeIcon: this.getGameModeIcon(gameMode),
            questions: questions.map(q => ({
                id: q.Q_ID,
                text: q.Question_Text,
                options: {
                    A: q.Option_A,
                    B: q.Option_B,
                    C: q.Option_C,
                    D: q.Option_D
                },
                correctAnswer: q.Correct_Answer,
                hint: q.Hint,
                difficulty: q.Difficulty,
                variant: this.extractVariant(q.Q_ID),
                isSimulation: q.simulation_type ? true : false,
                simulationType: q.simulation_type || null,
                simulationPath: q.simulation_path || null
            })),
            unlocks: {
                nextQuest: questId < 5,
                requirement: questId < 5 ? `${this.params.masteryUnlock}% mastery to unlock` : null,
                nextQuestId: questId < 5 ? questId + 1 : null
            },
            metadata: {
                variantMix: variants,
                userStateAtGeneration: {
                    confidence: userState.confidence,
                    frustration: userState.frustration,
                    hintUsage: userState.hintUsage
                }
            }
        };
    }
    
    async selectQuestions(userId, subtopic, count, variants, simRatio, userState) {
        // Base query - get questions from this subtopic
        const query = `
            SELECT * FROM qbrss 
            WHERE "Sub_Topic" = $1
            ORDER BY RANDOM()
            LIMIT $2
        `;
        
        const result = await pool.query(query, [subtopic, Math.ceil(count * 1.5)]); // Get extra for filtering
        
        let questions = result.rows;
        let selectedQuestions = [];
        
        // Apply variant distribution
        const variantCounts = {
            V1: Math.round(count * variants.V1),
            V2: Math.round(count * variants.V2),
            V3: count - Math.round(count * variants.V1) - Math.round(count * variants.V2)
        };
        
        // Select questions matching each variant
        for (const [variant, needed] of Object.entries(variantCounts)) {
            const variantQuestions = questions.filter(q => q.Q_ID.includes(`-${variant}`));
            selectedQuestions.push(...variantQuestions.slice(0, needed));
        }
        
        // If we don't have enough, pad with random questions
        while (selectedQuestions.length < count) {
            const extra = questions[Math.floor(Math.random() * questions.length)];
            if (!selectedQuestions.includes(extra)) {
                selectedQuestions.push(extra);
            }
        }
        
        // Shuffle the final list
        return this.shuffleArray(selectedQuestions).slice(0, count);
    }
    
   calculateQuestLength(userState, questId) {
    // Different base lengths per quest
    const baseLengths = {
        1: 6,  // Quest 1: 6 questions (warm-up)
        2: 8,  // Quest 2: 8 questions
        3: 10, // Quest 3: 10 questions
        4: 10, // Quest 4: 10 questions
        5: 12  // Quest 5: 12 questions (mastery)
    };
    
    let length = baseLengths[questId] || 8;
    
    // Only apply elongation for Quests 3-5 (not for warm-up!)
    if (questId >= 3) {
        if (userState.overallAccuracy < 60 || 
            userState.hintUsage > this.params.hintUsageThreshold || 
            userState.frustration > this.params.frustrationThreshold) {
            length += Math.floor(Math.random() * 4) + 2; // +2 to +6
        }
    }
    
    // Set caps per quest
    const caps = {
        1: 8,  // Quest 1 max 8 questions
        2: 10, // Quest 2 max 10
        3: 15, // Quest 3 max 15
        4: 15, // Quest 4 max 15
        5: 20  // Quest 5 max 20
    };
    
    return Math.min(length, caps[questId]);
}
    
    getVariantDistribution(questId) {
        // From your spec table
        const distributions = {
            1: { V1: 0.8, V2: 0.2, V3: 0.0 },
            2: { V1: 0.5, V2: 0.4, V3: 0.1 },
            3: { V1: 0.3, V2: 0.45, V3: 0.25 },
            4: { V1: 0.2, V2: 0.5, V3: 0.3 },
            5: { V1: 0.1, V2: 0.15, V3: 0.75 }
        };
        return distributions[questId] || distributions[1];
    }
    
    selectGameMode(userState, questId) {
        // Priority 1: Frustration guardrail
        if (userState.frustration > this.params.frustrationThreshold) {
            console.log(`   🎮 Mode: none (frustration guardrail)`);
            return 'none';
        }
        
        // Priority 2: QuickFire
        if (userState.confidence >= this.params.confidenceThreshold &&
            userState.overallAccuracy >= this.params.quickFireThreshold &&
            userState.avgResponseTime < 15) {
            console.log(`   🎮 Mode: quickfire (confidence ${userState.confidence}%, accuracy ${userState.overallAccuracy}%)`);
            return 'quickfire';
        }
        
        // Priority 3: Timed (Quest 5 only)
        if (questId === 5 && 
            userState.confidence >= this.params.confidenceThreshold &&
            userState.overallTopicAccuracy >= this.params.timedThreshold) {
            console.log(`   🎮 Mode: timed (Quest 5, confidence ${userState.confidence}%, topic accuracy ${userState.overallTopicAccuracy}%)`);
            return 'timed';
        }
        
        // Priority 4: Marathon (Quest 4)
        if (questId === 4 && 
            (userState.consecutiveErrors >= 2 || userState.hintUsage > 45)) {
            console.log(`   🎮 Mode: marathon (Quest 4, errors ${userState.consecutiveErrors}, hintUsage ${userState.hintUsage}%)`);
            return 'marathon';
        }
        
        console.log(`   🎮 Mode: none (default)`);
        return 'none';
    }
    
    getSimulationRatio(questId, userState) {
        const baseRatios = {
            1: 0.10,  // 10% in Quest 1
            2: 0.12,  // 12% in Quest 2
            3: 0.20,  // 20% in Quest 3
            4: 0.22,  // 22% in Quest 4
            5: 0.25   // 25% in Quest 5
        };
        
        let ratio = baseRatios[questId] || 0.10;
        
        // Boost if confidence high but accuracy low
        if (userState.confidence >= 75 && userState.overallTopicAccuracy < 60) {
            ratio += 0.05;
            console.log(`   🎮 Simulation ratio boosted to ${Math.round(ratio*100)}% (high confidence, low accuracy)`);
        }
        
        return Math.min(0.30, ratio); // Cap at 30%
    }
    
    async loadUserState(userId, subtopicId) {
        try {
            // Get user's overall stats
            const statsResult = await pool.query(
                `SELECT 
                    AVG("isCorrect"::int) as overall_accuracy,
                    AVG("confidenceRating") as avg_confidence,
                    AVG("frustrationLevel") as avg_frustration,
                    AVG("timeSpentMs") as avg_time
                 FROM user_answer 
                 WHERE "userId" = $1`,
                [userId]
            );
            
            // Get hint usage
            const hintResult = await pool.query(
                `SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN "hintUsed" THEN 1 ELSE 0 END) as hints
                 FROM user_answer 
                 WHERE "userId" = $1`,
                [userId]
            );
            
            // Get consecutive errors from recent answers
            const recentResult = await pool.query(
                `SELECT "isCorrect" FROM user_answer 
                 WHERE "userId" = $1 
                 ORDER BY "answeredAt" DESC 
                 LIMIT 5`,
                [userId]
            );
            
            let consecutiveErrors = 0;
            for (const row of recentResult.rows) {
                if (!row.isCorrect) {
                    consecutiveErrors++;
                } else {
                    break;
                }
            }
            
            // Get topic-specific accuracy
            const topicResult = await pool.query(
                `SELECT 
                    AVG("isCorrect"::int) as topic_accuracy
                 FROM user_answer ua
                 JOIN qbrss q ON ua."questionId" = q."Q_ID"
                 WHERE ua."userId" = $1 AND q."Sub_Topic" = (
                     SELECT "Sub_Topic" FROM qbrss WHERE "Q_ID" = (
                         SELECT "questionId" FROM user_answer 
                         WHERE "userId" = $1 
                         ORDER BY "answeredAt" DESC LIMIT 1
                     )
                 )`,
                [userId]
            );
            
            const stats = statsResult.rows[0] || {};
            const hints = hintResult.rows[0] || { total: 0, hints: 0 };
            
            return {
                overallAccuracy: Math.round((stats.overall_accuracy || 0) * 100),
                overallTopicAccuracy: Math.round((topicResult.rows[0]?.topic_accuracy || 0) * 100),
                confidence: Math.round(stats.avg_confidence || 70),
                frustration: Math.round(stats.avg_frustration || 0),
                hintUsage: hints.total > 0 ? Math.round((hints.hints / hints.total) * 100) : 0,
                consecutiveErrors: consecutiveErrors,
                avgResponseTime: Math.round((stats.avg_time || 15000) / 1000),
                lastReviewDays: 0 // Calculate from last activity
            };
        } catch (err) {
            console.error('Error loading user state:', err);
            // Return defaults
            return {
                overallAccuracy: 65,
                overallTopicAccuracy: 68,
                confidence: 72,
                frustration: 35,
                hintUsage: 30,
                consecutiveErrors: 0,
                avgResponseTime: 12,
                lastReviewDays: 2
            };
        }
    }
    
    getQuestName(questId) {
        const names = ['Warm-up', 'Exploration', 'Practice', 'Reinforcement', 'Mastery'];
        return names[questId - 1];
    }
    
    getQuestDescription(questId, challenge) {
        const descriptions = [
            `Get started with the basics of ${challenge.name.toLowerCase()}`,
            `Explore deeper concepts in ${challenge.name.toLowerCase()}`,
            `Practice applying your knowledge of ${challenge.name.toLowerCase()}`,
            `Reinforce what you've learned about ${challenge.name.toLowerCase()}`,
            `Master ${challenge.name.toLowerCase()} with challenging questions`
        ];
        return descriptions[questId - 1];
    }
    
    getQuestIcon(questId) {
        const icons = ['🟢', '🟡', '🟠', '🔴', '⚡'];
        return icons[questId - 1];
    }
    
    getGameModeIcon(mode) {
        const icons = {
            'none': '📚',
            'quickfire': '⚡',
            'timed': '⏱️',
            'marathon': '🏃'
        };
        return icons[mode] || '📚';
    }
    
    extractVariant(qId) {
        if (!qId) return 'V1';
        const match = qId.match(/-V(\d+)$/);
        return match ? `V${match[1]}` : 'V1';
    }
    
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
	// Add to questEngine.js

// Add to questEngine.js - inside the class

async shouldShowSimulation(questId, userState, subtopicName) {
    // Research-based ratios from your spec
    const simRatios = {
        1: 0.05,  // Quest 1: 5% (teaser only)
        2: 0.10,  // Quest 2: 10% (excitement)
        3: 0.22,  // Quest 3: 22% (peak learning)
        4: 0.18,  // Quest 4: 18% (reinforcement)
        5: 0.25   // Quest 5: 25% (mastery pressure)
    };
    
    // Base probability
    let probability = simRatios[questId] || 0.10;
    
    // Adjust based on user state
    if (userState.confidence > 75 && userState.overallTopicAccuracy < 65) {
        probability += 0.10; // Boost for confident but struggling users
    }
    
    if (userState.frustration > 60) {
        probability += 0.05; // Simulations can help with frustration
    }
    
    return Math.random() < probability;
}

async getSimulationForConcept(subtopicName, mode = null) {
    try {
        let query = `
            SELECT * FROM qbrss 
            WHERE "Sub_Topic" = $1 
            AND "question_type" = 'SIM'
        `;
        const params = [subtopicName];
        
        if (mode) {
            query += ` AND "mode_sim" = $2`;
            params.push(mode);
        }
        
        query += ` ORDER BY RANDOM() LIMIT 1`;
        
        const result = await pool.query(query, params);
        
        if (result.rows.length === 0) return null;
        
        const sim = result.rows[0];
        
        return {
            id: sim.Q_ID,
            type: 'simulation',
            question_type: 'SIM',
            engine_type: sim.engine_type_sim,
            mode: sim.mode_sim,
            file_path: sim.file_path_sim,
            title: sim.Question_Text,
            hint: sim.Hint,
            subtopic: sim.Sub_Topic,
            tags: sim.Tags
        };
    } catch (err) {
        console.error('Error getting simulation:', err);
        return null;
    }
}

async shouldShowRecap(subtopicName, userState) {
    // Get per-concept stats
    const conceptAccuracy = userState.perConceptAccuracy?.[subtopicName] || 100;
    const conceptHints = userState.perConceptHints?.[subtopicName] || 0;
    const conceptErrors = userState.perConceptErrors?.[subtopicName] || 0;
    
    // Trigger conditions
    const lowAccuracy = conceptAccuracy < 60;
    const highHints = conceptHints > 50;
    const manyErrors = conceptErrors >= 3;
    
    if (lowAccuracy || highHints || manyErrors) {
        // Get a study-mode simulation for recap
        return await this.getSimulationForConcept(subtopicName, 'study');
    }
    
    return null;
}

// Add this to your generateQuest method where you select questions
// After getting the question list, check if we should replace with simulation
async enhanceQuestWithSimulations(questions, questId, userState, subtopicName) {
    const enhancedQuestions = [];
    
    for (let i = 0; i < questions.length; i++) {
        const originalQuestion = questions[i];
        
        // Check for recap first (most important)
        if (i === 0 || i === Math.floor(questions.length / 2)) {
            const recap = await this.shouldShowRecap(subtopicName, userState);
            if (recap) {
                enhancedQuestions.push(recap);
                continue;
            }
        }
        
        // Check for regular simulation
        if (await this.shouldShowSimulation(questId, userState, subtopicName)) {
            const sim = await this.getSimulationForConcept(subtopicName);
            if (sim) {
                enhancedQuestions.push(sim);
                continue;
            }
        }
        
        // Keep original question
        enhancedQuestions.push(originalQuestion);
    }
    
    return enhancedQuestions;
}
}

module.exports = new QuestEngine();