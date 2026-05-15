import React, { useState } from 'react';
import { Trophy, Medal, Target, ChevronUp, ChevronDown, Minus, Star, Award, Shield, LayoutGrid, LayoutList } from 'lucide-react';

const Leaderboard = ({ users, t }) => {
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const [lastRefreshed, setLastRefreshed] = useState('Never');

  React.useEffect(() => {
    if (!users || users.length === 0) return;
    
    const calcUser = users.find(u => u.lastCalculated);
    if (!calcUser) {
      setLastRefreshed('Never');
      return;
    }

    const calcDate = new Date(calcUser.lastCalculated);
    const now = new Date();
    const diffMins = Math.floor((now - calcDate) / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    let timeAgo = 'Just now';
    if (diffDays > 0) {
      timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMins > 0) {
      timeAgo = `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    }
    
    setLastRefreshed(timeAgo);
  }, [users]);

  const colorCycle = [
    'var(--fwc-red)',
    'var(--fwc-blue)',
    'var(--fwc-green)',
    'var(--fwc-purple)',
    'var(--fwc-orange)',
    'var(--fwc-cyan)',
    'var(--fwc-pink)'
  ];

  return (
    <div className="glass-panel leaderboard-wrapper" style={{ backgroundColor: 'rgba(11, 11, 18, 0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Updated: <span style={{ color: 'white', fontWeight: 'bold' }}>{lastRefreshed}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button 
          onClick={() => setViewMode('list')}
          style={{ padding: '0.5rem', background: viewMode === 'list' ? 'var(--primary)' : 'rgba(255,255,255,0.1)', color: viewMode === 'list' ? 'black' : 'white', borderRadius: '8px', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <LayoutList size={18} />
        </button>
        <button 
          onClick={() => setViewMode('grid')}
          style={{ padding: '0.5rem', background: viewMode === 'grid' ? 'var(--primary)' : 'rgba(255,255,255,0.1)', color: viewMode === 'grid' ? 'black' : 'white', borderRadius: '8px', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <LayoutGrid size={18} />
        </button>
        </div>
      </div>

      {viewMode === 'list' && (
        <div className="leaderboard-header">
          <div className="rank-col">{t ? t('rank') : 'Rank'}</div>
          <div className="player-col">{t ? t('player') : 'Player'}</div>
          <div className="points-col">{t ? t('pts') : 'Pts'}</div>
        </div>
      )}
      
      {viewMode === 'list' ? (
        <div className="players-list">
          {users.map((user, index) => {
          const position = index + 1;
          const rankDelta = user.previousRank - position;
          const isTop3 = position <= 3;
          let posClass = "";
          let Icon = null;
          
          if (position === 1) {
            posClass = "pos-1";
            Icon = Trophy;
          } else if (position === 2) {
            posClass = "pos-2";
            Icon = Medal;
          } else if (position === 3) {
            posClass = "pos-3";
            Icon = Medal;
          }

          let RankChangeIcon = Minus;
          let rankColor = 'var(--text-muted)';
          if (rankDelta > 0) {
            RankChangeIcon = ChevronUp;
            rankColor = 'var(--primary)';
          } else if (rankDelta < 0) {
            RankChangeIcon = ChevronDown;
            rankColor = '#ff4757';
          }

          const rowColor = colorCycle[index % colorCycle.length];
          return (
            <div 
              key={user.id} 
              className={`player-row ${isTop3 ? 'top-3-row' : ''}`}
              style={{ 
                animationDelay: `${0.1 * index}s`, 
                animationFillMode: 'both',
                borderColor: `color-mix(in srgb, ${rowColor} 30%, transparent)`
              }}
            >
              {/* Blur Cinematic Background */}
              <div className="row-blur-bg" style={{ backgroundImage: `url(${user.avatar})` }}></div>
              <div className="row-glass-overlay"></div>

              <div className={`position-col ${posClass}`} style={{ flexDirection: 'column', gap: '0.2rem', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', height: '32px' }}>
                  {isTop3 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} className="badge animate-pulse">
                      <Icon size={18} color="black" fill="currentColor" />
                    </div>
                  ) : (
                    <span style={{ fontSize: '1.25rem' }}>{position}</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem', color: rankColor, fontWeight: 800 }}>
                  <RankChangeIcon size={14} strokeWidth={4} />
                  {rankDelta !== 0 && <span>{Math.abs(rankDelta)}</span>}
                </div>
              </div>
              
              <div className="info-col">
                <img src={user.avatar} alt={user.name} className="avatar" />
                <div>
                  <div className="player-name">{user.name}</div>
                  <div className="player-stats">
                    <span className="stats-item" title={t ? t('exactMatches') : 'Exact Matches'}>
                      <strong style={{color: 'var(--primary)', fontSize: '1.1em'}}>{user.exactMatches}</strong> <span style={{marginLeft: '4px'}}>{t ? t('exactMatches') : 'Exact Matches'}</span>
                    </span>
                    {user.awardsFinalized && (
                      <span className="stats-item" style={{opacity: 0.6, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem'}}>
                        <span style={{margin: '0 4px'}}>•</span>
                        <Target size={12} />
                        <span style={{fontSize: '0.7rem'}}>G: {user.goalsDiff || 0} | R: {user.redCardsDiff || 0}</span>
                      </span>
                    )}
                  </div>

                  {/* Show Awards Always, just style uniquely if finalized */}
                  {user.userAwards && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                      {user.userAwards.champion && (
                        <div style={{ display: 'flex', alignItems: 'center', opacity: user.awardsFinalized ? 1 : 0.6, gap: '0.2rem', fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: user.correctAwards?.champion ? 'rgba(0,255,100,0.2)' : 'rgba(255,255,255,0.05)', color: user.correctAwards?.champion ? '#00ff64' : 'var(--text-muted)', border: `1px solid ${user.correctAwards?.champion ? '#00ff64' : 'transparent'}`, boxShadow: user.correctAwards?.champion ? '0 0 10px rgba(0,255,100,0.3)' : 'none', fontWeight: user.correctAwards?.champion ? '800' : 'normal' }}>
                          <Trophy size={10} /> {user.userAwards.champion}
                        </div>
                      )}

                      {user.userAwards.topScorer && (
                        <div style={{ display: 'flex', alignItems: 'center', opacity: user.awardsFinalized ? 1 : 0.6, gap: '0.2rem', fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: user.correctAwards?.topScorer ? 'rgba(0,255,100,0.2)' : 'rgba(255,255,255,0.05)', color: user.correctAwards?.topScorer ? '#00ff64' : 'var(--text-muted)', border: `1px solid ${user.correctAwards?.topScorer ? '#00ff64' : 'transparent'}`, boxShadow: user.correctAwards?.topScorer ? '0 0 10px rgba(0,255,100,0.3)' : 'none', fontWeight: user.correctAwards?.topScorer ? '800' : 'normal' }}>
                          <Award size={10} /> {user.userAwards.topScorer}
                        </div>
                      )}

                      {user.userAwards.bestPlayer && (
                        <div style={{ display: 'flex', alignItems: 'center', opacity: user.awardsFinalized ? 1 : 0.6, gap: '0.2rem', fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: user.correctAwards?.bestPlayer ? 'rgba(0,255,100,0.2)' : 'rgba(255,255,255,0.05)', color: user.correctAwards?.bestPlayer ? '#00ff64' : 'var(--text-muted)', border: `1px solid ${user.correctAwards?.bestPlayer ? '#00ff64' : 'transparent'}`, boxShadow: user.correctAwards?.bestPlayer ? '0 0 10px rgba(0,255,100,0.3)' : 'none', fontWeight: user.correctAwards?.bestPlayer ? '800' : 'normal' }}>
                          <Star size={10} /> {user.userAwards.bestPlayer}
                        </div>
                      )}

                      {user.userAwards.bestGoalkeeper && (
                        <div style={{ display: 'flex', alignItems: 'center', opacity: user.awardsFinalized ? 1 : 0.6, gap: '0.2rem', fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: user.correctAwards?.bestGoalkeeper ? 'rgba(0,255,100,0.2)' : 'rgba(255,255,255,0.05)', color: user.correctAwards?.bestGoalkeeper ? '#00ff64' : 'var(--text-muted)', border: `1px solid ${user.correctAwards?.bestGoalkeeper ? '#00ff64' : 'transparent'}`, boxShadow: user.correctAwards?.bestGoalkeeper ? '0 0 10px rgba(0,255,100,0.3)' : 'none', fontWeight: user.correctAwards?.bestGoalkeeper ? '800' : 'normal' }}>
                          <Shield size={10} /> {user.userAwards.bestGoalkeeper}
                        </div>
                      )}

                    </div>
                  )}



                </div>
              </div>
              
              <div className="points-col">
                <span>{user.totalPoints}</span>
                <span className="points-label">pts</span>
              </div>
            </div>
          );
        })}
        </div>
      ) : (
        <div className="players-grid">
          {users.map((user, index) => {
            const position = index + 1;
            const isTop3 = position <= 3;
            const rowColor = colorCycle[index % colorCycle.length];

            return (
              <div key={user.id} className={`player-card ${isTop3 ? 'top-3-card' : ''}`} style={{ borderBottom: `4px solid ${rowColor}`}}>
                <div className="card-image-wrapper">
                  <img src={user.avatar} alt={user.name} className="card-avatar" />
                  <div className="card-rank" style={{ background: isTop3 ? rowColor : 'rgba(0,0,0,0.8)', color: isTop3 ? 'black' : 'white' }}>
                    {position}
                  </div>
                </div>
                
                <div className="card-info">
                  <div className="card-name">{user.name}</div>
                  <div className="card-points">{user.totalPoints} pts</div>
                  
                  <div className="card-stats">
                    <span style={{ color: 'var(--primary)' }}>{user.exactMatches}</span> Exact
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
