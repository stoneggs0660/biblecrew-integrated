import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  subscribeToAllComments,
  subscribeToNotice,
  saveNextMonthApplication,
  subscribeToMyNextMonthApplication,
  cancelNextMonthApplication,
  overwriteNextMonthApplication,
  getCurrentYMKey // 필요할 수 있음
} from '../firebaseSync';
import { getCrewLabel } from '../utils/crewConfig';
import { calculateDokStatus } from '../utils/dokUtils';

export default function Home({ user }) {
  const navigate = useNavigate();
  const [allComments, setAllComments] = useState([]);
  const [showMoreToday, setShowMoreToday] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    const unsubComments = subscribeToAllComments(setAllComments);
    const unsubNotice = subscribeToNotice(setNotice);
    return () => {
      if (typeof unsubComments === 'function') unsubComments();
      if (typeof unsubNotice === 'function') unsubNotice();
    };
  }, []);

  const baseComments = (allComments || []).slice(0, 20);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayStartTs = startOfToday.getTime();
  const todayComments = (allComments || []).filter((c) => (c.timestamp || 0) >= todayStartTs);
  const visibleComments = showMoreToday ? todayComments : baseComments;

  const name = user?.name || '게스트';

  const [showNextForm, setShowNextForm] = useState(false);
  const [nextCrew, setNextCrew] = useState('');
  const [myNextApp, setMyNextApp] = useState(null);

  useEffect(() => {
    if (!user || !user.uid) return;
    const unsub = subscribeToMyNextMonthApplication(user.uid, (data) => {
      setMyNextApp(data || {});
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [user]);

  function handleSaveNextMonth() {
    if (!user || !user.uid) {
      alert('로그인 후 신청해 주세요.');
      return;
    }
    if (!nextCrew) {
      alert('신청할 반을 선택해 주세요.');
      return;
    }

    const msg = `정말 '${nextCrew}'(으)로 신청하시겠습니까?\n(기존 신청 내역이 있다면 모두 취소되고 하나만 저장됩니다.)`;
    if (!window.confirm(msg)) return;

    overwriteNextMonthApplication(nextCrew, user.uid, user.name || '이름없음').then(() => {
      alert(`${nextCrew} 신청이 완료되었습니다.`);
      setNextCrew('');
    });
  }

  function handleCancelAll() {
    if (!user || !user.uid) return;
    if (!window.confirm('다음 달 신청 내역을 모두 취소하시겠습니까?')) return;

    cancelNextMonthApplication(user.uid, null).then(() => {
      alert('취소되었습니다.');
    });
  }

  const appliedCrews = Object.keys(myNextApp || {});
  const hasApplication = appliedCrews.length > 0;

  function formatDateTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${hh}:${mm}`;
  }

  return (
    <div
      style={{
        padding: 25,
        minHeight: '100vh',
        background: '#E5F3E6',
        color: '#034732',
      }}
    >
      <h1 style={{ fontSize: 32, marginBottom: 10, textAlign: 'center' }}>
        성경러닝크루 홈
      </h1>
      <p style={{ textAlign: 'center', marginBottom: 20 }}>
        환영합니다, {name}님
      </p>
      {!user && (
        <p style={{ textAlign: 'center', marginBottom: 20 }}>
          먼저 <button onClick={() => navigate('/login')} style={{ textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none', padding: 0, color: '#0B8457' }}>로그인</button> 해 주세요.
        </p>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginBottom: 30,
        }}
      >
        <button
          style={btnStyle('#1B9C5A')}
          onClick={() => navigate('/bible-crew/고급반')}
        >
          🏃 고급반(40)
        </button>
        <button
          style={btnStyle('#1B9C5A')}
          onClick={() => navigate('/bible-crew/중급반')}
        >
          🏃 중급반(30)
        </button>
        <button
          style={btnStyle('#136F63')}
          onClick={() => navigate('/bible-crew/초급반구약A')}
        >
          🏃 구약초급A(15)
        </button>
        <button
          style={btnStyle('#136F63')}
          onClick={() => navigate('/bible-crew/초급반구약B')}
        >
          🏃 구약초급B(15)
        </button>
        <button
          style={btnStyle('#136F63')}
          onClick={() => navigate('/bible-crew/초급반신약')}
        >
          🏃 신약초급반(9)
        </button>
        <button
          style={btnStyle('#FF9F1C')}
          onClick={() => navigate('/bible-crew/명예의전당')}
        >
          🏅 명예의 전당
        </button>
        <button
          style={btnStyle('#0B4F6C')}
          onClick={() => navigate('/bible-crew/신약파노라마')}
        >
          🏃 신약파노라마(5)
        </button>
        <button
          style={btnStyle('#0B4F6C')}
          onClick={() => navigate('/bible-crew/구약파노라마')}
        >
          🏃 구약파노라마(9)
        </button>
        <button
          style={btnStyle('#0F3455')}
          onClick={() => navigate('/bible-crew/records')}>

          👤 내 기록
        </button>
        <button
          style={btnStyle('#0F3455')}
          onClick={() => {
            if (user?.isAdmin) {
              navigate('/bible-crew/admin');
            } else {
              navigate('/bible-crew/admin-login');
            }
          }}
        >
          ⚙️ 관리자 모드
        </button>
      </div>

      <button
        style={{ ...btnStyle('#0B4F6C'), marginBottom: 8 }}
        onClick={() => setShowNextForm((v) => !v)}
      >
        📅 다음달 크루 신청
      </button>

      {showNextForm && (
        <div
          style={{
            marginTop: 4,
            marginBottom: 24,
            padding: 16,
            borderRadius: 12,
            background: '#FFFFFF',
            boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>📅 다음달 크루 신청</h3>
          <p style={{ fontSize: 12, color: '#555', marginBottom: 12 }}>
            다음 달 참여할 크루를 선택해 주세요. (변경 시 기존 신청은 자동 취소됩니다)
          </p>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <select
              value={nextCrew}
              onChange={(e) => setNextCrew(e.target.value)}
              style={{
                flex: 1,
                padding: 8,
                borderRadius: 8,
                border: '1px solid #ccc',
              }}
            >
              <option value="">반 선택</option>
              <option value="고급반">고급반(40)</option>
              <option value="중급반">중급반(30)</option>
              <option value="초급반(구약A)">구약초급A(15)</option>
              <option value="초급반(구약B)">구약초급B(15)</option>
              <option value="초급반">신약초급반(9)</option>
              <option value="구약파노라마">구약파노라마(9)</option>
              <option value="신약파노라마">신약파노라마(5)</option>
            </select>
            <button
              type="button"
              onClick={handleSaveNextMonth}
              style={{
                padding: '0 20px',
                borderRadius: 8,
                border: 'none',
                background: '#0B8457',
                color: '#fff',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              신청(변경)
            </button>
          </div>

          {hasApplication ? (
            <div style={{ marginTop: 16, borderTop: '1px solid #eee', paddingTop: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 'bold', color: '#333', marginBottom: 6 }}>
                ✅ 현재 신청된 반
              </div>
              <div style={{ marginBottom: 10, color: '#0B8457', fontWeight: 600 }}>
                {appliedCrews.map(ck => getCrewLabel(ck)).join(', ')}
              </div>
              <button
                onClick={handleCancelAll}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 8,
                  border: '1px solid #ccc',
                  background: '#f5f5f5',
                  color: '#333',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                신청 취소하기
              </button>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: '#999', marginTop: 10 }}>
              신청 내역이 없습니다.
            </div>
          )}
        </div>
      )}

      <div
        style={{
          marginTop: 10,
          padding: 16,
          borderRadius: 12,
          background: '#FFFFFF',
          boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
        }}
      >
        {notice && (
          <div
            style={{
              marginBottom: 12,
              padding: 12,
              borderRadius: 8,
              background: '#FFF3CD',
              border: '1px solid #FFEEBA',
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{`<공지>`} {notice.title || ''}</div>
            <div style={{ fontSize: 14, whiteSpace: 'pre-line' }}>{notice.content || ''}</div>
          </div>
        )}

        <button
          style={{
            ...btnStyle('#1E7F74'),
            marginBottom: 12,
            padding: 14,
            fontSize: 16,
          }}
          onClick={() => navigate('/bible-crew/crew-members')}
        >
          👥 이번 달 크루원
        </button>

        <h3 style={{ marginTop: 0, marginBottom: 10 }}>📜 오늘의 소감</h3>
        {visibleComments.length === 0 && (
          <p style={{ color: '#666' }}>
            아직 등록된 소감이 없습니다. 오늘 느낀 점을 각 반에서 먼저
            남겨보세요.
          </p>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button
            onClick={() => setShowMoreToday((v) => !v)}
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid #0B8457',
              background: showMoreToday ? '#0B8457' : '#fff',
              color: showMoreToday ? '#fff' : '#0B8457',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            {showMoreToday ? '접기' : '더 보기(오늘만)'}
          </button>
          {showMoreToday && (
            <div style={{ fontSize: 12, color: '#555', alignSelf: 'center' }}>
              오늘 올라온 소감만 모아 보여줍니다.
            </div>
          )}
        </div>

        <ul style={{ paddingLeft: 18 }}>
          {visibleComments.map((c) => (
            <li key={c.id} style={{ marginBottom: 4 }}>
              <span style={{ fontWeight: 'bold' }}>[{c.crew}] {c.user}</span>
              : {c.text}
              {c.timestamp && (
                <span style={{ fontSize: 12, color: '#555', marginLeft: 4 }}>
                  ({formatDateTime(c.timestamp)})
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function btnStyle(bg) {
  return {
    width: '100%',
    height: 63,
    padding: '0 6px',
    borderRadius: 12,
    border: 'none',
    fontSize: 17,
    fontWeight: 'bold',
    background: bg,
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    wordBreak: 'keep-all',
    lineHeight: 1.2,
  };
}