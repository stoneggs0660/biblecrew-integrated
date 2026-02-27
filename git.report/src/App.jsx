import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AppSelect from './pages/AppSelect';
import ShepherdApp from './apps/ranch-report/ShepherdApp';

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
            <Routes>
                <Route path="/" element={<Navigate to={user ? "/select" : "/login"} replace />} />
                <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/select" replace />} />
                <Route path="/select" element={user ? <AppSelect user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />

                {/* Apps */}
                <Route path="/shepherd/*" element={user ? <ShepherdApp user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
                {/* Bible Crew will be added later */}
            </Routes>
        </HashRouter>
    );
}
