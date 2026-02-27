import { loginOrRegisterUser } from './firebaseSync';
import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Home from './pages/Home.jsx';
import HallOfFame from './pages/HallOfFame.jsx';
import AdminPage from './pages/AdminPage.jsx';
import ClassNoticePage from './pages/ClassNoticePage.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import Login from './pages/Login.jsx';
import ChangePassword from './pages/ChangePassword.jsx';
import CrewPage from './components/CrewPage.jsx';
import Records from './pages/Records.jsx';
import BibleReadingPage from './pages/BibleReadingPage.jsx';
import CrewMembers from './pages/CrewMembers.jsx';
import { getDatabase, ref, onValue } from 'firebase/database';
import { db } from './firebase';

export default function BibleCrewApp({ user: initialUser, onLogout }) {
  const [user, setUser] = useState(initialUser);
  const navigate = useNavigate();

  // Sync user data with RTDB for real-time updates (medals, etc.)
  useEffect(() => {
    if (initialUser && initialUser.uid) {
      const db2 = getDatabase();
      const userRef = ref(db2, `users/${initialUser.uid}`);
      const unsub = onValue(userRef, (snap) => {
        const data = snap.val();
        if (data) {
          const updated = {
            ...initialUser,
            name: data.name || initialUser.name,
            crew: data.crew || null,
            isAdmin: !!data.isAdmin,
            medals: data.medals || {},
            earnedMedals: data.earnedMedals || {},
            mustChangePassword: !!data.mustChangePassword
          };
          setUser(updated);
        }
      });
      return () => unsub();
    }
  }, [initialUser]);

  useEffect(() => {
    if (user && user.mustChangePassword && !window.location.hash.includes('change-password')) {
      navigate('/bible-crew/change-password');
    }
  }, [user, navigate]);
  const location = useLocation();
  const isHome = location.pathname === '/bible-crew/home' || location.pathname === '/bible-crew' || location.pathname === '/bible-crew/';

  return (
    <div style={appContainer}>
      {isHome && (
        <div style={header}>
          <button onClick={() => navigate('/select')} style={navBtn}>
            ◀ 앱선택화면
          </button>
          <button onClick={() => onLogout?.()} style={navBtn}>로그아웃</button>
        </div>
      )}

      <Routes>
        <Route path='/' element={<Navigate to='home' replace />} />
        <Route path='/home' element={<Home user={user} />} />
        <Route path='/crew-members' element={<CrewMembers user={user} />} />
        <Route path='/change-password' element={<ChangePassword user={user} />} />
        <Route path='/고급반' element={<CrewPage crewName='고급반' user={user} />} />
        <Route path='/중급반' element={<CrewPage crewName='중급반' user={user} />} />
        <Route path='/초급반구약A' element={<CrewPage crewName='초급반(구약A)' user={user} />} />
        <Route path='/초급반구약B' element={<CrewPage crewName='초급반(구약B)' user={user} />} />
        <Route path='/초급반신약' element={<CrewPage crewName='초급반' user={user} />} />
        <Route path='/초급반' element={<CrewPage crewName='초급반' user={user} />} />
        <Route path='/구약파노라마' element={<CrewPage crewName='구약파노라마' user={user} />} />
        <Route path='/신약파노라마' element={<CrewPage crewName='신약파노라마' user={user} />} />
        <Route path='/명예의전당' element={<HallOfFame />} />
        <Route path='/records' element={<Records user={user} />} />
        <Route path='/성경읽기' element={<BibleReadingPage user={user} />} />
        <Route path='/admin' element={<AdminPage user={user} />} />
        <Route path='/admin/class-notice' element={<ClassNoticePage />} />
        <Route path='*' element={<Navigate to='home' replace />} />
      </Routes>
    </div>
  );
}

const appContainer = {
  minHeight: '100vh',
  background: '#fff'
};

const header = {
  padding: '14px 16px',
  display: 'flex',
  gap: 10,
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: '1px solid #D9E2EC',
  background: '#F2F6FA',
  position: 'sticky',
  top: 0,
  zIndex: 1000
};

const navBtn = {
  padding: '8px 12px',
  borderRadius: '12px',
  border: '1px solid #D9E2EC',
  background: '#FFFFFF',
  color: '#102A43',
  fontWeight: 900,
  fontSize: '14px',
  cursor: 'pointer'
};
