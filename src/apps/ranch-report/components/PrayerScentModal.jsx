import React, { useState, useEffect } from 'react';
import { applyPrayerScent, cancelPrayerScent, subscribeToPrayerScent } from '../shepherdSync.js';

export default function PrayerScentModal({ user, sunday, onClose }) {
    const todayStr = new Date().toISOString().slice(0, 7);
    const [viewYM, setViewYM] = useState(todayStr); // 현재 보고 있는 년-월 (YYYY-MM)
    const [scentData, setScentData] = useState({});
    const [selectedDate, setSelectedDate] = useState(null);

    // 다음 달 YM 계산 로직
    const [thisY, thisM] = todayStr.split('-').map(Number);
    const nextY = thisM === 12 ? thisY + 1 : thisY;
    const nextM = thisM === 12 ? 1 : thisM + 1;
    const nextYM = `${nextY}-${String(nextM).padStart(2, '0')}`;

    // 이동 가능 여부 체크 (이번 달과 다음 달만)
    const canGoNext = viewYM === todayStr;
    const canGoPrev = viewYM === nextYM;

    // 월 변경 시 데이터 구독
    useEffect(() => {
        const unsub = subscribeToPrayerScent(viewYM, setScentData);
        return () => unsub?.();
    }, [viewYM]);

    const [y, m] = viewYM.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const firstDay = new Date(y, m - 1, 1).getDay(); // 0: Sun

    const dates = [];
    for (let i = 0; i < firstDay; i++) dates.push(null);
    for (let i = 1; i <= daysInMonth; i++) dates.push(`${viewYM}-${String(i).padStart(2, '0')}`);

    const applicants = selectedDate ? Object.values(scentData[selectedDate] || {}) : [];

    // 본인 신청 여부 체크 (UID 또는 성함 매칭)
    const checkIfApplied = (date) => {
        const dayData = scentData[date] || {};
        return user?.uid && (!!dayData[user.uid] || Object.values(dayData).some(info => info.name === user.name));
    };

    const isApplied = selectedDate && checkIfApplied(selectedDate);

    return (
        <div style={modalOverlay}>
            <div style={modalContent}>
                <div style={{ position: 'relative', marginBottom: 28 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#1D1D1F' }}>기도의 향 신청</h2>
                        <button onClick={onClose} style={closeBtn}>✕</button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 20,
                            background: '#F2F2F7',
                            padding: '12px 32px',
                            borderRadius: 24,
                            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)'
                        }}>
                            <button
                                onClick={() => canGoPrev && setViewYM(todayStr)}
                                style={{ ...miniNavBtn, fontSize: 24, opacity: canGoPrev ? 1 : 0.1, cursor: canGoPrev ? 'pointer' : 'default', padding: '4px 16px' }}
                                disabled={!canGoPrev}
                            >◀</button>
                            <span style={{ fontSize: 26, fontWeight: 900, color: '#0071E3', minWidth: 80, textAlign: 'center' }}>{m}월</span>
                            <button
                                onClick={() => canGoNext && setViewYM(nextYM)}
                                style={{ ...miniNavBtn, fontSize: 24, opacity: canGoNext ? 1 : 0.1, cursor: canGoNext ? 'pointer' : 'default', padding: '4px 16px' }}
                                disabled={!canGoNext}
                            >▶</button>
                        </div>
                    </div>
                </div>

                {/* 달력 */}
                <div style={calendarGrid}>
                    {['일', '월', '화', '수', '목', '금', '토'].map(d => (
                        <div key={d} style={calendarHeader}>{d}</div>
                    ))}
                    {dates.map((date, idx) => {
                        if (!date) return <div key={`empty-${idx}`} />;

                        const dayData = scentData[date] || {};
                        const count = Object.keys(dayData).length;
                        const isSelected = selectedDate === date;
                        const isToday = date === new Date().toISOString().split('T')[0];
                        const isDateUserApplied = checkIfApplied(date);

                        return (
                            <div
                                key={date}
                                onClick={() => setSelectedDate(date)}
                                style={{
                                    ...calendarCell,
                                    background: isSelected ? '#2563EB' : (isDateUserApplied ? '#FFF7ED' : '#fff'),
                                    color: isSelected ? '#fff' : '#1E293B',
                                    border: isSelected
                                        ? '2px solid #2563EB'
                                        : (isDateUserApplied
                                            ? '2px solid #F97316'
                                            : (isToday ? '2px solid #2563EB' : '1px solid #E2E8F0')),
                                    position: 'relative'
                                }}
                            >
                                <div style={{ fontSize: 15, fontWeight: 900 }}>{parseInt(date.slice(8), 10)}</div>

                                {count > 0 && (
                                    <div style={{
                                        marginTop: 4, fontSize: 11, fontWeight: 900,
                                        color: isSelected ? '#fff' : (isDateUserApplied ? '#F97316' : '#2563EB'),
                                        background: isSelected ? 'rgba(255,255,255,0.2)' : (isDateUserApplied ? '#FFEDD5' : '#EBF5FF'),
                                        padding: '2px 6px', borderRadius: 6
                                    }}>
                                        {count}명
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Legend & Summary */}
                <div style={{ marginTop: 14, padding: '0 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 4, background: '#FFF7ED', border: '1.5px solid #F97316' }} />
                        <span style={{ fontSize: 12, color: '#1E293B', fontWeight: 800 }}>내가 신청한 날짜</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
                        {m}월 총 <span style={{ color: '#F97316', fontWeight: 900 }}>{Object.values(scentData || {}).filter(day => day && (day[user?.uid] || Object.values(day).some(info => info.name === user.name))).length}건</span> 신청됨
                    </div>
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
    zIndex: 2000, backdropFilter: 'blur(4px)'
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
    textAlign: 'center', fontSize: 11, fontWeight: 900, color: '#94A3B8', padding: '4px 0'
};

const calendarCell = {
    height: 60, borderRadius: 12, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    transition: 'all 0.2s', position: 'relative'
};

const primaryBtn = { width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: '#2563EB', color: '#fff', fontWeight: 900, fontSize: 16, cursor: 'pointer', marginTop: 16 };

const miniNavBtn = {
    border: 'none', background: 'none', fontSize: 14, color: '#0071E3', padding: '4px 8px', fontWeight: 900
};
