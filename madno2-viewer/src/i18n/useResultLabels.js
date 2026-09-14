import { useEffect } from 'react';
import ParquetDataManager from '../utils/ParquetDataManager';
import { useI18n } from './useI18n';

/**
 * Keeps the Parquet data manager's result labels in sync with the interface
 * language, so series names, weekday and season names and statistic rows come
 * back in the language the user is reading.
 */
export function useResultLabels() {
  const { t, tList, lang } = useI18n();

  useEffect(() => {
    const labels = {
      weekdaysShort: tList('calendar.weekdaysShort'),
      allDays: t('results.allDays'),
      unknown: t('results.unknown'),
      average: t('results.average'),
      maximum: t('results.maximum'),
      minimum: t('results.minimum'),
      day: t('results.day'),
      year: t('results.year'),
      seasons: {
        Invierno: t('calendar.seasons.winter'),
        Primavera: t('calendar.seasons.spring'),
        Verano: t('calendar.seasons.summer'),
        'Otoño': t('calendar.seasons.autumn'),
      },
      stats: {
        totalRecords: t('results.stats.totalRecords'),
        mean: t('results.stats.mean'),
        median: t('results.stats.median'),
        stdDev: t('results.stats.stdDev'),
        variance: t('results.stats.variance'),
        minimum: t('results.stats.minimum'),
        maximum: t('results.stats.maximum'),
        range: t('results.stats.range'),
        p25: t('results.stats.p25'),
        p50: t('results.stats.p50'),
        p75: t('results.stats.p75'),
        p90: t('results.stats.p90'),
        p95: t('results.stats.p95'),
        p99: t('results.stats.p99'),
      },
    };

    // Remember them for a manager that has not been created yet, and apply
    // them straight away to one that already exists.
    ParquetDataManager.pendingLabels = labels;
    ParquetDataManager.instance?.setLabels(labels);
  }, [lang, t, tList]);
}
