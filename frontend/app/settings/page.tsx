'use client';

import { useState, useEffect } from 'react';

export default function Settings() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
  const [theme, setTheme] = useState<'dark'|'light'>('dark');
  const [fontSize, setFontSize] = useState<'normal'|'large'|'xlarge'>('normal');
  const [autoSave, setAutoSave] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [defaultModel, setDefaultModel] = useState('gemma3:4b');
  const [defaultLanguage, setDefaultLanguage] = useState('');
  const [enableDiarization, setEnableDiarization] = useState(true);
  const [models, setModels] = useState<string[]>([]);

  useEffect(() => {
    // Load preferences
    const savedTheme = localStorage.getItem('theme') as 'dark'|'light' || 'dark';
    const savedFontSize = localStorage.getItem('fontSize') as 'normal'|'large'|'xlarge' || 'normal';
    const savedAutoSave = localStorage.getItem('autoSave') !== 'false';
    const savedNotifications = localStorage.getItem('notifications') !== 'false';
    const savedModel = localStorage.getItem('defaultModel') || 'gemma3:4b';
    const savedLanguage = localStorage.getItem('defaultLanguage') || '';
    const savedDiarization = localStorage.getItem('enableDiarization') !== 'false';

    setTheme(savedTheme);
    setFontSize(savedFontSize);
    setAutoSave(savedAutoSave);
    setNotifications(savedNotifications);
    setDefaultModel(savedModel);
    setDefaultLanguage(savedLanguage);
    setEnableDiarization(savedDiarization);

    // Load models
    (async () => {
      try {
        const r = await fetch(`${apiBase}/api/models`);
        const j = await r.json();
        setModels((j.models || []).map((m: any) => m.name));
      } catch {}
    })();
  }, []);

  function saveSettings() {
    localStorage.setItem('theme', theme);
    localStorage.setItem('fontSize', fontSize);
    localStorage.setItem('autoSave', String(autoSave));
    localStorage.setItem('notifications', String(notifications));
    localStorage.setItem('defaultModel', defaultModel);
    localStorage.setItem('defaultLanguage', defaultLanguage);
    localStorage.setItem('enableDiarization', String(enableDiarization));

    // Apply theme
    document.body.style.background = theme === 'dark' ? '#000' : '#fff';
    document.body.style.color = theme === 'dark' ? '#fff' : '#000';

    // Apply font size
    const multiplier = fontSize === 'normal' ? 1 : fontSize === 'large' ? 1.2 : 1.4;
    document.documentElement.style.fontSize = `${16 * multiplier}px`;

    alert('Settings saved successfully!');
  }

  function resetSettings() {
    if (!confirm('Reset all settings to defaults?')) return;

    localStorage.clear();
    window.location.reload();
  }

  const colors = theme === 'dark' ? {
    bg: '#000',
    bgAlt: '#0a0a0a',
    border: '#333',
    text: '#fff',
    textAlt: '#888',
    button: '#111',
  } : {
    bg: '#fff',
    bgAlt: '#f5f5f5',
    border: '#ddd',
    text: '#000',
    textAlt: '#666',
    button: '#f0f0f0',
  };

  return (
    <main style={{ minHeight: '100vh', padding: '24px', background: colors.bg, color: colors.text }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 className="bbh-sans-bartle-regular" style={{ fontSize: '28px' }}>
          Settings
        </h1>
        <a
          href="/"
          style={{
            padding: '8px 16px',
            border: `1px solid ${colors.border}`,
            background: colors.button,
            color: colors.text,
            textDecoration: 'none',
            display: 'inline-block'
          }}
        >
          ← Back to Home
        </a>
      </div>

      <div style={{ maxWidth: '800px' }}>
        {/* Appearance */}
        <section style={{ marginBottom: '24px', padding: '16px', border: `1px solid ${colors.border}`, background: colors.bgAlt }}>
          <h2 className="bbh-sans-bartle-regular" style={{ fontSize: '20px', marginBottom: '16px' }}>
            Appearance
          </h2>

          <div className="merriweather-500" style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>Theme</label>
            <select
              value={theme}
              onChange={e => setTheme(e.target.value as 'dark'|'light')}
              style={{
                padding: '8px',
                border: `1px solid ${colors.border}`,
                background: colors.button,
                color: colors.text,
                width: '200px'
              }}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>

          <div className="merriweather-500">
            <label style={{ display: 'block', marginBottom: '8px' }}>Font Size</label>
            <select
              value={fontSize}
              onChange={e => setFontSize(e.target.value as 'normal'|'large'|'xlarge')}
              style={{
                padding: '8px',
                border: `1px solid ${colors.border}`,
                background: colors.button,
                color: colors.text,
                width: '200px'
              }}
            >
              <option value="normal">Normal</option>
              <option value="large">Large</option>
              <option value="xlarge">Extra Large</option>
            </select>
          </div>
        </section>

        {/* Processing Defaults */}
        <section style={{ marginBottom: '24px', padding: '16px', border: `1px solid ${colors.border}`, background: colors.bgAlt }}>
          <h2 className="bbh-sans-bartle-regular" style={{ fontSize: '20px', marginBottom: '16px' }}>
            Processing Defaults
          </h2>

          <div className="merriweather-500" style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>Default Model</label>
            <select
              value={defaultModel}
              onChange={e => setDefaultModel(e.target.value)}
              style={{
                padding: '8px',
                border: `1px solid ${colors.border}`,
                background: colors.button,
                color: colors.text,
                width: '300px'
              }}
            >
              {models.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="merriweather-500" style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>Default Language</label>
            <input
              type="text"
              value={defaultLanguage}
              onChange={e => setDefaultLanguage(e.target.value)}
              placeholder="Auto-detect"
              style={{
                padding: '8px',
                border: `1px solid ${colors.border}`,
                background: colors.button,
                color: colors.text,
                width: '300px'
              }}
            />
            <div style={{ fontSize: '12px', color: colors.textAlt, marginTop: '4px' }}>
              Leave empty for auto-detection, or use language code (e.g., en, es, fr)
            </div>
          </div>

          <div className="merriweather-500">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={enableDiarization}
                onChange={e => setEnableDiarization(e.target.checked)}
              />
              Enable speaker diarization by default
            </label>
          </div>
        </section>

        {/* General */}
        <section style={{ marginBottom: '24px', padding: '16px', border: `1px solid ${colors.border}`, background: colors.bgAlt }}>
          <h2 className="bbh-sans-bartle-regular" style={{ fontSize: '20px', marginBottom: '16px' }}>
            General
          </h2>

          <div className="merriweather-500" style={{ marginBottom: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={autoSave}
                onChange={e => setAutoSave(e.target.checked)}
              />
              Auto-save transcript edits
            </label>
          </div>

          <div className="merriweather-500">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={notifications}
                onChange={e => setNotifications(e.target.checked)}
              />
              Enable notifications
            </label>
          </div>
        </section>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={saveSettings}
            style={{
              padding: '12px 24px',
              border: `1px solid ${colors.border}`,
              background: '#0a0',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Save Settings
          </button>

          <button
            onClick={resetSettings}
            style={{
              padding: '12px 24px',
              border: `1px solid ${colors.border}`,
              background: '#a00',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    </main>
  );
}
