import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeToSettings } from '../firebaseSync';

function IconImg({ src, alt }) {
  return (
    <img
      src={src}
      alt={alt}
      style={{ width: 34, height: 34, objectFit: 'contain', flexShrink: 0 }}
      loading="lazy"
    />
  );
}

function MenuDotsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 18, height: 18, verticalAlign: 'middle' }}>
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  );
}

function MenuLinesIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 18, height: 18, verticalAlign: 'middle' }}>
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 18, height: 18, verticalAlign: 'middle' }}>
      <path d="M12 3v10" stroke="currentColor" strokeWidth="2" />
      <path d="M8 7l4-4 4 4" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="5" y="11" width="14" height="10" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function PlusCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 18, height: 18, verticalAlign: 'middle' }}>
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7v10M7 12h10" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function KakaoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 20, height: 20, verticalAlign: 'middle' }}>
      <path d="M12 4c-4.4 0-8 2.7-8 6s3.6 6 8 6c.5 0 1-.04 1.5-.12L17 19l-.8-3.2C18.3 14.7 20 12.9 20 10c0-3.3-3.6-6-8-6z" fill="#3C1E1E" />
    </svg>
  );
}

function QrIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 20, height: 20, verticalAlign: 'middle' }}>
      <rect x="2" y="2" width="8" height="8" rx="1" />
      <rect x="4" y="4" width="4" height="4" fill="currentColor" />
      <rect x="14" y="2" width="8" height="8" rx="1" />
      <rect x="16" y="4" width="4" height="4" fill="currentColor" />
      <rect x="2" y="14" width="8" height="8" rx="1" />
      <rect x="4" y="16" width="4" height="4" fill="currentColor" />
      <rect x="12" y="12" width="2" height="2" />
      <rect x="15" y="12" width="2" height="2" />
      <rect x="18" y="12" width="2" height="2" />
      <rect x="12" y="15" width="2" height="2" />
      <rect x="14" y="17" width="2" height="2" />
      <rect x="18" y="18" width="2" height="2" />
    </svg>
  );
}

function InstallGuide() {
  const [open, setOpen] = useState(null); // 'kakao' | 'qr' | null

  const Card = ({ children }) => (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 14,
        padding: 14,
        marginTop: 12,
        boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
      }}
    >
      {children}
    </div>
  );

  const Row = ({ left, children }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
      {left}
      <div style={{ flex: 1, color: '#1B5E20', fontSize: 16, lineHeight: 1.35 }}>{children}</div>
    </div>
  );

  const SectionTitle = ({ children }) => (
    <div style={{ fontWeight: 800, color: '#1B5E20', marginTop: 8, marginBottom: 4, fontSize: 16 }}>{children}</div>
  );

  const GuideButton = ({ kind, bg, fg, icon, label }) => {
    const isOpen = open === kind;
    return (
      <button
        type="button"
        onClick={() => setOpen(isOpen ? null : kind)}
        style={{
          width: '100%',
          maxWidth: 320,
          padding: '14px 16px',
          borderRadius: 14,
          border: 'none',
          background: bg,
          color: fg,
          fontWeight: 900,
          fontSize: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          cursor: 'pointer',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>
        <span>{label}</span>
      </button>
    );
  };

  const arrow = <span style={{ margin: '0 6px', color: '#1B5E20', fontWeight: 900 }}>→</span>;

  return (
    <div style={{ maxWidth: 520, margin: '0 auto 18px auto' }}>
      <div style={{ textAlign: 'center', color: '#1B5E20', fontWeight: 900, fontSize: 18 }}>
        📱 스마트폰 홈화면에 추가하기
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 12 }}>
        <GuideButton kind="kakao" bg="#FEE500" fg="#3C1E1E" icon={<KakaoIcon />} label="카카오톡으로 앱을 연 경우" />
        <GuideButton kind="qr" bg="#1565c0" fg="#fff" icon={<QrIcon />} label="QR코드로 앱을 연 경우" />
      </div>

      {open === 'kakao' && (
        <Card>
          <SectionTitle>1단계: 카톡에서 외부 브라우저 열기</SectionTitle>
          <Row left={<IconImg src="/icons/galaxy.png" alt="갤럭시" />}>
            <strong>갤럭시 등 안드로이드</strong> · 점 세개 메뉴 <MenuDotsIcon />
            {arrow}
            다른 브라우저로 열기
          </Row>
          <Row left={<IconImg src="/icons/apple.png" alt="아이폰" />}>
            <strong>아이폰</strong> · 공유 버튼 <ShareIcon />
            {arrow}
            사파리로 열기
          </Row>

          <SectionTitle>2단계: 외부 브라우저에서 홈화면 추가하기</SectionTitle>
          <Row left={<IconImg src="/icons/samsung-internet.png" alt="삼성인터넷" />}>
            <strong>삼성인터넷</strong> · 세줄 메뉴 <MenuLinesIcon />
            {arrow}
            <strong>+ 버튼</strong> <PlusCircleIcon />
            {arrow}
            홈화면
          </Row>
          <Row left={<IconImg src="/icons/chrome.png" alt="크롬" />}>
            <strong>크롬</strong> · 점 세개 메뉴 <MenuDotsIcon />
            {arrow}
            홈화면 추가
          </Row>
          <Row left={<IconImg src="/icons/safari.png" alt="사파리" />}>
            <strong>사파리</strong> · 공유 버튼 <ShareIcon />
            {arrow}
            홈화면 추가
          </Row>
        </Card>
      )}

      {open === 'qr' && (
        <Card>
          <SectionTitle>외부 브라우저에서 홈화면 추가하기</SectionTitle>
          <Row left={<IconImg src="/icons/safari.png" alt="사파리" />}>
            <strong>사파리</strong> · 공유 버튼 <ShareIcon />
            {arrow}
            홈화면 추가
          </Row>
          <Row left={<IconImg src="/icons/samsung-internet.png" alt="삼성인터넷" />}>
            <strong>삼성인터넷</strong> · 세줄 메뉴 <MenuLinesIcon />
            {arrow}
            <strong>+ 버튼</strong> <PlusCircleIcon />
            {arrow}
            홈화면
          </Row>
          <Row left={<IconImg src="/icons/chrome.png" alt="크롬" />}>
            <strong>크롬</strong> · 점 세개 메뉴 <MenuDotsIcon />
            {arrow}
            홈화면 추가
          </Row>
        </Card>
      )}
    </div>
  );
}

export default function Login({ onLogin }) {
  const [name, setName] = useState('');
  const [pwd, setPwd] = useState('');
  const [settings, setSettings] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = subscribeToSettings((v) => setSettings(v || {}));
    return () => { if (typeof unsub === 'function') unsub(); };
  }, []);

  const churchName = settings.churchName || '마산회원교회';
  const appDescription = settings.appDescription || '성경읽기 러닝크루 입니다.';
  const bulletinUrl = (settings.bulletinUrl || '').trim();

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedPwd = (pwd ?? '').trim();

    if (!trimmedName) {
      alert('이름을 입력해 주세요.');
      return;
    }

    // 이름은 한글/영어만 허용 (공백/특수문자/숫자/이모지 금지)
    const NAME_REGEX = /^[가-힣A-Za-z]+$/;
    if (!NAME_REGEX.test(trimmedName)) {
      alert('이름은 한글 또는 영어만 입력 가능합니다.\n(공백/특수문자/숫자 입력 불가)');
      return;
    }

    // 최초 로그인 및 일반 로그인 모두 비밀번호 필수
    if (!trimmedPwd) {
      alert('비밀번호를 입력해 주세요.\n최초 로그인 시에는 사용할 비밀번호를 새로 만들어 입력해 주세요.');
      return;
    }

    try {
      if (onLogin) {
        const user = await onLogin(trimmedName, trimmedPwd);
        if (user && user.mustChangePassword) {
          navigate('/bible-crew/change-password');
        } else {
          navigate('/bible-crew/home');
        }
      }
    } catch (err) {
      alert(err && err.message ? err.message : '로그인에 실패했습니다.');
    }
  }
  return (
    <div style={{ minHeight: '100vh', background: '#E8F5E9', padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <InstallGuide />
      <h1 style={{ textAlign: 'center', color: '#1B5E20', marginBottom: 18, fontSize: 28 }}>성경러닝크루 로그인</h1>

      <form onSubmit={handleSubmit} style={{ maxWidth: 480, margin: '0 auto' }}>

        {bulletinUrl ? (
          <a
            href={bulletinUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              width: '100%',
              padding: 14,
              marginBottom: 12,
              borderRadius: 10,
              textAlign: 'center',
              textDecoration: 'none',
              background: '#1D3557',
              color: '#fff',
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            📄 주보
          </a>
        ) : null}
        <input
          placeholder="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: '100%', padding: 16, borderRadius: 10, border: '1px solid #ccc', marginBottom: 14, fontSize: 18 }}
        />
        <input
          placeholder="비밀번호"
          type="password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          style={{ width: '100%', padding: 16, borderRadius: 10, border: '1px solid #ccc', marginBottom: 14, fontSize: 18 }}
        />

        <button
          type="submit"
          style={{
            width: '100%', padding: 16, background: '#2E7D32', color: '#fff',
            border: 'none', borderRadius: 10, fontWeight: 'bold', fontSize: 18
          }}
        >
          로그인
        </button>

        <div style={{ marginTop: 20, textAlign: 'center', color: '#1B5E20' }}>{churchName}</div>
        <p style={{ textAlign: 'center', whiteSpace: 'pre-line', marginTop: 20, color: '#1B5E20' }}>
          {appDescription}
        </p>
      </form>
    </div>
  );
}
