import React, { useState, useEffect } from 'react';
import './App.css';
import Leaderboard from './components/Leaderboard';
import BettingForm from './components/BettingForm';
import Auth from './components/Auth';
import AdminPanel from './components/AdminPanel';
import { translations } from './data/i18n';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

function App() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('leaderboard');
  const [currentUser, setCurrentUser] = useState(null);
  const [language, setLanguage] = useState('es');

  const t = (key) => translations[key]?.[language] || key;

  useEffect(() => {
    // Background Session Persistence Core
    const unregisterAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, 'Users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setCurrentUser(userDoc.data());
        }
      } else {
        setCurrentUser(null);
      }
    });

    // Subscribe linearly to the Firestore Leaderboard
    const unsubscribe = onSnapshot(collection(db, 'leaderboard'), (snapshot) => {
      const liveUsers = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      // Sort by points, then by tie-breakers (smaller diff is better)
      liveUsers.sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        if (a.goalsDiff !== b.goalsDiff) return a.goalsDiff - b.goalsDiff;
        return a.redCardsDiff - b.redCardsDiff;
      });

      
      // Calculate delta 'previousRank' simply via array position since they are tracked globally
      const rankedUsers = liveUsers.map((u, i) => ({ ...u, previousRank: (i + 1) }));
      
      setUsers(rankedUsers);
      setLoading(false);
    });

    return () => {
      unsubscribe();
      unregisterAuth();
    };
  }, []);

  useEffect(() => {
    document.body.className = activeTab === 'leaderboard' ? 'theme-amplify' : 'theme-unify';
  }, [activeTab]);

  return (
    <div className="app-container">
      <nav className="top-nav animate-slide-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <img src="/logo.png" alt="FIFA 26 Emblem" style={{ height: '70px' }} />
          <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'rgba(255,255,255,0.9)', fontFamily: '"Noto Sans", sans-serif', lineHeight: 1 }}>
            FIFA<br />WORLD CUP<br />26™
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{ padding: '0.3rem', borderRadius: '4px', backgroundColor: 'var(--card-bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
          >
            <option value="es">🇪🇸 ES</option>
            <option value="en">🇬🇧 EN</option>
            <option value="ja">🇯🇵 JA</option>
          </select>

          {currentUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{currentUser.name}</span>
              <img src={currentUser.avatar} alt="Profile" style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid var(--primary)' }} />
            </div>
          )}
        </div>
      </nav>

      <header className="header animate-slide-up">
        <h1 style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', margin: '0 0 2rem 0' }}>
          <span style={{ fontFamily: '"Vend Sans", sans-serif', fontWeight: 700 }}>Polla</span>
          <span className="text-gradient" style={{ fontFamily: '"Climate Crisis", sans-serif' }}>Ferret</span>
        </h1>
        
        <div className="tabs">
          <button 
            className={`tab-button ${activeTab === 'leaderboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('leaderboard')}
          >
            {t('leaderboardTab')}
          </button>
          <button 
            className={`tab-button ${activeTab === 'predictions' ? 'active' : ''}`}
            onClick={() => setActiveTab('predictions')}
          >
            {t('predictionsTab')}
          </button>
          
          {['santiago.f.ponce@gmail.com', 'felipeignacio.lr@gmail.com'].includes(currentUser?.email) && (
            <button 
              className={`tab-button ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
              style={{ color: '#ff4757', borderColor: '#ff4757', textShadow: '0 0 10px rgba(255,71,87,0.5)' }}
            >
              ADMIN
            </button>
          )}
        </div>
      </header>
      
      <main className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
        {loading ? (
          <div style={{ textAlign: 'center', marginTop: '3rem', color: 'var(--text-muted)' }}>
            {t('loading')}
          </div>
        ) : (
          <>
            {activeTab === 'leaderboard' && <Leaderboard users={users} t={t} />}
            {activeTab === 'predictions' && (
              currentUser ? <BettingForm currentUser={currentUser} t={t} /> : <Auth onLoginSuccess={setCurrentUser} />
            )}
            {activeTab === 'admin' && ['santiago.f.ponce@gmail.com', 'felipeignacio.lr@gmail.com'].includes(currentUser?.email) && (
              <AdminPanel />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
