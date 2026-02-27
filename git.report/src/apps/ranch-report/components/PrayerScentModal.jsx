import React, { useState } from 'react';
import { applyPrayerScent, cancelPrayerScent } from '../shepherdSync.js';

export default function PrayerScentModal({ user, sunday, data, onClose }) {
    const [selectedDate, setSelectedDate] = useState(null);
    const ym = sunday.slice(0, 7);
    const [y, m] = ym.split('-').map(Number);

    // 달력 생성
    const daysInMonth = new Date(y, m, 0).getDate();
    const firstDay = new Date(y, m - 1, 1).getDay(); // 0: Sun

    const dates = [];
    for (let i = 0; i < firstDay; i++) dates.push(null);
    for (let i = 1; i <= daysInMonth; i++) dates.push(`${ym}-${String(i).padStart(2, '0')}`);

    const applicants = selectedDate ? Object.values(data[selectedDate] || {}) : [];
    const isApplied = selectedDate && !!data[selectedDate]?.[user.uid];

    return (
        <div style={modalOverlay}>
            <div style={modalContent}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>기도의 향 신청 ({m}월)</h2>
                    <button onClick={onClose} style={closeBtn}>✕</button>
                </div>

                {/* 달력 */}
                <div style={calendarGrid}>
                    {['일', '월', '화', '수', '목', '금', '토'].map(d => (
                        <div key={d} style={calendarHeader}>{d}</div>
                    ))}
                    {dates.map((date, idx) => {
                        if (!date) return <div key={`empty-${idx}`} />;
                        const count = Object.keys(data[date] || {}).length;
                        const isSelected = selectedDate === date;
                        const isToday = date === new Date().toISOString().slice(0, 10);

                        return (
                            <div
                                key={date}
                                onClick={() => setSelectedDate(date)}
                                style={{
                                    ...calendarCell,
                                    background: isSelected ? '#2563EB' : '#fff',
                                    color: isSelected ? '#fff' : '#1E293B',
                                    border: isToday ? '2px solid #2563EB' : '1px solid #E2E8F0'
                                }}
                            >
                                <div style={{ fontSize: 13, fontWeight: 800 }}>{parseInt(date.slice(8), 10)}</div>
                                {count > 0 && (
                                    <div style={{
                                        marginTop: 4, fontSize: 12, fontWeight: 900,
                                        color: isSelected ? '#fff' : '#2563EB',
                                        background: isSelected ? 'rgba(255,255,255,0.2)' : '#EBF5FF',
                                        padding: '2px 6px', borderRadius: 6
                                    }}>
                                        {count}명
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* 신청 상세 */}
                {selectedDate && (
                    <div style={{ marginTop: 20, padding: 16, background: '#F8FAFC', borderRadius: 16, border: '1px solid #E2E8F0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <div style={{ fontWeight: 900, fontSize: 15 }}>{selectedDate} 신청 현황</div>
                            <span style={{ fontSize: 12, color: '#64748B', fontWeight: 700 }}>총 {applicants.length}명</span>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                            {applicants.length === 0 ? (
                                <div style={{ fontSize: 13, color: '#94A3B8' }}>아직 신청자가 없습니다.</div>
                            ) : (
                                applicants.map((a, idx) => (
                                    <div key={idx} style={{ padding: '4px 10px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, fontWeight: 700 }}>
                                        {a.name}
                                    </div>
                                ))
                            )}
                        </div>

                        {isApplied ? (
                            <button
                                onClick={() => cancelPrayerScent(selectedDate, user.uid)}
                                style={{ ...primaryBtn, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5', marginTop: 0 }}
                            >
                                신청 취소하기
                            </button>
                        ) : (
                            <button
                                onClick={() => applyPrayerScent(selectedDate, user.uid, user.name)}
                                style={{ ...primaryBtn, marginTop: 0 }}
                            >
                                기도의 향 신청하기
                            </button>
                        )}
                    </div>
                )}
            </div>
            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}

const modalOverlay = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    zIndex: 1000, backdropFilter: 'blur(4px)'
};

const modalContent = {
    width: '100%', maxWidth: 500, background: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: '24px 20px 40px', boxSizing: 'border-box',
    animation: 'slideUp 0.3s ease-out'
};

const closeBtn = {
    border: 'none', background: 'none', fontSize: 20, color: '#64748B', cursor: 'pointer'
};

const calendarGrid = {
    display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6
};

const calendarHeader = {
    textAlign: 'center', fontSize: 12, fontWeight: 900, color: '#94A3B8', padding: '4px 0'
};

const calendarCell = {
    height: 60, borderRadius: 12, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    transition: 'all 0.2s'
};

const primaryBtn = { width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: '#2563EB', color: '#fff', fontWeight: 900, fontSize: 16, cursor: 'pointer', marginTop: 16 };
