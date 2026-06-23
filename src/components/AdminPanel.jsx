import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, setDoc, writeBatch, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import matchesData from '../data/matches.json';
import { calculateTotalUserStats } from '../utils/scoringLogic';
import { countryNames } from '../data/i18n';

const AdminPanel = () => {
  const [realScores, setRealScores] = useState({});
  const [realAwards, setRealAwards] = useState({});
  const [saveStatus, setSaveStatus] = useState('idle');
  const [calcStatus, setCalcStatus] = useState('idle');
  const [adminView, setAdminView] = useState('group');
  const [adminActiveGroup, setAdminActiveGroup] = useState('A');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailStatus, setEmailStatus] = useState('idle');
  // --- Edit User Bets state ---
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [editingUserPredictions, setEditingUserPredictions] = useState(null);
  const [editBetStatus, setEditBetStatus] = useState('idle'); // idle | loading | saving | saved | error
  const [editGroup, setEditGroup] = useState('A');
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


  useEffect(() => {
    const fetchScores = async () => {
      try {
        const docRef = doc(db, 'system', 'real_results');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setRealScores(data.scores || {});
          setRealAwards(data.awards || {});
        }

        const lockRef = doc(db, 'system', 'global_settings');
        const lockSnap = await getDoc(lockRef);
        if (lockSnap.exists()) {
          setGlobalLocks(lockSnap.data());
        } else {
          await setDoc(lockRef, { 
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
        }
      // Fetch all users for the edit-bets dropdown
      const usersSnap2 = await getDocs(collection(db, 'Users'));
      const usersList = [];
      usersSnap2.forEach(d => usersList.push({ id: d.id, ...d.data() }));
      setAllUsers(usersList);
    } catch (err) {
        console.error("Error fetching real scores:", err);
      }
    };
    fetchScores();
  }, []);

  const handleResultChange = (matchId, field, value) => {
    let finalValue = value;
    if ((field === 'home' || field === 'away') && value !== '') {
      let num = parseInt(value, 10);
      if (isNaN(num) || num < 0) return; // ignore negative
      finalValue = num.toString();
    }
    setRealScores(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [field]: finalValue
      }
    }));
  };

  const handleToggleKnockoutLock = async (phase) => {
    try {
      const currentLocks = globalLocks.knockoutLocks || {};
      const newValue = !currentLocks[phase];
      const newKnockoutLocks = { ...currentLocks, [phase]: newValue };
      
      setGlobalLocks(prev => ({ ...prev, knockoutLocks: newKnockoutLocks }));
      
      await setDoc(doc(db, 'system', 'global_settings'), {
        knockoutLocks: newKnockoutLocks
      }, { merge: true });
    } catch (err) {
      console.error(err);
      alert("Error toggling safety locks.");
    }
  };

  const handleToggleLock = async (field) => {
    try {
      const newValue = !globalLocks[field];
      setGlobalLocks(prev => ({ ...prev, [field]: newValue }));
      await setDoc(doc(db, 'system', 'global_settings'), {
        [field]: newValue
      }, { merge: true });
    } catch (err) {
      console.error(err);
      alert("Error toggling safety locks.");
    }
  };

  const handleSaveScores = async () => {
    setSaveStatus('saving');
    try {
      await setDoc(doc(db, 'system', 'real_results'), { 
        scores: realScores,
        awards: realAwards 
      }, { merge: true });
      setSaveStatus('success');

      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('idle');
    }
  };

  const handleSendTestEmail = async () => {
    if (!emailSubject || !emailBody) return alert("Please fill out subject and body.");
    setEmailStatus('sending');
    try {
      await addDoc(collection(db, 'mail'), {
        to: ['santiago.f.ponce@gmail.com', 'felipeignacio.lr@gmail.com'],
        message: {
          subject: `[TEST] ${emailSubject}`,
          html: emailBody
        }
      });
      setEmailStatus('success');
      setTimeout(() => setEmailStatus('idle'), 3000);
    } catch(err) {
      console.error(err);
      setEmailStatus('error');
    }
  };

  const handleBroadcastEmail = async () => {
    if (!emailSubject || !emailBody) return alert("Please fill out subject and body.");
    if (!window.confirm("🚨 Are you absolutely sure you want to broadcast this email to EVERY registered user?")) return;
    setEmailStatus('sending');
    try {
      const usersSnap = await getDocs(collection(db, 'Users'));
      const emails = [];
      usersSnap.forEach(userDoc => {
        if(userDoc.data().email) emails.push(userDoc.data().email);
      });
      
      await addDoc(collection(db, 'mail'), {
        to: ['santiago.f.ponce@gmail.com', 'felipeignacio.lr@gmail.com'],
        bcc: emails,
        message: {
          subject: emailSubject,
          html: emailBody
        }
      });
      setEmailStatus('success');
      setTimeout(() => setEmailStatus('idle'), 3000);
      setEmailSubject('');
      setEmailBody('');
    } catch(err) {
      console.error(err);
      setEmailStatus('error');
    }
  };

  const handleLoadUserBets = async () => {
    if (!selectedUserId) return;
    setEditBetStatus('loading');
    try {
      const snap = await getDoc(doc(db, 'predictions', selectedUserId));
      if (snap.exists()) {
        setEditingUserPredictions(snap.data().scores || {});
      } else {
        setEditingUserPredictions({});
      }
      setEditBetStatus('idle');
    } catch (err) {
      console.error(err);
      setEditBetStatus('error');
    }
  };

  const handleEditBetChange = (matchId, field, value) => {
    setEditingUserPredictions(prev => ({
      ...prev,
      [matchId]: { ...(prev[matchId] || {}), [field]: value }
    }));
  };

  const handleSaveUserBets = async () => {
    if (!selectedUserId || !editingUserPredictions) return;
    if (!window.confirm('Save these bets on behalf of this user?')) return;
    setEditBetStatus('saving');
    try {
      const docRef = doc(db, 'predictions', selectedUserId);
      const snap = await getDoc(docRef);
      const existing = snap.exists() ? snap.data() : {};
      // Clean empty pairs
      const cleaned = { ...editingUserPredictions };
      Object.keys(cleaned).forEach(k => {
        const h = cleaned[k]?.home;
        const a = cleaned[k]?.away;
        if ((h === '' || h === undefined) && (a === '' || a === undefined)) delete cleaned[k];
      });
      await setDoc(docRef, {
        ...existing,
        scores: cleaned,
        lastUpdated: new Date().toISOString() + ' [ADMIN OVERRIDE]'
      }, { merge: true });
      setEditBetStatus('saved');
      setTimeout(() => setEditBetStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setEditBetStatus('error');
    }
  };

  const handleRecalculateAll = async () => {
    if (!window.confirm("Are you sure? This will overwrite all user scores on the Leaderboard!")) return;
    setCalcStatus('calculating');
    
    try {
      // 1. Get the current Real Results directly from memory (or DB)
      const resultsRef = await getDoc(doc(db, 'system', 'real_results'));
      const dbData = resultsRef.exists() ? resultsRef.data() : {};
      
      const activeRealScores = { ...realScores, ...dbData.scores };
      const activeRealAwards = { ...realAwards, ...dbData.awards };



      // 2. Fetch all explicitly registered Users safely
      const usersSnap = await getDocs(collection(db, 'Users'));
      
      // 3. Fetch all predictions mapped to dictionaries
      const predictionsSnap = await getDocs(collection(db, 'predictions'));
      const allUserPredictions = {};
      
      let N = 0; // Total active users
      let n = 0; // Total users who correctly guessed Champion
      const actualChampion = activeRealAwards.champion?.trim().toLowerCase();

      predictionsSnap.forEach(doc => { 
        N++;
        const pAwards = doc.data().awards || {};
        if (actualChampion && pAwards.champion && pAwards.champion.trim().toLowerCase() === actualChampion) {
          n++;
        }
        allUserPredictions[doc.id] = {
          scores: doc.data().scores || {},
          awards: pAwards
        }
      });

      // Factor calculation logic
      let championFactor = 1;
      if (N > 0) {
        championFactor = 1 + (1 - (n / N));
      }

      // 4. Setup batch wrapper for rapid execution 
      const batch = writeBatch(db);

      usersSnap.forEach(userDoc => {
        const userData = userDoc.data();
        const userPrediction = allUserPredictions[userDoc.id] || { scores: {}, awards: {} };

        // Combine for calculateTotalUserStats which now handles awards
        const fullPredictions = {
          ...userPrediction.scores,
          awards: userPrediction.awards
        };
        const fullRealResults = {
          ...activeRealScores,
          awards: activeRealAwards
        };

        // Calculate stats using the logic file!
        const stats = calculateTotalUserStats(fullPredictions, fullRealResults, matchesData, { championFactor });

        
        // Write stats specifically to the leaderboard collection
        const lbRef = doc(db, 'leaderboard', userDoc.id);
        batch.set(lbRef, {
          id: userDoc.id,
          name: userData.name || userData.displayName || userData.username || userData.email || 'Legacy User',
          avatar: userData.avatar || userData.photoURL || 'https://i.pravatar.cc/150',
          exactMatches: stats.exactMatches,
          correctOutcomes: stats.correctOutcomes,
          totalPoints: stats.totalPoints,
          goalsDiff: stats.goalsDiff || 0,
          redCardsDiff: stats.redCardsDiff || 0,
          awardsFinalized: !!(activeRealAwards.champion || activeRealAwards.topScorer || activeRealAwards.totalGoals || activeRealAwards.redCards),
          userAwards: userPrediction.awards || {},
          correctAwards: {
            champion: userPrediction.awards?.champion?.trim().toLowerCase() === activeRealAwards.champion?.trim().toLowerCase(),
            topScorer: userPrediction.awards?.topScorer?.trim().toLowerCase() === activeRealAwards.topScorer?.trim().toLowerCase(),
            bestPlayer: userPrediction.awards?.bestPlayer?.trim().toLowerCase() === activeRealAwards.bestPlayer?.trim().toLowerCase(),
            bestGoalkeeper: userPrediction.awards?.bestGoalkeeper?.trim().toLowerCase() === activeRealAwards.bestGoalkeeper?.trim().toLowerCase()
          },
          lastCalculated: new Date().toISOString()
        }, { merge: true });



      });

      // Commit all leaderboard updates identically
      await batch.commit();

      setCalcStatus('success');
      setTimeout(() => setCalcStatus('idle'), 3000);
    } catch (err) {
      console.error("Calculation fatal error:", err);
      setCalcStatus('idle');
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2.5rem', color: '#ff4757', fontFamily: '"Climate Crisis", sans-serif' }}>ADMINISTRATIVE OVERRIDE</h2>
        <p style={{ color: 'var(--text-muted)' }}>Input the undeniable real-world match outcomes here.</p>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          
          <button 
            onClick={() => handleToggleLock('awardsLocked')}
            style={{ padding: '0.8rem 1.5rem', background: '#333', color: globalLocks.awardsLocked ? '#ff4757' : '#4CAF50', borderRadius: '8px', fontWeight: 'bold', border: `2px solid ${globalLocks.awardsLocked ? '#ff4757' : '#4CAF50'}`, cursor: 'pointer' }}
          >
            {globalLocks.awardsLocked ? '🔒 OPEN Qs LOCKED' : '🔓 OPEN Qs OPEN (TEST)'}
          </button>

          <button 
            onClick={handleSaveScores} 
            disabled={saveStatus !== 'idle'}
            style={{ padding: '1rem 2rem', background: 'var(--primary)', color: 'black', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
          >
            {saveStatus === 'idle' ? 'Save Real Scores' : saveStatus === 'saving' ? 'Saving...' : 'Saved!'}
          </button>
          
          <button 
            onClick={handleRecalculateAll} 
            disabled={calcStatus !== 'idle'}
            style={{ padding: '1rem 2rem', background: '#ff4757', color: 'white', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
          >
            {calcStatus === 'idle' ? '🚨 RECALCULATE LEADERBOARD 🚨' : calcStatus === 'calculating' ? 'Processing Engine...' : 'Wired to Leaderboard!'}
          </button>
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
        <h3 style={{ color: 'var(--primary)', marginBottom: '1rem', textAlign: 'center' }}>Email Broadcast (Admin Only)</h3>
        <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Send a message to all Polla participants. They will be BCC'd automatically.</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '600px', margin: '0 auto' }}>
          <input 
            type="text" 
            placeholder="Email Subject"
            style={{ padding: '0.8rem', background: 'rgba(0,0,0,0.3)', border: 'none', color: 'white', borderRadius: '8px' }}
            value={emailSubject}
            onChange={e => setEmailSubject(e.target.value)}
          />
          <textarea 
            placeholder="Email Body (You can use HTML tags here like <b>bold</b> or <br> for new lines)"
            rows={5}
            style={{ padding: '0.8rem', background: 'rgba(0,0,0,0.3)', border: 'none', color: 'white', borderRadius: '8px', resize: 'vertical' }}
            value={emailBody}
            onChange={e => setEmailBody(e.target.value)}
          />
          
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button 
              onClick={handleSendTestEmail} 
              disabled={emailStatus === 'sending'}
              style={{ padding: '0.8rem 1.5rem', background: '#333', color: 'white', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', flex: 1 }}
            >
              {emailStatus === 'sending' ? 'Sending...' : 'Send Test (To Me)'}
            </button>
            <button 
              onClick={handleBroadcastEmail} 
              disabled={emailStatus === 'sending'}
              style={{ padding: '0.8rem 1.5rem', background: 'var(--primary)', color: 'black', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', flex: 1 }}
            >
              {emailStatus === 'sending' ? 'Sending...' : emailStatus === 'success' ? 'Sent!' : 'Broadcast to All Users'}
            </button>
          </div>
          {emailStatus === 'error' && <p style={{ color: '#ff4757', textAlign: 'center', margin: 0 }}>Error sending email. Check console.</p>}
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
        <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Resultados de Torneo (Premios Finales)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.7 }}>Campeón</label>
            <select 
              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', color: 'white', border: 'none', padding: '0.5rem', borderRadius: '4px' }}
              value={realAwards.champion || ''}
              onChange={(e) => setRealAwards({...realAwards, champion: e.target.value})}
            >
              <option value="">Selecciona...</option>
              {['Algeria','Argentina','Australia','Austria','Belgium','Bosnia and Herzegovina','Brazil','Canada','Cape Verde','Colombia','Congo DR','Croatia','Curaçao','Czechia','Ecuador','Egypt','England','France','Germany','Ghana','Haiti','Iran','Iraq','Ivory Coast','Japan','Jordan','Mexico','Morocco','Netherlands','New Zealand','Norway','Panama','Paraguay','Portugal','Qatar','Saudi Arabia','Scotland','Senegal','South Africa','South Korea','Spain','Sweden','Switzerland','Tunisia','Türkiye','USA','Uruguay','Uzbekistan'].map(c => (
                <option key={c} value={c} style={{color: 'black'}}>{countryNames[c] || c}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.7 }}>Goleador</label>
            <input 
              type="text" 
              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', color: 'white', border: 'none', padding: '0.5rem', borderRadius: '4px' }}
              value={realAwards.topScorer || ''}
              onChange={(e) => setRealAwards({...realAwards, topScorer: e.target.value})}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.7 }}>Mejor Jugador</label>
            <input 
              type="text" 
              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', color: 'white', border: 'none', padding: '0.5rem', borderRadius: '4px' }}
              value={realAwards.bestPlayer || ''}
              onChange={(e) => setRealAwards({...realAwards, bestPlayer: e.target.value})}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.7 }}>Mejor Arquero</label>
            <input 
              type="text" 
              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', color: 'white', border: 'none', padding: '0.5rem', borderRadius: '4px' }}
              value={realAwards.bestGoalkeeper || ''}
              onChange={(e) => setRealAwards({...realAwards, bestGoalkeeper: e.target.value})}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.7 }}>Total Goles (Stats)</label>
            <input 
              type="number" 
              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', color: 'white', border: 'none', padding: '0.5rem', borderRadius: '4px' }}
              value={realAwards.totalGoals || ''}
              onKeyDown={(e) => { if(['e', 'E', '.', ',', '+', '-'].includes(e.key)) e.preventDefault(); }}
              onChange={(e) => { 
                let val = e.target.value;
                if (val !== '' && parseInt(val, 10) < 0) return;
                setRealAwards({...realAwards, totalGoals: val});
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.7 }}>Total Rojas (Stats)</label>
            <input 
              type="number" 
              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', color: 'white', border: 'none', padding: '0.5rem', borderRadius: '4px' }}
              value={realAwards.redCards || ''}
              onKeyDown={(e) => { if(['e', 'E', '.', ',', '+', '-'].includes(e.key)) e.preventDefault(); }}
              onChange={(e) => { 
                let val = e.target.value;
                if (val !== '' && parseInt(val, 10) < 0) return;
                setRealAwards({...realAwards, redCards: val});
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={() => setAdminView('group')} style={{ padding: '0.8rem 2rem', fontWeight: 'bold', background: adminView === 'group' ? 'var(--primary)' : '#333', color: adminView === 'group' ? 'black' : 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Group Matches</button>
        <button onClick={() => setAdminView('knockout')} style={{ padding: '0.8rem 2rem', fontWeight: 'bold', background: adminView === 'knockout' ? 'var(--primary)' : '#333', color: adminView === 'knockout' ? 'black' : 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Knockout Matches</button>
        <button onClick={() => setAdminView('editBets')} style={{ padding: '0.8rem 2rem', fontWeight: 'bold', background: adminView === 'editBets' ? 'var(--primary)' : '#333', color: adminView === 'editBets' ? 'black' : 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Player Bets Override</button>
      </div>

      {adminView === 'group' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginBottom: '2rem', padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '12px' }}>
          {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map(g => (
            <button 
              key={g} 
              onClick={() => setAdminActiveGroup(g)}
              style={{ padding: '0.5rem 1rem', background: adminActiveGroup === g ? '#ff4757' : '#222', color: 'white', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
            >
              Group {g}
            </button>
          ))}
        </div>
      )}

      {adminView === 'knockout' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', justifyContent: 'center', marginBottom: '2rem', padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '12px' }}>
          {['Round of 32', 'Round of 16', 'Quarter-finals', 'Semi-finals', 'Third Place', 'Final'].map(phase => {
            const isLocked = globalLocks.knockoutLocks && globalLocks.knockoutLocks[phase];
            return (
              <button 
                key={phase}
                onClick={() => handleToggleKnockoutLock(phase)}
                style={{ cursor: 'pointer', fontWeight: 'bold', padding: '0.5rem 1rem', background: '#222', color: isLocked ? '#ff4757' : '#4CAF50', border: `2px solid ${isLocked ? '#ff4757' : '#4CAF50'}`, borderRadius: '6px', fontSize: '0.9rem' }}
              >
                {isLocked ? '🔒 ' : '🔓 '}{phase}
              </button>
            );
          })}
        </div>
      )}

      {(adminView === 'group' || adminView === 'knockout') && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {matchesData.filter(m => {
            if (adminView === 'group') return m.stage === 'group' && m.group === adminActiveGroup;
            return m.stage !== 'group';
          }).map(match => (
            <div key={match.id} style={{ background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>Match {match.id} | {match.stage === 'group' ? `Group ${match.group}` : match.stage}</div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', width: '80px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{match.home}</span>
                <input 
                  type="number" min="0" 
                  style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '8px', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}
                  value={realScores[match.id]?.home ?? ''}
                  onKeyDown={(e) => { if(['e', 'E', '.', ',', '+', '-'].includes(e.key)) e.preventDefault(); }}
                  onChange={(e) => handleResultChange(match.id, 'home', e.target.value)}
                />
                <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>VS</span>
                <input 
                  type="number" min="0" 
                  style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '8px', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}
                  value={realScores[match.id]?.away ?? ''}
                  onKeyDown={(e) => { if(['e', 'E', '.', ',', '+', '-'].includes(e.key)) e.preventDefault(); }}
                  onChange={(e) => handleResultChange(match.id, 'away', e.target.value)}
                />
                <span style={{ fontWeight: 'bold', width: '80px', textAlign: 'right', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{match.away}</span>
              </div>

              {match.stage !== 'group' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                  <label style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <input 
                      type="checkbox" 
                      checked={!!realScores[match.id]?.penalties}
                      onChange={(e) => handleResultChange(match.id, 'penalties', e.target.checked)}
                    />
                    Shootout?
                  </label>
                  
                  {realScores[match.id]?.home === realScores[match.id]?.away && realScores[match.id]?.home !== '' && (
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button 
                        onClick={() => handleResultChange(match.id, 'qualifier', 'home')}
                        style={{ fontSize: '0.6rem', padding: '0.2rem 0.4rem', background: realScores[match.id]?.qualifier === 'home' ? '#ff4757' : 'transparent', border: '1px solid #ff4757', color: 'white', borderRadius: '4px' }}
                      >
                        {match.home.substring(0, 3).toUpperCase()} Qual
                      </button>
                      <button 
                        onClick={() => handleResultChange(match.id, 'qualifier', 'away')}
                        style={{ fontSize: '0.6rem', padding: '0.2rem 0.4rem', background: realScores[match.id]?.qualifier === 'away' ? '#ff4757' : 'transparent', border: '1px solid #ff4757', color: 'white', borderRadius: '4px' }}
                      >
                        {match.away.substring(0, 3).toUpperCase()} Qual
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {adminView === 'editBets' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ color: 'var(--primary)', margin: 0 }}>Select Player to Modify</h3>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <select 
                value={selectedUserId} 
                onChange={(e) => {
                  setSelectedUserId(e.target.value);
                  setEditingUserPredictions(null);
                }}
                style={{ flex: 1, minWidth: '200px', padding: '0.8rem', background: 'rgba(0,0,0,0.3)', color: 'white', border: 'none', borderRadius: '8px' }}
              >
                <option value="">Select a player...</option>
                {allUsers.map(u => (
                  <option key={u.id} value={u.id} style={{ color: 'black' }}>
                    {u.name || u.displayName || u.username || u.email || u.id}
                  </option>
                ))}
              </select>
              <button 
                onClick={handleLoadUserBets}
                disabled={!selectedUserId || editBetStatus === 'loading'}
                style={{ padding: '0.8rem 1.5rem', background: 'var(--primary)', color: 'black', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
              >
                {editBetStatus === 'loading' ? 'Loading...' : 'Load Player Bets'}
              </button>
            </div>
          </div>

          {editingUserPredictions && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '1rem 1.5rem', borderRadius: '12px' }}>
                <h4 style={{ margin: 0, color: 'white' }}>
                  Modifying Bets for: <span style={{ color: 'var(--primary)' }}>{allUsers.find(u => u.id === selectedUserId)?.name || selectedUserId}</span>
                </h4>
                <button
                  onClick={handleSaveUserBets}
                  disabled={editBetStatus === 'saving'}
                  style={{ padding: '0.8rem 2rem', background: '#ff4757', color: 'white', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                >
                  {editBetStatus === 'saving' ? 'Saving Override...' : editBetStatus === 'saved' ? 'Saved Successfully!' : 'Save Override Changes'}
                </button>
              </div>

              {/* Group selection for editing user bets */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '12px' }}>
                {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'Knockout'].map(g => (
                  <button 
                    key={g} 
                    onClick={() => setEditGroup(g)}
                    style={{ padding: '0.5rem 1rem', background: editGroup === g ? '#ff4757' : '#222', color: 'white', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                  >
                    {g === 'Knockout' ? 'Knockouts' : `Group ${g}`}
                  </button>
                ))}
              </div>

              {/* List matches for selected group to edit player predictions */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                {matchesData.filter(m => {
                  if (editGroup === 'Knockout') return m.stage !== 'group';
                  return m.stage === 'group' && m.group === editGroup;
                }).map(match => {
                  const pred = editingUserPredictions[match.id] || { home: '', away: '', penalties: false, qualifier: '' };
                  return (
                    <div key={match.id} style={{ background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                        Match {match.id} | {match.stage === 'group' ? `Group ${match.group}` : match.stage}
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold', width: '80px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{match.home}</span>
                        <input 
                          type="number" min="0" 
                          placeholder="?"
                          style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '8px', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}
                          value={pred.home ?? ''}
                          onKeyDown={(e) => { if(['e', 'E', '.', ',', '+', '-'].includes(e.key)) e.preventDefault(); }}
                          onChange={(e) => handleEditBetChange(match.id, 'home', e.target.value)}
                        />
                        <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>VS</span>
                        <input 
                          type="number" min="0" 
                          placeholder="?"
                          style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '8px', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}
                          value={pred.away ?? ''}
                          onKeyDown={(e) => { if(['e', 'E', '.', ',', '+', '-'].includes(e.key)) e.preventDefault(); }}
                          onChange={(e) => handleEditBetChange(match.id, 'away', e.target.value)}
                        />
                        <span style={{ fontWeight: 'bold', width: '80px', textAlign: 'right', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{match.away}</span>
                      </div>

                      {match.stage !== 'group' && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                          <label style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <input 
                              type="checkbox" 
                              checked={!!pred.penalties}
                              onChange={(e) => handleEditBetChange(match.id, 'penalties', e.target.checked)}
                            />
                            Shootout?
                          </label>
                          
                          {pred.home === pred.away && pred.home !== '' && (
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button 
                                onClick={() => handleEditBetChange(match.id, 'qualifier', 'home')}
                                style={{ fontSize: '0.6rem', padding: '0.2rem 0.4rem', background: pred.qualifier === 'home' ? '#ff4757' : 'transparent', border: '1px solid #ff4757', color: 'white', borderRadius: '4px' }}
                              >
                                {match.home.substring(0, 3).toUpperCase()} Qual
                              </button>
                              <button 
                                onClick={() => handleEditBetChange(match.id, 'qualifier', 'away')}
                                style={{ fontSize: '0.6rem', padding: '0.2rem 0.4rem', background: pred.qualifier === 'away' ? '#ff4757' : 'transparent', border: '1px solid #ff4757', color: 'white', borderRadius: '4px' }}
                              >
                                {match.away.substring(0, 3).toUpperCase()} Qual
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
