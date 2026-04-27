import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeToSettings, saveShowPassionBanner } from '../apps/bible-crew/firebaseSync';

export default function MasterAdmin({ user }) {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({});

  useEffect(() => {
    const unsub = subscribeToSettings((v) => setSettings(v || {}));
    return () => { if (typeof unsub === 'function') unsub(); };
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F7', padding: '40px 20px 80px' }}>
      <div className="container animate-fade-in" style={{ maxWidth: 800, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
          <div>
            <div style={{ fontSize: 13, color: '#86868B', fontWeight: 600, marginBottom: 4 }}>시스템 중앙 제어</div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1D1D1F' }}>통합 관리자 모드</h1>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: '#86868B' }}>전체 앱 설정 및 시스템 스위치</p>
          </div>
          <button
            onClick={() => navigate('/select')}
            style={{ padding: '8px 16px', borderRadius: '20px', background: '#E5E5EA', color: '#1565C0', fontSize: '15px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
          >
            돌아가기
          </button>
        </header>

        <section style={{ background: '#FFFFFF', borderRadius: 16, padding: 24, boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: 24 }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: 18, color: '#1D3557' }}>앱 선택 화면 제어</h2>
          
          {/* 고난주간 배너 표시 설정 */}
          <div style={{ padding: '16px', background: '#FAFAFA', borderRadius: 8, border: '1px solid #E5E5EA' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <label style={{ fontSize: 14, fontWeight: 600, color: '#1D1D1F', display: 'block', marginBottom: 4 }}>고난주간 배너 보이기</label>
                  <p style={{ margin: 0, fontSize: 12, color: '#86868B' }}>버튼이 'ON'일 때만 앱 선택 메인 화면에 배너가 켜집니다.</p>
                </div>
                <button
                  onClick={() => saveShowPassionBanner(!settings.showPassionBanner)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 20,
                    border: 'none',
                    background: settings.showPassionBanner ? '#34C759' : '#E5E5EA',
                    color: settings.showPassionBanner ? '#fff' : '#8E8E93',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    width: 70
                  }}
                >
                  {settings.showPassionBanner ? 'ON' : 'OFF'}
                </button>
              </div>
          </div>
        </section>

        <section style={{ background: '#F8F9FA', borderRadius: 16, padding: 24, border: '1px dashed #DEE2E6' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: 18, color: '#495057' }}>추후 업데이트 예정</h2>
          <p style={{ margin: 0, fontSize: 14, color: '#868E96' }}>교회 홈페이지 관리 및 기타 전역 앱 제어 기능이 이곳에 배치될 예정입니다.</p>
        </section>
      </div>
    </div>
  );
}
