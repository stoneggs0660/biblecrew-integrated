import React from 'react';

export default function BibleCalendar({ year, month, portions, checks, onClose, onNavigate }) {
  // 달력 데이터 생성
  const firstDay = new Date(year, month - 1, 1).getDay();
  const lastDate = new Date(year, month, 0).getDate();
  const days = [];
  
  // 패딩 (이전 달 날짜)
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  
  // 이번 달 날짜
  for (let d = 1; d <= lastDate; d++) {
    days.push(d);
  }
  
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const currentYM = `${year}-${String(month).padStart(2, '0')}`;

  const portionMap = {};
  portions.forEach(p => {
    portionMap[p.date] = p;
  });

  return (
    <div style={modalOverlay} onClick={onClose}>
      <style>{`
        @keyframes scaleUp {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
      <div style={modalContent} onClick={e => e.stopPropagation()}>
        <div style={header}>
          <div style={headerTitle}>
            <span style={{ fontSize: '1.2rem', marginRight: 8 }}>📅</span>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{year}년 {month}월 러닝체크표</h3>
          </div>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>
        
        <div style={calendarGrid}>
          {['일', '월', '화', '수', '목', '금', '토'].map((w, idx) => (
            <div key={w} style={{...weekdayHeader, color: idx === 0 ? '#E63946' : idx === 6 ? '#1565C0' : '#64748B'}}>{w}</div>
          ))}
          {days.map((d, idx) => {
            if (d === null) return <div key={`empty-${idx}`} style={dayCell}></div>;
            
            const dateStr = `${currentYM}-${String(d).padStart(2, '0')}`;
            const p = portionMap[dateStr];
            const isChecked = checks[dateStr];
            const hasPortion = p && p.chapters > 0;
            const isPast = dateStr < todayKey;
            const isToday = dateStr === todayKey;
            const isMissed = isPast && hasPortion && !isChecked;

            return (
              <div 
                key={d} 
                style={{
                  ...dayCell,
                  ...(hasPortion ? clickableDay : {}),
                  ...(isToday ? todayHighlight : {})
                }}
                onClick={() => hasPortion && onNavigate(dateStr)}
              >
                <span style={{
                  ...dayNum,
                  color: isChecked ? '#fff' : (idx % 7 === 0) ? '#E63946' : (idx % 7 === 6) ? '#1565C0' : '#1E293B',
                  fontWeight: (isChecked || isToday) ? 900 : 600,
                  position: 'relative',
                  zIndex: 2
                }}>{d}</span>
                
                {isChecked && <div style={orangeCircle} />}
                
                {isToday && <div style={todayDot} />}
              </div>
            );
          })}
        </div>
        
        <div style={guideText}>날짜를 누르면 해당 날짜의 체크 화면으로 이동합니다</div>
      </div>
    </div>
  );
}

const orangeCircle = {
  position: 'absolute',
  width: '34px',
  height: '34px',
  borderRadius: '50%',
  backgroundColor: '#FF7000', // 주황색 형광 느낌
  boxShadow: '0 0 12px rgba(255, 112, 0, 0.6)',
  zIndex: 1,
};

const modalOverlay = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10000,
  padding: '16px',
};

const modalContent = {
  width: '100%',
  maxWidth: '380px',
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  borderRadius: '32px',
  padding: '24px',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
  animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
};

const header = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const headerTitle = {
  display: 'flex',
  alignItems: 'center',
  color: '#0F172A',
};

const closeBtn = {
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  border: 'none',
  backgroundColor: '#F1F5F9',
  color: '#64748B',
  fontSize: '18px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const calendarGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: '4px',
};

const weekdayHeader = {
  textAlign: 'center',
  fontSize: '13px',
  fontWeight: 800,
  paddingBottom: '12px',
};

const dayCell = {
  aspectRatio: '1 / 1',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  borderRadius: '50%', // 원형 강조에 맞춰 셀도 원형 느낌으로
  transition: 'all 0.2s',
  cursor: 'pointer',
};

const clickableDay = {
  // background: '#F8FAFC' -> 배경 제거하여 깔끔하게
};

const todayHighlight = {
  border: '2px solid #2563EB',
};

const dayNum = {
  fontSize: '15px',
};

const todayDot = {
  position: 'absolute',
  bottom: '4px',
  width: '4px',
  height: '4px',
  borderRadius: '50%',
  backgroundColor: '#2563EB',
  zIndex: 3,
};

const guideText = {
  textAlign: 'center',
  fontSize: '12px',
  color: '#64748B',
  fontWeight: 600,
  marginTop: '8px'
};

// CSS 애니메이션 추가를 위해 style 태그 삽입 로직 대신 인라인은 한계가 있으나,
// pulse 등은 React 인라인으로 힘들 수 있으니 최대한 깔끔하게 유지합니다.
