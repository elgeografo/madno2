import { useContext } from 'react';
import { I18nContext } from './context';

/**
 * Access the current language, the setter and the translation helpers.
 */
export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
