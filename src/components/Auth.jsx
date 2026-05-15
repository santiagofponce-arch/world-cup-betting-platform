import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import './Auth.css';

const Auth = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [profileStep, setProfileStep] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [error, setError] = useState(null);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user already has a profile in our DB
      const userDocRef = doc(db, 'Users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // Needs profile setup
        setDisplayName(user.displayName || '');
        setAvatarUrl(user.photoURL || 'https://i.pravatar.cc/150');
        setProfileStep(true);
        setLoading(false);
      } else {
        // Exists, tell App we are logged in
        onLoginSuccess(userDoc.data());
      }
    } catch (err) {
      console.error(err);
      setError("Failed to sign in. Make sure Google Auth is enabled in Firebase Console.");
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      if (!displayName.trim()) return;
      setLoading(true);
      
      const user = auth.currentUser;
      const profileData = {
        id: user.uid,
        name: displayName,
        avatar: avatarUrl,
        email: user.email,
        exactMatches: 0,
        outcomes: 0,
        sideBets: 0,
        totalPoints: 0,
        previousRank: 99,
        createdAt: new Date().toISOString()
      };
      
      await setDoc(doc(db, 'Users', user.uid), profileData);
      
      // Core Privacy Fix: Generate a public Leaderboard alias to prevent leaking the Users DB email securely.
      await setDoc(doc(db, 'leaderboard', user.uid), {
        id: user.uid,
        name: displayName,
        avatar: avatarUrl,
        exactMatches: 0,
        correctOutcomes: 0,
        totalPoints: 0,
        lastCalculated: new Date().toISOString()
      }, { merge: true });

      onLoginSuccess(profileData);
    } catch (err) {
      console.error(err);
      setError("Failed to save profile. Make sure Firestore rules allow writes.");
      setLoading(false);
    }
  };

  return (
    <div className="auth-container animate-slide-up">
      <div className="glass-panel auth-card">
        {!profileStep ? (
          <>
            <h2>Join the Polla!</h2>
            <p className="auth-subtitle">Sign in to save your 2026 World Cup predictions.</p>
            {error && <div className="error-box">{error}</div>}
            
            <button 
              className="google-btn" 
              onClick={handleGoogleLogin} 
              disabled={loading}
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" />
              {loading ? "Connecting..." : "Sign in with Google"}
            </button>
          </>
        ) : (
          <>
            <h2>Complete Profile</h2>
            <p className="auth-subtitle">Choose how you want to appear on the leaderboard!</p>
            {error && <div className="error-box">{error}</div>}
            
            <div className="profile-form">
              <div className="avatar-preview">
                <img src={avatarUrl} alt="avatar" />
              </div>
              
              <div className="input-group">
                <label>Display Name</label>
                <input 
                  type="text" 
                  value={displayName} 
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="El Tigre"
                  maxLength={20}
                />
              </div>
              
              <div className="input-group">
                <label>Avatar URL (Optional)</label>
                <input 
                  type="text" 
                  value={avatarUrl} 
                  onChange={e => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              
              <button 
                className="save-btn profile-save disabled:opacity-50" 
                onClick={handleSaveProfile}
                disabled={loading || !displayName.trim()}
              >
                {loading ? "Saving..." : "Let's Go!"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Auth;
