import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';

const ShepherdList = lazy(() => import('./pages/ShepherdList.jsx'));
const ShepherdWrite = lazy(() => import('./pages/ShepherdWrite.jsx'));
const ShepherdAdmin = lazy(() => import('./pages/ShepherdAdmin.jsx'));
const ShepherdPersonal = lazy(() => import('./pages/ShepherdPersonal.jsx'));

export default function ShepherdApp({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  if (!user || !user.uid) return <Navigate to="/login" replace />;

  return (
    <div style={page}>
      <div style={header}>
        <button onClick={() => navigate('/select')} style={navBtn}>
          ◀ 앱선택화면
        </button>
        <button onClick={() => onLogout?.()} style={navBtn}>로그아웃</button>
      </div>

      <Suspense fallback={<div style={{ padding: 20, textAlign: 'center', color: '#102A43', fontWeight: 600 }}>화면을 불러오는 중입니다...</div>}>
        <Routes>
          <Route path='/' element={<Navigate to='list' replace />} />
          <Route path='/list' element={<ShepherdList user={user} />} />
          <Route path='/write' element={<ShepherdWrite user={user} />} />
          <Route path='/personal' element={<ShepherdPersonal user={user} />} />
          <Route path='/admin/*' element={<ShepherdAdmin user={user} />} />
          <Route path='*' element={<Navigate to='list' replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}

const page = { minHeight: '100vh', background: 'linear-gradient(180deg, #F6F8FB 0%, #EEF2F6 100%)' };

const header = {
  padding: '14px 16px',
  display: 'flex',
  gap: 10,
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: '1px solid #D9E2EC',
  background: '#F2F6FA'
};

const navBtn = {
  padding: '8px 10px',
  borderRadius: 10,
  border: '1px solid #D9E2EC',
  background: '#FFFFFF',
  color: '#102A43',
  fontWeight: 900,
  cursor: 'pointer'
};
