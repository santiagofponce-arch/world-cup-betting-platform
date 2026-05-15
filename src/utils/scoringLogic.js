// Customizable World Cup 2026 Scoring Logic
// This isolated file defines exactly how points scale.
// Modify these variables manually at any point to tweak the tournament rules.

export const SCORING_RULES = {
  // --- FASE DE GRUPOS ---
  GROUP: {
    OUTCOME: 5,       // RESULTADO A (Win/Draw/Loss)
    EXACT_SCORE: 3,   // RESULTADO EXACTO
    TOTAL_GOALS: 2    // CANTIDAD DE GOLES (Total goals correct, e.g. 2-0 vs 1-1)
  },
  
  // --- ELIMINATORIAS (Knockout) ---
  KNOCKOUT: {
    QUALIFIER: 2,     // Clasificado correcto
    TOTAL_GOALS: 3,   // Cantidad de Goles 120'
    EXACT_SCORE: 7,   // Marcador exacto a 120'
    PENALTIES: 2      // Penales sí/no (Prediction of whether match ends in a shootout)
  },
  
  // --- PREMIOS (Awards / Open Questions) ---
  AWARDS: {
    CHAMPION: 30,
    TOP_SCORER: 10,
    BEST_PLAYER: 10,
    BEST_GOALKEEPER: 10
  }
};

/**
 * Evaluates points for a single match prediction.
 * @param {Object} pred - Predicted data { home, away, qualifier, penalties }
 * @param {Object} real - Actual data { home, away, qualifier, penalties }
 * @param {string} stage - 'group' or others (Round of 32, etc.)
 */
export const calculateMatchPoints = (pred, real, stage) => {
  const pH = parseInt(pred.home, 10);
  const pA = parseInt(pred.away, 10);
  const rH = parseInt(real.home, 10);
  const rA = parseInt(real.away, 10);

  // Return 0 if scores are missing
  if (isNaN(pH) || isNaN(pA) || isNaN(rH) || isNaN(rA)) {
    return { points: 0, isExact: false, isCorrectOutcome: false };
  }

  let points = 0;
  let isExact = false;
  let isCorrectOutcome = false;

  const isGroup = stage === 'group';

  if (isGroup) {
    // 1. Outcome (Win/Draw/Loss) - 5 pts
    const predictedDiff = pH - pA;
    const realDiff = rH - rA;
    if ((predictedDiff > 0 && realDiff > 0) || (predictedDiff < 0 && realDiff < 0) || (predictedDiff === 0 && realDiff === 0)) {
      points += SCORING_RULES.GROUP.OUTCOME;
      isCorrectOutcome = true;
    }

    // 2. Exact Score - 3 pts
    if (pH === rH && pA === rA) {
      points += SCORING_RULES.GROUP.EXACT_SCORE;
      isExact = true;
    }

    // 3. Total Goals - 2 pts
    if ((pH + pA) === (rH + rA)) {
      points += SCORING_RULES.GROUP.TOTAL_GOALS;
    }
  } else {
    // --- ELIMINATORIAS ---
    
    // 1. Qualifier - 2 pts
    // If scores determine winner (not a draw), check outcome. 
    // If it's a draw, check the explicit qualifier field.
    const rWinner = rHomeWinner(rH, rA, real.qualifier);
    const pWinner = rHomeWinner(pH, pA, pred.qualifier);
    if (pWinner === rWinner && pWinner !== null) {
      points += SCORING_RULES.KNOCKOUT.QUALIFIER;
      isCorrectOutcome = true; // For stats tracking: correctly guessed who advances
    }

    // 2. Total Goals 120' - 3 pts
    if ((pH + pA) === (rH + rA)) {
      points += SCORING_RULES.KNOCKOUT.TOTAL_GOALS;
    }

    // 3. Exact Score 120' - 7 pts
    if (pH === rH && pA === rA) {
      points += SCORING_RULES.KNOCKOUT.EXACT_SCORE;
      isExact = true;
    }


    // 4. Penalties Yes/No - 2 pts
    // User predicts if there will be a shootout (usually true if they predict a draw in 120')
    const pPens = !!pred.penalties;
    const rPens = !!real.penalties;
    if (pPens === rPens) {
      points += SCORING_RULES.KNOCKOUT.PENALTIES;
    }
  }

  return { points, isExact, isCorrectOutcome };
};

// Helper to determine who advanced
const rHomeWinner = (h, a, qualifier) => {
  if (h > a) return 'home';
  if (a > h) return 'away';
  return qualifier; // 'home' or 'away' if draw
};

/**
 * Calculates total stats for a user, including end-of-tournament awards.
 */
export const calculateTotalUserStats = (userPredictions, realResults, matchesData, dynamicFactors = {}) => {
  let totalPoints = 0;
  let exactMatches = 0;
  let correctOutcomes = 0;

  if (!userPredictions || !realResults) {
    return { totalPoints, exactMatches, correctOutcomes };
  }

  // 1. Calculate Match Points
  Object.keys(realResults).forEach(matchId => {
    // Only process numerical match IDs (or match result objects that are actually matches)
    if (isNaN(Number(matchId))) return;

    const real = realResults[matchId];
    const pred = userPredictions[matchId];

    if (pred) {
      const matchObj = matchesData.find(m => m.id === Number(matchId) || m.id === matchId);
      const stage = matchObj ? matchObj.stage : 'group';

      const res = calculateMatchPoints(pred, real, stage);

      totalPoints += res.points;
      if (res.isExact) exactMatches++;
      if (res.isCorrectOutcome) correctOutcomes++;
    }
  });

  // 2. Calculate Award Points
  const pAwards = userPredictions.awards || {};
  const rAwards = realResults.awards || {};

  if (pAwards.champion && rAwards.champion && pAwards.champion.trim().toLowerCase() === rAwards.champion.trim().toLowerCase()) {
    const factor = dynamicFactors.championFactor !== undefined ? dynamicFactors.championFactor : 1;
    totalPoints += Math.round(SCORING_RULES.AWARDS.CHAMPION * factor);
  }
  if (pAwards.topScorer && rAwards.topScorer && pAwards.topScorer.trim().toLowerCase() === rAwards.topScorer.trim().toLowerCase()) {
    totalPoints += SCORING_RULES.AWARDS.TOP_SCORER;
  }
  if (pAwards.bestPlayer && rAwards.bestPlayer && pAwards.bestPlayer.trim().toLowerCase() === rAwards.bestPlayer.trim().toLowerCase()) {
    totalPoints += SCORING_RULES.AWARDS.BEST_PLAYER;
  }
  if (pAwards.bestGoalkeeper && rAwards.bestGoalkeeper && pAwards.bestGoalkeeper.trim().toLowerCase() === rAwards.bestGoalkeeper.trim().toLowerCase()) {
    totalPoints += SCORING_RULES.AWARDS.BEST_GOALKEEPER;
  }

  // 3. Calculate Tie-breaker stats (differences)
  const goalsDiff = Math.abs(Number(pAwards.totalGoals || 0) - Number(rAwards.totalGoals || 0));
  const redCardsDiff = Math.abs(Number(pAwards.redCards || 0) - Number(rAwards.redCards || 0));

  return { totalPoints, exactMatches, correctOutcomes, goalsDiff, redCardsDiff };
};
