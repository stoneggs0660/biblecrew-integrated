import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AppSelect from './pages/AppSelect';
const ShepherdApp = React.lazy(() => import('./apps/ranch-report/ShepherdApp'));
const BibleCrewApp = React.lazy(() => import('./apps/bible-crew/BibleCrewApp'));

export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check local storage for user
        const saved = localStorage.getItem('biblecrew_user');
        if (saved) {
            try {
                setUser(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse user from local storage", e);
            }
        }
        setLoading(false);
    }, []);

    const handleLogin = (userData) => {
        setUser(userData);
        localStorage.setItem('biblecrew_user', JSON.stringify(userData));
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('biblecrew_user');
    };

    if (loading) return <div>Loading...</div>;

    return (
        <HashRouter>
            <React.Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#0071E3', fontWeight: 600 }}>앱을 불러오는 중입니다...</div>}>
                <Routes>
                    <Route path="/" element={<Navigate to={user ? "/select" : "/login"} replace />} />
                    <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/select" replace />} />
                    <Route path="/select" element={user ? <AppSelect user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />

                    {/* Lazy-loaded Apps */}
                    <Route path="/shepherd/*" element={user ? <ShepherdApp user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
                    <Route path="/bible-crew/*" element={user ? <BibleCrewApp user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
                </Routes>
            </React.Suspense>
        </HashRouter>
    );
}
