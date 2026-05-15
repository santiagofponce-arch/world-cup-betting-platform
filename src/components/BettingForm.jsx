import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Save } from 'lucide-react';
import './BettingForm.css';
import matchesData from '../data/matches.json';
import { teamFlags, groupColors } from '../data/teamFlags';
import { translations, countryNames } from '../data/i18n';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const BettingForm = ({ currentUser, t }) => {
  const [predictions, setPredictions] = useState({});
  const [awards, setAwards] = useState({});

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [now, setNow] = useState(new Date());

  const [activeStage, setActiveStage] = useState('group'); // group or knockout
  const [activeGroup, setActiveGroup] = useState('A');
  const [activeKnockoutPhase, setActiveKnockoutPhase] = useState('Round of 32');
  const [timeLeftStr, setTimeLeftStr] = useState('');
  const [globalLocks, setGlobalLocks] = useState({
    knockoutLocks: {
      'Round of 32': true,
      'Round of 16': true,
      'Quarter-finals': true,
      'Semi-finals': true,
      'Third Place': true,
      'Third-place': true,
      'Final': true
    },
    awardsLocked: true
  });

  // Sync to global admin lock
  React.useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system', 'global_settings'), docSnap => {
      if (docSnap.exists()) {
        setGlobalLocks(docSnap.data());
      }
    });
    return () => unsub();
  }, []);

  // Create a timer to lock matches automatically and render countdown
  React.useEffect(() => {
    const targetDate = new Date('2026-06-28T00:00:00-04:00'); // Knockout kicks off June 28

    // Immediate calculation
    const calcDiff = () => {
      const cur = new Date();
      setNow(cur);
      const diff = targetDate - cur;
      if (diff <= 0) {
        setTimeLeftStr('Unlocked');
      } else {
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const m = Math.floor((diff / 1000 / 60) % 60);
        setTimeLeftStr(`${d}d ${h}h ${m}m`);
      }
    };
    calcDiff();

    const interval = setInterval(calcDiff, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // Fetch Existing Predictions from Firebase
  React.useEffect(() => {
    if (!currentUser) return;
    const fetchPredictions = async () => {
      try {
        const userId = currentUser.id || currentUser.uid;
        const docRef = doc(db, 'predictions', userId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setPredictions(data.scores || {});
          setAwards(data.awards || {});
        }

      } catch (err) {
        console.error('Error fetching predictions:', err);
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchPredictions();
  }, [currentUser]);

  const isMatchLocked = (match) => {
    if (match.stage === 'group') {
      const kickoff = new Date(match.kickoff_time);
      const lockTime = new Date(kickoff.getTime() - (24 * 60 * 60 * 1000));
      return now >= lockTime;
    }

    if (globalLocks.knockoutLocks && globalLocks.knockoutLocks[match.stage]) {
      return true;
    }
    return false;
  };

  const formatOffsetTime = (isoString, offsetHours) => {
    try {
      const d = new Date(isoString);
      const localMs = d.getTime() + (offsetHours * 60 * 60 * 1000);
      const localDate = new Date(localMs);

      let h = localDate.getUTCHours();
      const m = localDate.getUTCMinutes();
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      if (h === 0) h = 12;

      return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
    } catch (e) {
      return '';
    }
  };

  const getFlagUrl = (teamName) => {
    if (!teamName || !teamName.trim) return '';
    const code = teamFlags[teamName.trim()];
    if (code) return `https://flagcdn.com/w320/${code}.png`;
    return ''; // Fallback empty
  };

  const stageColors = {
    'Round of 32': '#FFFFFF',
    'Round of 16': '#4CAF50',
    'Quarter-finals': '#FF9800',
    'Semi-finals': '#F44336',
    'Third Place': '#C5B358',
    'Third-place': '#C5B358',
    'Final': '#FFD700'
  };

  const getHexColor = (match) => {
    if (match.stage === 'group' && match.group) return groupColors[match.group] || 'var(--card-bg)';
    return stageColors[match.stage] || 'var(--card-bg)';
  };

  const handlePredictionChange = (matchId, field, value) => {
    let finalValue = value;
    if ((field === 'home' || field === 'away') && value !== '') {
      let num = parseInt(value, 10);
      if (isNaN(num) || num < 0) return; // ignore negative
      finalValue = num.toString();
    }
    setPredictions(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [field]: finalValue
      }
    }));
    setSaveStatus('idle');
  };

  const handleSave = async () => {
    // Validation: make sure no partial matches exist
    const invalidMatches = Object.entries(predictions).filter(([key, scores]) => {
      const hasHome = scores.home !== undefined && scores.home !== '';
      const hasAway = scores.away !== undefined && scores.away !== '';
      return (hasHome && !hasAway) || (!hasHome && hasAway);
    });

    if (invalidMatches.length > 0) {
      alert("⚠️ Incomplete Prediction! You must enter scores for BOTH teams if you are predicting a match.");
      return;
    }

    setSaveStatus('saving');
    try {
      const userId = currentUser.id || currentUser.uid;
      const docRef = doc(db, 'predictions', userId);

      // Control Mechanism: Always pre-fetch the absolute newest state directly before saving
      const snap = await getDoc(docRef);
      let existingData = { scores: {}, awards: {} };
      if (snap.exists()) {
        existingData = snap.data();
      }

      // Merge specifically edited bets cleanly over the DB state
      const mergedScores = { ...existingData.scores };
      for (const [matchId, scores] of Object.entries(predictions)) {
        const hasHome = scores.home !== undefined && scores.home !== '';
        const hasAway = scores.away !== undefined && scores.away !== '';

        if (hasHome && hasAway) {
          mergedScores[matchId] = scores; // Override with edited bet
        } else if (!hasHome && !hasAway) {
          delete mergedScores[matchId]; // User intentionally cleared the fields
        }
      }

      const mergedAwards = { ...existingData.awards, ...awards };
      // Strip out empty string awards
      Object.keys(mergedAwards).forEach(key => {
        if (mergedAwards[key] === '') delete mergedAwards[key];
      });

      await setDoc(docRef, {
        scores: mergedScores,
        awards: mergedAwards,
        lastUpdated: new Date().toISOString(),
        username: currentUser.name || 'Anonymous',
        avatar: currentUser.avatar || ''
      }, { merge: true });


      // Update local state tightly to the unified save data
      setPredictions(mergedScores);
      setAwards(mergedAwards);

      setSaveStatus('success');
      alert("✅ Your predictions have been perfectly saved and safely merged with your old ones!");
      setTimeout(() => setSaveStatus('idle'), 4000);
    } catch (err) {
      console.error("Error saving match predictions:", err);
      alert("Error saving predictions. Make sure you have internet and database rules are deployed.");
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
  };

  // Group the matches by Stage to render them beautifully
  const groupMatches = matchesData.filter(m => m.stage === 'group');
  const knockoutMatches = matchesData.filter(m => m.stage !== 'group');

  const renderMatchCard = (match) => {
    const locked = isMatchLocked(match);

    const hexColor = getHexColor(match);
    const homeFlagUrl = getFlagUrl(match.home);
    const awayFlagUrl = getFlagUrl(match.away);
    const hasFlags = homeFlagUrl && awayFlagUrl;

    return (
      <div
        key={match.id}
        className={`match-card ${locked ? 'locked' : ''} group-stage-card`}
        style={{
          '--card-bg-color': hexColor,
          ...(hasFlags ? {
            '--flag-home': `url(${homeFlagUrl})`,
            '--flag-away': `url(${awayFlagUrl})`
          } : {})
        }}
      >
        <div className="match-info">
          <span className="match-group" style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
            {match.stage === 'group' ? `${t('group')} ${match.group}` : t(match.stage)}
          </span>
          <span className="match-date" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', backgroundColor: 'rgba(0,0,0,0.4)', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
            {locked && <span title="Locked" style={{ color: 'var(--accent)' }}>🔒</span>}
            {match.date_string.replace(', 2026', '')} | USA: <strong>{formatOffsetTime(match.kickoff_time, -4)}</strong> | CHILE: <strong>{formatOffsetTime(match.kickoff_time, -4)}</strong> | JAPAN: <strong>{formatOffsetTime(match.kickoff_time, 9)}</strong>
          </span>
        </div>

        <div className="match-teams">
          <div className="team home">
            <span className="team-name">{match.home}</span>
            <input
              type="number"
              min="0"
              max="20"
              className="score-input"
              placeholder="?"
              value={predictions[match.id]?.home || ''}
              onKeyDown={(e) => { if (['e', 'E', '.', ',', '+', '-'].includes(e.key)) e.preventDefault(); }}
              onChange={(e) => handlePredictionChange(match.id, 'home', e.target.value)}
              disabled={locked}
            />
          </div>

          <div className="vs-badge">VS</div>

          <div className="team away">
            <input
              type="number"
              min="0"
              max="20"
              className="score-input"
              placeholder="?"
              value={predictions[match.id]?.away || ''}
              onKeyDown={(e) => { if (['e', 'E', '.', ',', '+', '-'].includes(e.key)) e.preventDefault(); }}
              onChange={(e) => handlePredictionChange(match.id, 'away', e.target.value)}
              disabled={locked}
            />
            <span className="team-name">{match.away}</span>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '0.8rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', backgroundColor: 'rgba(0,0,0,0.4)', padding: '0.2rem 0.5rem', borderRadius: '4px', alignSelf: 'center' }}>
          {match.stadium}
        </div>

        {match.stage !== 'group' && (
          <div className="knockout-extra-options" style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
              <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: locked ? 'default' : 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!predictions[match.id]?.penalties}
                  onChange={(e) => handlePredictionChange(match.id, 'penalties', e.target.checked)}
                  disabled={locked}
                />
                {t('wentToPenalties') || '¿Hay penales?'} (+2 pts)
              </label>
            </div>

            {predictions[match.id]?.home === predictions[match.id]?.away && predictions[match.id]?.home !== '' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>{t('whoAdvances') || '¿Quién clasifica?'} (+2 pts)</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handlePredictionChange(match.id, 'qualifier', 'home')}
                    disabled={locked}
                    className={`mini-tab ${predictions[match.id]?.qualifier === 'home' ? 'active' : ''}`}
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                  >
                    {match.home}
                  </button>
                  <button
                    onClick={() => handlePredictionChange(match.id, 'qualifier', 'away')}
                    disabled={locked}
                    className={`mini-tab ${predictions[match.id]?.qualifier === 'away' ? 'active' : ''}`}
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                  >
                    {match.away}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (isLoadingData) {
    return (
      <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>Cargando tus predicciones...</h2>
      </div>
    );
  }

  return (
    <>
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{t('makePredictions') || 'Make Your Predictions'}</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          {t('lockWarning') || 'All matches automatically lock entirely exactly 24 hours before actual kickoff time.'}
        </p>
      </div>

      <div className="scoring-rules" style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', fontSize: '0.85rem', color: 'var(--text-muted)', borderLeft: '4px solid var(--primary)', lineHeight: '1.6', position: 'relative' }}>
        <button
          onClick={() => setShowRulesModal(true)}
          style={{ position: 'absolute', top: '1rem', right: '1rem', padding: '0.5rem 1rem', background: 'var(--primary)', color: 'black', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', zIndex: 10 }}
        >
          Ver Reglamento Completo 📋
        </button>
        <strong style={{ color: 'white', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>{t('systemHeader')}</strong>
        <em style={{ display: 'block', marginBottom: '0.5rem', color: '#ff4757', paddingRight: '120px' }}>{t('systemAdditive')}</em>
        • <strong>{t('groupStage')}:</strong> {t('systemGroupStage')}<br />
        • <strong>{t('knockoutStage')}:</strong> {t('systemKnockoutStage')}<br />
        • <strong>{t('openQuestionsTab')}:</strong> {t('systemAwards')}. <em>{t('systemTiebreakers')}</em><br /><br />
        <strong style={{ color: 'var(--primary)', letterSpacing: '0.5px', fontWeight: '900' }}>{t('systemPrizesHeader')}</strong> {t('systemPrizes')}
      </div>

      <div className="stage-tabs">
        <button onClick={() => setActiveStage('group')} className={activeStage === 'group' ? 'active' : ''}>
          {t('groupStage') || 'Group Stage'}
        </button>
        <button onClick={() => setActiveStage('knockout')} className={activeStage === 'knockout' ? 'active' : ''}>
          {t('knockoutStage') || 'Knockout Stage'}
        </button>
        <button onClick={() => setActiveStage('awards')} className={activeStage === 'awards' ? 'active' : ''}>
          {t('openQuestionsTab') || 'Preguntas Abiertas'}
        </button>
      </div>

      <div style={{ marginBottom: '3rem' }}>
        {activeStage === 'group' && (
          <>
            <div className="group-tabs-list">
              {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map(g => (
                <button
                  key={g}
                  onClick={() => setActiveGroup(g)}
                  className={`group-tab-btn ${activeGroup === g ? 'active' : ''}`}
                  style={{ '--tab-color': groupColors[g] || '#FFFFFF' }}
                >
                  {g}
                </button>
              ))}
            </div>

            <div className="matches-list">
              {groupMatches.filter(m => m.group === activeGroup).map(renderMatchCard)}
            </div>
          </>
        )}

        {activeStage === 'knockout' && (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', justifyContent: 'center', marginBottom: '2rem', padding: '0.5rem' }}>
              {['Round of 32', 'Round of 16', 'Quarter-finals', 'Semi-finals', 'Third Place', 'Final'].map(phase => (
                <button
                  key={phase}
                  onClick={() => setActiveKnockoutPhase(phase)}
                  style={{
                    padding: '0.6rem 1.2rem',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    border: `2px solid ${activeKnockoutPhase === phase ? stageColors[phase] : 'rgba(255,255,255,0.1)'}`,
                    background: activeKnockoutPhase === phase ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.2)',
                    color: activeKnockoutPhase === phase ? stageColors[phase] : 'var(--text-muted)'
                  }}
                >
                  {t(phase) || phase}
                </button>
              ))}
            </div>

            <div className="matches-list">
              {globalLocks.knockoutLocks && globalLocks.knockoutLocks[activeKnockoutPhase] ? (
                <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '4rem', display: 'block', marginBottom: '1rem' }}>🔒</span>
                  <h3 style={{ fontSize: '1.5rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>{t('phaseLocked')}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                    {t('phaseLockedDesc')}
                  </p>
                </div>
              ) : (
                knockoutMatches.filter(m => m.stage === activeKnockoutPhase).map(renderMatchCard)
              )}
            </div>
          </>
        )}

        {activeStage === 'awards' && (
          <div className="awards-form" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>

            {globalLocks.awardsLocked && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '1rem', background: 'rgba(255,71,87,0.1)', color: '#ff4757', borderRadius: '8px', border: '1px solid #ff4757' }}>
                {t('awardsLockedDesc')}
              </div>
            )}

            <div className="award-item" style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--primary)', fontWeight: 'bold' }}>{t('champion') || 'CAMPEON'} (30 pts)</label>
              <select
                disabled={globalLocks.awardsLocked}
                className="award-input"
                style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px' }}
                value={awards.champion || ''}
                onChange={(e) => { setAwards({ ...awards, champion: e.target.value }); setSaveStatus('idle'); }}
              >
                <option value="">Selecciona país...</option>
                {['Algeria', 'Argentina', 'Australia', 'Austria', 'Belgium', 'Bosnia and Herzegovina', 'Brazil', 'Canada', 'Cape Verde', 'Colombia', 'Congo DR', 'Croatia', 'Curaçao', 'Czechia', 'Ecuador', 'Egypt', 'England', 'France', 'Germany', 'Ghana', 'Haiti', 'Iran', 'Iraq', 'Ivory Coast', 'Japan', 'Jordan', 'Mexico', 'Morocco', 'Netherlands', 'New Zealand', 'Norway', 'Panama', 'Paraguay', 'Portugal', 'Qatar', 'Saudi Arabia', 'Scotland', 'Senegal', 'South Africa', 'South Korea', 'Spain', 'Sweden', 'Switzerland', 'Tunisia', 'Türkiye', 'USA', 'Uruguay', 'Uzbekistan'].map(c => (
                  <option key={c} value={c} style={{ color: 'black' }}>{countryNames[c] || c}</option>
                ))}
              </select>
            </div>
            <div className="award-item" style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--primary)', fontWeight: 'bold' }}>{t('topScorer') || 'GOLEADOR'} (10 pts)</label>
              <input
                type="text"
                disabled={globalLocks.awardsLocked}
                className="award-input"
                style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px' }}
                value={awards.topScorer || ''}
                onChange={(e) => { setAwards({ ...awards, topScorer: e.target.value }); setSaveStatus('idle'); }}
                placeholder="Nombre del jugador..."
              />
            </div>
            <div className="award-item" style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--primary)', fontWeight: 'bold' }}>{t('bestPlayer') || 'MEJOR JUGADOR'} (10 pts)</label>
              <input
                type="text"
                disabled={globalLocks.awardsLocked}
                className="award-input"
                style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px' }}
                value={awards.bestPlayer || ''}
                onChange={(e) => { setAwards({ ...awards, bestPlayer: e.target.value }); setSaveStatus('idle'); }}
                placeholder="Nombre del jugador..."
              />
            </div>
            <div className="award-item" style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--primary)', fontWeight: 'bold' }}>{t('bestGoalkeeper') || 'MEJOR ARQUERO'} (10 pts)</label>
              <input
                type="text"
                disabled={globalLocks.awardsLocked}
                className="award-input"
                style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px' }}
                value={awards.bestGoalkeeper || ''}
                onChange={(e) => { setAwards({ ...awards, bestGoalkeeper: e.target.value }); setSaveStatus('idle'); }}
                placeholder="Nombre del arquero..."
              />
            </div>
            <div className="award-item" style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', gridColumn: 'span 1' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ff4757', fontWeight: 'bold' }}>{t('redCards') || 'CANTIDAD DE TARJETAS ROJAS'} <span style={{ fontSize: '0.7rem' }}>(Tie-breaker)</span></label>
              <input
                type="number"
                disabled={globalLocks.awardsLocked}
                className="award-input"
                style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px' }}
                value={awards.redCards || ''}
                onKeyDown={(e) => { if (['e', 'E', '.', ',', '+', '-'].includes(e.key)) e.preventDefault(); }}
                onChange={(e) => {
                  let val = e.target.value;
                  if (val !== '' && parseInt(val, 10) < 0) return;
                  setAwards({ ...awards, redCards: val });
                  setSaveStatus('idle');
                }}
                placeholder="Tie-breaker..."
              />
            </div>
            <div className="award-item" style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', gridColumn: 'span 1' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ff4757', fontWeight: 'bold' }}>{t('totalTournamentGoals') || 'CANTIDAD DE GOLES EN EL TORNEO'} <span style={{ fontSize: '0.7rem' }}>(Tie-breaker)</span></label>
              <input
                type="number"
                disabled={globalLocks.awardsLocked}
                className="award-input"
                style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px' }}
                value={awards.totalGoals || ''}
                onKeyDown={(e) => { if (['e', 'E', '.', ',', '+', '-'].includes(e.key)) e.preventDefault(); }}
                onChange={(e) => {
                  let val = e.target.value;
                  if (val !== '' && parseInt(val, 10) < 0) return;
                  setAwards({ ...awards, totalGoals: val });
                  setSaveStatus('idle');
                }}
                placeholder="Tie-breaker..."
              />
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
        <button className="save-btn" onClick={handleSave} disabled={saveStatus !== 'idle'}>
          {saveStatus === 'idle' && (
            <>
              <Save size={18} />
              {t('save')}
            </>
          )}
          {saveStatus === 'saving' && t('save')}
          {saveStatus === 'success' && (
            <>
              <Save size={18} />
              {t('saved')}
            </>
          )}
          {saveStatus === 'error' && (
            <span style={{ color: '#ff4757' }}>🚨 Save Failed 🚨</span>
          )}
        </button>
      </div>
    </div>
      {showRulesModal && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
          <div style={{ background: '#1a1a1a', border: '1px solid var(--primary)', borderRadius: '16px', maxWidth: '800px', width: '100%', maxHeight: '85vh', overflowY: 'auto', padding: '2rem', position: 'relative', color: 'white', boxShadow: '0 10px 50px rgba(0,0,0,0.5)' }}>
            <button onClick={() => setShowRulesModal(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: '#ff4757', color: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
            <h2 style={{ color: 'var(--primary)', borderBottom: '2px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', marginBottom: '1.5rem', fontSize: '2rem' }}>🏆 Bases Oficiales — Polla Ferret</h2>

            <div style={{ lineHeight: '1.6', fontSize: '1.05rem', color: 'var(--text-muted)' }}>
              <h3 style={{ color: 'white', marginTop: '1.5rem' }}>1. Objetivo</h3>
              <p>La Polla Ferret es una competencia amistosa de pronósticos deportivos realizada mediante una plataforma web privada y administrada por Don Santiago Felipe Ponce, creada con fines de entretención, interacción y seguimiento del Mundial.</p>
              <p>La participación en la competencia implica la aceptación íntegra del presente reglamento.</p>

              <h3 style={{ color: 'white', marginTop: '1.5rem' }}>2. Participación</h3>
              <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
                <li>La participación requiere un pago único previamente definido por la organización.</li>
                <li>Solo podrán participar personas invitadas o cercanas a algún miembro de FT.</li>
                <li>Los pagos serán aceptados únicamente hasta <strong>2 días antes del inicio oficial del Mundial</strong>.</li>
                <li>Una vez realizado el pago, no existirá devolución en ninguna circunstancia, incluyendo abandono voluntario de la competencia.</li>
              </ul>
              <p>Cada participante podrá utilizar únicamente una cuenta dentro de la plataforma.</p>
              <p>La organización podrá rechazar o eliminar participantes en caso de detectar:</p>
              <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
                <li>Cuentas duplicadas.</li>
                <li>Suplantación.</li>
                <li>Comportamiento indebido.</li>
                <li>O incumplimiento del reglamento.</li>
              </ul>

              <h3 style={{ color: 'white', marginTop: '1.5rem' }}>3. Sistema de Puntuación</h3>
              <p>Todos los puntos son acumulativos.<br/>Esto significa que un participante puede sumar múltiples puntajes dentro de un mismo partido si acierta distintas condiciones del pronóstico.</p>
              <p><em>Ejemplo: Si un usuario acierta el marcador exacto, también obtendrá automáticamente los puntos asociados al resultado del partido y/o cantidad de goles, cuando corresponda.</em></p>
              
              <h4 style={{ color: '#4CAF50', marginTop: '1rem' }}>Fase de Grupos</h4>
              <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
                <li><strong>5 pts</strong> — Acertar el resultado final del partido (victoria local, victoria visitante o empate).</li>
                <li><strong>3 pts</strong> — Acertar el marcador exacto.</li>
                <li><strong>2 pts</strong> — Acertar la Cantidad Total de Goles.</li>
              </ul>

              <h4 style={{ color: '#FF9800', marginTop: '1rem' }}>Fase Eliminatoria (Knockout)</h4>
              <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
                <li><strong>7 pts</strong> — Acertar el Marcador Exacto a los 120' minutos.</li>
                <li><strong>3 pts</strong> — Acertar la Cantidad Total de Goles a los 120' minutos.</li>
                <li><strong>2 pts</strong> — Acertar quién Clasifica a la siguiente ronda.</li>
                <li><strong>2 pts</strong> — Acertar correctamente si el partido llegará a Tanda de Penales.</li>
              </ul>

              <h4 style={{ color: '#00BCD4', marginTop: '1rem' }}>Preguntas Abiertas (Premios)</h4>
              <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
                <li><strong>Campeón (Dinámico):</strong> 30 pts Base. Este puntaje se multiplica según cuánta gente eligió al mismo campeón. Si tú eres la única persona que acertó al campeón de todos los jugadores, te llevarás casi el doble de puntos (~60 pts). Si todos eligen al mismo campeón y gana, cada uno solo sumará 30 pts. (Fórmula: Factor = 1 + (1 - n/N)).</li>
                <li><strong>Goleador del Torneo:</strong> 10 pts.</li>
                <li><strong>Mejor Jugador:</strong> 10 pts.</li>
                <li><strong>Mejor Arquero:</strong> 10 pts.</li>
              </ul>

              <h3 style={{ color: 'white', marginTop: '1.5rem' }}>4. Desempates de la Tabla General</h3>
              <p>En caso de que dos jugadores tengan EXACTAMENTE la misma cantidad total de puntos al final del torneo, el sistema usará las 2 preguntas estadísticas para desempatar, calculando quién estuvo más cerca matemáticamente de la realidad:</p>
              <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
                <li><strong>Primer Desempate:</strong> Quién acertó (o se acercó más) a la <em>Cantidad de Goles Totales del Torneo</em>.</li>
                <li><strong>Segundo Desempate:</strong> Quién acertó (o se acercó más) a la <em>Cantidad de Tarjetas Rojas del Torneo</em>.</li>
              </ul>

              <h3 style={{ color: '#ff4757', marginTop: '1.5rem' }}>5. Tiempos de Cierre y Bloqueo (Locks)</h3>
              <p>Las predicciones están estrictamente controladas por el servidor y no pueden ser modificadas ni un segundo después del cierre:</p>
              <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
                <li><strong>Fase de Grupos:</strong> Cada partido individual se bloquea <strong>exactamente 24 horas antes</strong> de su hora de pitazo inicial.</li>
                <li><strong>Fases Eliminatorias:</strong> Toda la fase completa (ej. Octavos) se bloquea a la <strong>medianoche del día en que inicia</strong> el primer partido de esa ronda.</li>
                <li><strong>Preguntas Abiertas:</strong> Bloqueadas manualmente por el administrador antes de que inicie el primer partido de la fase de grupos.</li>
              </ul>

              <h3 style={{ color: 'gold', marginTop: '1.5rem' }}>6. Premios</h3>
              <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
                <li><strong>Podio:</strong> Los tres primeros puestos de la Clasificación (Top 3) recibirán un premio físico/monetario estipulado al inicio.</li>
                <li><strong>Premio a la Mediocridad:</strong> El jugador que termine EXACTAMENTE en la mitad de la tabla matemática, se llevará un premio consuelo especial por ser el más mediocre de todos.</li>
              </ul>

              <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontStyle: 'italic', fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)' }}>
                La organización podrá realizar ajustes menores de redacción o visualización del reglamento siempre que estos no alteren el sistema de puntuación ni perjudiquen a los participantes.
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default BettingForm;
