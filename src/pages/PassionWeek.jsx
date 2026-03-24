import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    subscribeToPassionChecks,
    subscribeToPassionManualEntries,
    savePassionCheck,
    addPassionManualEntry,
    removePassionManualEntry
} from '../utils/passionSync';

const PassionWeek = ({ user }) => {
    const navigate = useNavigate();
    const [checkins, setCheckins] = useState({});
    const [manualEntries, setManualEntries] = useState({});
    const [isAdminOpen, setIsAdminOpen] = useState(false);
    const [adminDate, setAdminDate] = useState('d0330');
    const [manualName, setManualName] = useState('');

    const daysData = [
        { id: 'd0330', label: '3.30(월)' },
        { id: 'd0331', label: '3.31(화)' },
        { id: 'd0401', label: '4.01(수)' },
        { id: 'd0402', label: '4.02(목)' },
        { id: 'd0403', label: '4.03(금)' }
    ];

    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [inputPassword, setInputPassword] = useState('');

    useEffect(() => {
        const unsubCheck = subscribeToPassionChecks(setCheckins);
        const unsubManual = subscribeToPassionManualEntries(setManualEntries);
        return () => {
            unsubCheck();
            unsubManual();
        };
    }, []);

    const toggleCheck = (dateId) => {
        const isChecked = !!checkins[dateId]?.[user.uid];
        savePassionCheck(dateId, user.uid, user.name, !isChecked);
    };

    const handleAdminAuth = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsPasswordModalOpen(true);
    };

    const checkPassword = (e) => {
        e.preventDefault();
        if (inputPassword === '8395') {
            setIsAdminOpen(true);
            setIsPasswordModalOpen(false);
            setInputPassword('');
        } else {
            alert('비밀번호가 올바르지 않습니다.');
            setInputPassword('');
        }
    };

    const handleAddManualEntry = (e) => {
        e.preventDefault();
        if (!manualName.trim()) return;
        addPassionManualEntry(adminDate, manualName.trim());
        setManualName('');
    };

    // 흐르는 명단 데이터 생성 (월/ 이름1, 이름2 ... 화/ 이름1 ...)
    const tickerText = useMemo(() => {
        const items = daysData.map(day => {
            const dayCheckins = Object.values(checkins[day.id] || {}).map(u => u.name);
            const dayManuals = Object.values(manualEntries[day.id] || {}).map(m => m.name);
            const allNames = [...dayCheckins, ...dayManuals];
            if (allNames.length === 0) return null;
            return `${day.label}/ ${allNames.join(' ')}`;
        }).filter(Boolean);

        if (items.length === 0) return '함께 기도하고 동행하는 분들을 기다립니다...';
        return items.join(' | ');
    }, [checkins, manualEntries]);

    return (
        <div className="passion-week-container">
            <style>
                {`
                :root {
                    --p-brown: #5d4037;
                    --p-light-brown: #8d6e63;
                    --p-cream: #fdf8f2;
                    --p-green: #6d8e75;
                }
                .passion-week-container {
                    font-family: 'Noto Sans KR', sans-serif;
                    background-color: #f0f0f0;
                    margin: 0;
                    display: flex;
                    justify-content: center;
                    overflow-x: hidden;
                    min-height: 100vh;
                }
                .app-container {
                    width: 100%;
                    max-width: 480px;
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    box-shadow: 0 0 50px rgba(0,0,0,0.1);
                    background-image: url('passion-bg-v2.jpg'); 
                    background-size: cover;
                    background-position: center top;
                    background-repeat: no-repeat;
                    padding-bottom: 60px;
                }
                .admin-button {
                    position: absolute;
                    right: 15px;
                    top: 15px;
                    color: white;
                    background: rgba(0,0,0,0.2);
                    border: none;
                    border-radius: 50%;
                    width: 44px;
                    height: 44px;
                    cursor: pointer;
                    z-index: 100;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .header-date {
                    font-size: 1.8rem;
                    font-weight: 900;
                    letter-spacing: -0.05em;
                }
                .header-time {
                    font-size: 1.3rem;
                    opacity: 0.9;
                    margin-top: 5px;
                    font-weight: 400;
                }
                .main-content {
                    flex-grow: 1;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                }
                .main-content::before {
                    content: "";
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: radial-gradient(circle at 80% 20%, rgba(216, 127, 60, 0.15), transparent 40%);
                    z-index: 0;
                }
                .top-spacer {
                    height: 460px; /* 새 배경의 캘리그라피 위치가 더 위쪽이므로 여백 축소 */
                    position: relative;
                    z-index: 1;
                }
                .attendance-card {
                    margin: 0 10px;
                    z-index: 20;
                }
                .grid-layout {
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                    gap: 6px;
                }
                .day-unit {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    -webkit-tap-highlight-color: transparent;
                    background: white;
                    border-radius: 12px;
                    padding: 15px 5px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                    transition: transform 0.1s;
                    position: relative;
                }
                .day-unit:active {
                    transform: scale(0.95);
                }
                .day-label {
                    font-size: 0.95rem; 
                    color: #333;
                    margin-bottom: 15px;
                    font-weight: 700;
                    letter-spacing: -0.05em;
                }
                .check-ui {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    border: 2px solid #eee;
                    background: #f8f8f8;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                .day-unit.checked .check-ui {
                    background-color: #D4AF37;
                    border-color: #B8972F;
                    box-shadow: 0 0 15px rgba(212, 175, 55, 0.4);
                }
                .check-ui svg {
                    display: none;
                    width: 26px;
                    height: 26px;
                    color: white;
                }
                .day-unit.checked .check-ui svg {
                    display: block;
                }
                .notice-text {
                    color: #5d4037;
                    font-size: 1.1rem; 
                    text-align: center;
                    margin-top: 5px;
                    font-weight: 700;
                    background: rgba(255,255,255,0.4);
                    display: inline-block;
                    width: 100%;
                    padding: 5px 0;
                    margin-bottom: 20px;
                }
                
                /* Ticker Styles */
                .ticker-container {
                    background: rgba(115, 32, 32, 0.85); /* 딥 버건디 반투명 */
                    margin: 0 15px 40px;
                    border-radius: 16px;
                    padding: 18px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                    z-index: 20;
                    backdrop-filter: blur(12px); /* 프리미엄 유리 효과 */
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                }
                .ticker-title {
                    text-align: center;
                    color: #F2E8D5; /* 웜 베이지 명조 느낌 */
                    font-weight: 800;
                    font-size: 1rem;
                    margin-bottom: 12px;
                    letter-spacing: 0.1em;
                }
                .ticker-wrap {
                    width: 100%;
                    overflow: hidden;
                    white-space: nowrap;
                    background: rgba(255, 255, 255, 0.08); 
                    padding: 12px 0;
                    border-radius: 10px;
                }
                .ticker-move {
                    display: inline-block;
                    white-space: nowrap;
                    animation: marquee 12s linear infinite;
                    font-weight: 700;
                    color: #ffffff; /* 가독성 좋은 화이트 */
                    font-size: 1rem;
                    padding-left: 100%;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.2);
                }
                @keyframes marquee {
                    0% { transform: translate(0, 0); }
                    100% { transform: translate(-100%, 0); }
                }

                /* Admin Modal */
                .modal-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.6);
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }
                .admin-modal {
                    background: white;
                    width: 100%;
                    max-width: 400px;
                    border-radius: 20px;
                    padding: 25px;
                    max-height: 80vh;
                    overflow-y: auto;
                }
                .admin-date-select {
                    display: flex; gap: 5px; overflow-x: auto; padding: 5px 0 15px; margin-bottom: 15px; border-bottom: 1px solid #eee;
                }
                .date-chip {
                    padding: 6px 12px; background: #f0f0f0; border: none; border-radius: 20px; white-space: nowrap; font-size: 13px; font-weight: 700; cursor: pointer;
                }
                .date-chip.active {
                    background: var(--p-brown); color: white;
                }
                .name-input-group {
                    display: flex; gap: 8px; margin-bottom: 20px;
                }
                .name-input {
                    flex: 1; padding: 10px 15px; border: 1px solid #ddd; border-radius: 10px; font-size: 15px;
                }
                .btn-add {
                    padding: 10px 20px; background: var(--p-green); color: white; border: none; border-radius: 10px; font-weight: 700;
                }
                .names-list {
                    display: grid; gap: 8px;
                }
                .name-item {
                    display: flex; justify-content: space-between; align-items: center; background: #f9f9f9; padding: 8px 12px; border-radius: 8px; font-size: 14px;
                }
                .btn-del {
                    color: #ef4444; background: none; border: none; font-size: 12px; font-weight: 800; cursor: pointer;
                }
                .password-modal {
                    background: white;
                    padding: 30px;
                    border-radius: 20px;
                    width: 90%;
                    max-width: 320px;
                    box-shadow: 0 15px 40px rgba(0,0,0,0.2);
                    text-align: center;
                }
                .password-input {
                    width: 100%;
                    padding: 12px;
                    margin: 15px 0;
                    border: 2px solid #eee;
                    border-radius: 10px;
                    font-size: 18px;
                    text-align: center;
                    letter-spacing: 0.2em;
                }
                .btn-submit {
                    width: 100%;
                    padding: 12px;
                    background: var(--p-brown);
                    color: white;
                    border: none;
                    border-radius: 10px;
                    font-weight: 700;
                    cursor: pointer;
                }
                .admin-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                    font-size: 13px;
                }
                .admin-table th, .admin-table td {
                    border: 1px solid #eee;
                    padding: 8px 4px;
                    text-align: center;
                }
                .admin-table th {
                    background: #f8f8f8;
                    font-weight: 700;
                }
                .check-o { color: var(--p-green); font-weight: 900; }
                .check-x { color: #ccc; }
                `}
            </style>
            
            {/* Password Modal */}
            {isPasswordModalOpen && (
                <div className="modal-overlay" onClick={() => setIsPasswordModalOpen(false)}>
                    <div className="password-modal" onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>관리자 인증</h3>
                        <p style={{ color: '#666', fontSize: 13, marginTop: 10 }}>비밀번호를 입력하세요.</p>
                        <form onSubmit={checkPassword}>
                            <input 
                                type="password"
                                className="password-input"
                                value={inputPassword}
                                onChange={e => setInputPassword(e.target.value)}
                                autoFocus
                            />
                            <button type="submit" className="btn-submit">확인</button>
                        </form>
                    </div>
                </div>
            )}

            <div className="app-container">
                <button className="admin-button" onClick={handleAdminAuth}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                </button>

                <div className="main-content">
                    <div className="top-spacer"></div>

                    <div className="attendance-card">
                        <div className="grid-layout">
                            {daysData.map(day => {
                                const isChecked = !!checkins[day.id]?.[user.uid];
                                return (
                                    <div 
                                        key={day.id} 
                                        className={`day-unit ${isChecked ? 'checked' : ''}`}
                                        onClick={() => toggleCheck(day.id)}
                                    >
                                        <span className="day-label">{day.label}</span>
                                        <div className="check-ui">
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"></path>
                                            </svg>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <p className="notice-text">
                        - 출석표에 체크하시면 소정의 선물을 드립니다 -
                    </p>

                    {/* Ticker Section */}
                    <div className="ticker-container">
                        <div className="ticker-title">&lt;고난주간 5일간 동행하는 분들&gt;</div>
                        <div className="ticker-wrap">
                            <div className="ticker-move">
                                {tickerText}
                            </div>
                        </div>
                    </div>
                    
                </div>
            </div>

            {/* Admin Modal */}
            {isAdminOpen && (
                <div className="modal-overlay" onClick={() => setIsAdminOpen(false)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>관리자 명단 관리</h3>
                            <button onClick={() => setIsAdminOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20 }}>✕</button>
                        </div>

                        <div className="admin-date-select">
                            {daysData.map(day => (
                                <button 
                                    key={day.id}
                                    className={`date-chip ${adminDate === day.id ? 'active' : ''}`}
                                    onClick={() => setAdminDate(day.id)}
                                >
                                    {day.label}
                                </button>
                            ))}
                        </div>

                        <form className="name-input-group" onSubmit={handleAddManualEntry}>
                            <input 
                                className="name-input" 
                                placeholder="성함 입력" 
                                value={manualName}
                                onChange={e => setManualName(e.target.value)}
                            />
                            <button type="submit" className="btn-add">추가</button>
                        </form>

                        <div style={{ marginBottom: 10, fontSize: 14, fontWeight: 700, color: '#666' }}>명단 (총 {(Object.keys(checkins[adminDate] || {}).length + Object.keys(manualEntries[adminDate] || {}).length)}명)</div>
                        <div className="names-list" style={{ marginBottom: 30 }}>
                            {/* App Checkins */}
                            {Object.entries(checkins[adminDate] || {}).map(([uid, u]) => (
                                <div key={uid} className="name-item">
                                    <span>{u.name} (앱)</span>
                                    <span style={{ color: '#aaa', fontSize: 11 }}>자동연동</span>
                                </div>
                            ))}
                            {/* Manual Entries */}
                            {Object.entries(manualEntries[adminDate] || {}).map(([eid, m]) => (
                                <div key={eid} className="name-item">
                                    <span>{m.name}</span>
                                    <button className="btn-del" onClick={() => removePassionManualEntry(adminDate, eid)}>삭제</button>
                                </div>
                            ))}
                        </div>

                        {/* Summary Table */}
                        <h3 style={{ fontSize: 16, fontWeight: 900, marginTop: 30, borderTop: '2px solid #eee', paddingTop: 20 }}>전체 출석 현황</h3>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>성함</th>
                                        {daysData.map(d => <th key={d.id}>{d.label.split('(')[0]}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        // 1. 모든 고유 사용자 추출 (앱 사용자 + 수동 입력자)
                                        const allFullNames = new Set();
                                        
                                        // 앱 사용자 수집
                                        daysData.forEach(d => {
                                            Object.values(checkins[d.id] || {}).forEach(u => allFullNames.add(u.name));
                                            Object.values(manualEntries[d.id] || {}).forEach(m => allFullNames.add(m.name));
                                        });

                                        const sortedNames = Array.from(allFullNames).sort();

                                        return sortedNames.map(name => (
                                            <tr key={name}>
                                                <td style={{ fontWeight: 700 }}>{name}</td>
                                                {daysData.map(d => {
                                                    const isCheckedApp = Object.values(checkins[d.id] || {}).some(u => u.name === name);
                                                    const isCheckedManual = Object.values(manualEntries[d.id] || {}).some(m => m.name === name);
                                                    const isChecked = isCheckedApp || isCheckedManual;
                                                    return (
                                                        <td key={d.id}>
                                                            {isChecked ? <span className="check-o">O</span> : <span className="check-x">-</span>}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ));
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PassionWeek;
