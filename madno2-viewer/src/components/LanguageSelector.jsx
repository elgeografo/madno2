import React from 'react';
import { useI18n } from '../i18n/useI18n';

const OPTIONS = [
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
];

/**
 * Language selector shown at the right end of the menu bar.
 * Uses a native <select> so it behaves well on touch devices.
 */
export function LanguageSelector() {
  const { lang, setLang, t } = useI18n();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(255, 255, 255, 0.9)',
        padding: '8px 12px',
        borderRadius: '6px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        aria-label={t('menu.language')}
        title={t('menu.language')}
        style={{
          padding: '6px 8px',
          fontSize: '13px',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          background: 'white',
          color: '#374151',
          cursor: 'pointer',
        }}
      >
        {OPTIONS.map((option) => (
          <option key={option.code} value={option.code}>
            {option.flag} {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
