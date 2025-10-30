/**
 * Hook para cargar datos desde Parquet con precarga inteligente
 *
 * Ventajas sobre CSV:
 * - 6x menos datos descargados
 * - 1 request por mes vs 720-744 requests
 * - Precarga automática sin saltos entre meses
 * - Buffer circular de 3 meses
 */

import { useState, useEffect, useRef } from 'react';
import { getParquetDataManager } from '../utils/ParquetDataManager';

export function useParquetDataLoader(frames, frameIdx, baseUrl) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const managerRef = useRef(null);
  const lastMonthRef = useRef(null);

  // Inicializar manager
  useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = getParquetDataManager(baseUrl);
    }

    return () => {
      // Cleanup al desmontar componente
      // No cerramos el manager porque es singleton y puede ser usado por otros
    };
  }, [baseUrl]);

  // Cargar datos cuando cambia el frame
  useEffect(() => {
    if (frames.length === 0) {
      setData([]);
      return;
    }

    const currentFrame = frames[frameIdx];
    const { year, month, day, hour } = currentFrame;

    if (!year || !month || !day || hour === undefined) {
      return;
    }

    const manager = managerRef.current;
    if (!manager) return;

    const currentMonthKey = `${year}-${String(month).padStart(2, '0')}`;

    // Función para actualizar datos del frame actual
    const updateFrameData = () => {
      try {
        const frameData = manager.getData(year, month, day, hour);
        setData(frameData);
        setError(null);
      } catch (err) {
        console.error('Error obteniendo datos del frame:', err);
        setError(err);
        setData([]);
      }
    };

    // Si el mes cambió, precargar buffer
    if (lastMonthRef.current !== currentMonthKey) {
      console.log(`🔄 Cambio de mes detectado: ${lastMonthRef.current} → ${currentMonthKey}`);
      lastMonthRef.current = currentMonthKey;

      setLoading(true);

      // Precargar buffer (3 meses) en background
      manager
        .preloadBuffer(year, month)
        .then(() => {
          console.log(`✅ Buffer precargado para ${currentMonthKey}`);
          updateFrameData();
        })
        .catch((err) => {
          console.error('Error precargando buffer:', err);
          setError(err);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      // Mismo mes, solo actualizar frame
      // Si el mes ya está en cache, esto es instantáneo
      if (manager.isMonthCached(year, month)) {
        updateFrameData();
      } else {
        // Si por alguna razón no está en cache, cargar
        setLoading(true);
        manager
          .loadMonth(year, month)
          .then(() => {
            updateFrameData();
          })
          .catch((err) => {
            console.error('Error cargando mes:', err);
            setError(err);
          })
          .finally(() => {
            setLoading(false);
          });
      }
    }
  }, [frames, frameIdx, baseUrl]);

  return { data, loading, error };
}

/**
 * Hook compatible con la interfaz de useDataLoader (CSV)
 * Para facilitar migración gradual
 */
export function useParquetDataLoaderCompat(frames, frameIdx, baseUrl) {
  const { data } = useParquetDataLoader(frames, frameIdx, baseUrl);
  return data;
}
