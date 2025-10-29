import { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import { cellToLatLng } from 'h3-js';
import { DATA_BASE } from '../config/constants';
import { buildFileName } from '../utils/dateUtils';

export function useDataLoader(frames, frameIdx) {
  const [data, setData] = useState([]);

  // Cache de datos ya cargados (filename -> array de features)
  const cacheRef = useRef(new Map());
  const dataArrayRef = useRef([]); // arreglo persistente para mantener orden y referencias
  const dataIndexRef = useRef(new Map()); // h3 -> índice en dataArrayRef

  useEffect(() => {
    if (frames.length === 0) {
      setData([]);
      dataArrayRef.current = [];
      dataIndexRef.current = new Map();
      return;
    }
    const cur = frames[frameIdx];
    const filename = buildFileName(cur);
    const path = `${DATA_BASE}/${filename}`;

    const cached = cacheRef.current.get(path);
    if (cached) {
      // Actualizar el arreglo persistente en orden estable
      const indexMap = dataIndexRef.current;
      const arr = dataArrayRef.current;

      // Marcar presentes en este frame
      const present = new Set();

      // Actualizar / crear entradas para los h3 presentes
      for (const row of cached) {
        const i = indexMap.get(row.h3);
        if (i !== undefined) {
          const obj = arr[i];
          obj.prevValue = obj.value;
          obj.value = row.value;
          obj.coordinates = row.coordinates; // por si cambian (no debería)
          present.add(row.h3);
        } else {
          const obj = { h3: row.h3, coordinates: row.coordinates, value: row.value, prevValue: 0 };
          arr.push(obj);
          indexMap.set(row.h3, arr.length - 1);
          present.add(row.h3);
        }
      }

      // Para los que no están presentes en este frame, hacer fade a 0 manteniendo objeto y posición
      for (let i = 0; i < arr.length; i++) {
        const obj = arr[i];
        if (!present.has(obj.h3)) {
          obj.prevValue = obj.value;
          obj.value = 0;
        }
      }

      setData(arr.slice());
      return;
    }

    fetch(path)
      .then((resp) => {
        if (!resp.ok) throw new Error(`No se pudo cargar ${path}`);
        return resp.text();
      })
      .then((csvText) => {
        const parsed = Papa.parse(csvText, { header: true, dynamicTyping: true }).data;
        const processed = parsed
          .filter((d) => d && d.h3_index)
          .map((d) => {
            const [lat, lng] = cellToLatLng(d.h3_index);
            return {
              h3: d.h3_index,
              coordinates: [lng, lat],
              value: Number(d.value) || 0,
            };
          });
        cacheRef.current.set(path, processed);
        // Actualizar el arreglo persistente en orden estable
        const indexMap = dataIndexRef.current;
        const arr = dataArrayRef.current;
        const present = new Set();

        for (const row of processed) {
          const i = indexMap.get(row.h3);
          if (i !== undefined) {
            const obj = arr[i];
            obj.prevValue = obj.value;
            obj.value = row.value;
            obj.coordinates = row.coordinates;
            present.add(row.h3);
          } else {
            const obj = { h3: row.h3, coordinates: row.coordinates, value: row.value, prevValue: 0 };
            arr.push(obj);
            indexMap.set(row.h3, arr.length - 1);
            present.add(row.h3);
          }
        }

        for (let i = 0; i < arr.length; i++) {
          const obj = arr[i];
          if (!present.has(obj.h3)) {
            obj.prevValue = obj.value;
            obj.value = 0;
          }
        }

        setData(arr.slice());
      })
      .catch((err) => {
        console.warn(err.message);
        // Si falta un frame, mostramos vacío pero seguimos
        setData([]);
      });
  }, [frames, frameIdx]);

  return data;
}
