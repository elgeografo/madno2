/**
 * ParquetDataManager - Sistema de gestión inteligente de datos Parquet
 *
 * Características:
 * - Precarga 3 meses en paralelo (anterior, actual, siguiente)
 * - Buffer circular para evitar saltos entre meses
 * - Queries en background con DuckDB-WASM
 * - Caché LRU automático
 */

import * as duckdb from '@duckdb/duckdb-wasm';
import { cellToLatLng } from 'h3-js';

class ParquetDataManager {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.db = null;
    this.conn = null;
    this.initialized = false;

    // Cache: Map<"YYYY-MM" -> { data: Map<h3 -> {coords, values}>, loading: Promise }>
    this.monthCache = new Map();

    // Buffer de 3 meses: anterior, actual, siguiente
    this.bufferSize = 3;

    // Estado de precarga
    this.preloadQueue = [];
    this.isPreloading = false;
  }

  /**
   * Inicializa DuckDB-WASM
   */
  async initialize() {
    if (this.initialized) return;

    try {
      console.log('🦆 Inicializando DuckDB-WASM...');

      // Cargar bundles desde CDN
      const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
      const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

      // Crear worker
      const worker_url = URL.createObjectURL(
        new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' })
      );
      const worker = new Worker(worker_url);

      // Inicializar DB
      const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);
      this.db = new duckdb.AsyncDuckDB(logger, worker);
      await this.db.instantiate(bundle.mainModule, bundle.pthreadWorker);

      // Crear conexión
      this.conn = await this.db.connect();

      this.initialized = true;
      console.log('✅ DuckDB-WASM inicializado correctamente');
    } catch (error) {
      console.error('❌ Error inicializando DuckDB-WASM:', error);
      throw error;
    }
  }

  /**
   * Construye la URL del archivo Parquet
   */
  getParquetUrl(year, month) {
    const monthPadded = String(month).padStart(2, '0');
    return `${this.baseUrl}/year=${year}/month=${monthPadded}/data.parquet`;
  }

  /**
   * Obtiene la clave del mes para el cache
   */
  getMonthKey(year, month) {
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  /**
   * Calcula los 3 meses del buffer (anterior, actual, siguiente)
   */
  getBufferMonths(year, month) {
    const months = [];

    // Mes anterior
    let prevMonth = month - 1;
    let prevYear = year;
    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear = year - 1;
    }
    months.push({ year: prevYear, month: prevMonth });

    // Mes actual
    months.push({ year, month });

    // Mes siguiente
    let nextMonth = month + 1;
    let nextYear = year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear = year + 1;
    }
    months.push({ year: nextYear, month: nextMonth });

    return months;
  }

  /**
   * Carga un mes completo desde Parquet
   */
  async loadMonth(year, month) {
    const key = this.getMonthKey(year, month);

    // Si ya está en cache o cargando, retornar
    if (this.monthCache.has(key)) {
      const cached = this.monthCache.get(key);
      if (cached.loading) {
        return cached.loading;
      }
      return cached.data;
    }

    // Crear promesa de carga
    const loadingPromise = this._loadMonthData(year, month);

    // Guardar en cache mientras carga
    this.monthCache.set(key, { loading: loadingPromise, data: null });

    try {
      const data = await loadingPromise;

      // Actualizar cache con datos cargados
      this.monthCache.set(key, { loading: null, data });

      // Limpiar cache antiguo (mantener solo últimos 5 meses)
      if (this.monthCache.size > 5) {
        const keys = Array.from(this.monthCache.keys());
        const oldestKey = keys[0];
        this.monthCache.delete(oldestKey);
        console.log(`🧹 Cache limpiado: eliminado ${oldestKey}`);
      }

      return data;
    } catch (error) {
      // Si falla, remover del cache
      this.monthCache.delete(key);
      throw error;
    }
  }

  /**
   * Carga real de datos desde Parquet
   */
  async _loadMonthData(year, month) {
    await this.initialize();

    const url = this.getParquetUrl(year, month);
    const key = this.getMonthKey(year, month);

    console.log(`📥 Cargando ${key} desde ${url}`);

    try {
      const startTime = performance.now();

      // Query directo sobre HTTP
      const query = `
        SELECT
          h3_index,
          datetime,
          value
        FROM read_parquet('${url}')
        ORDER BY datetime
      `;

      const result = await this.conn.query(query);
      const rows = result.toArray();

      const elapsed = performance.now() - startTime;
      console.log(`✅ ${key} cargado: ${rows.length} registros en ${elapsed.toFixed(0)}ms`);

      // Procesar datos: agrupar por h3 y organizar por hora
      const dataByH3 = new Map();

      for (const row of rows) {
        const h3 = row.h3_index;
        const datetime = new Date(row.datetime);
        const day = datetime.getDate();
        const hour = datetime.getHours();
        const value = row.value;

        if (!dataByH3.has(h3)) {
          const [lat, lng] = cellToLatLng(h3);
          dataByH3.set(h3, {
            coordinates: [lng, lat],
            valuesByDayHour: new Map(), // Map<"DD-HH" -> value>
          });
        }

        const dayHourKey = `${String(day).padStart(2, '0')}-${String(hour).padStart(2, '0')}`;
        dataByH3.get(h3).valuesByDayHour.set(dayHourKey, value);
      }

      console.log(`📊 ${key}: ${dataByH3.size} celdas H3 únicas`);

      return dataByH3;
    } catch (error) {
      console.error(`❌ Error cargando ${key}:`, error);
      // Si falla, retornar Map vacío en lugar de lanzar error
      // para que la aplicación siga funcionando
      return new Map();
    }
  }

  /**
   * Precarga los meses del buffer en paralelo
   */
  async preloadBuffer(year, month) {
    const bufferMonths = this.getBufferMonths(year, month);

    console.log(`🔄 Precargando buffer para ${year}-${month}...`);

    // Cargar los 3 meses en paralelo
    const promises = bufferMonths.map(({ year, month }) =>
      this.loadMonth(year, month).catch(err => {
        console.warn(`⚠️ No se pudo precargar ${year}-${month}:`, err);
        return new Map(); // Continuar con Map vacío si falla
      })
    );

    await Promise.all(promises);

    console.log(`✅ Buffer precargado para ${year}-${month}`);
  }

  /**
   * Obtiene datos para un frame específico (año, mes, día, hora)
   */
  getData(year, month, day, hour) {
    // IMPORTANTE: frameBuilder genera horas 1-24, pero Parquet tiene 0-23
    // La hora 24 del día D corresponde a la hora 0 del día D+1
    let actualYear = year;
    let actualMonth = month;
    let actualDay = day;
    let actualHour = hour;

    if (hour === 24) {
      // Hora 24 = medianoche del día siguiente = hora 0 del día D+1
      actualHour = 0;
      actualDay = day + 1;

      // Verificar si pasamos al siguiente mes
      const daysInCurrentMonth = new Date(year, month, 0).getDate();
      if (actualDay > daysInCurrentMonth) {
        actualDay = 1;
        actualMonth = month + 1;

        // Verificar si pasamos al siguiente año
        if (actualMonth > 12) {
          actualMonth = 1;
          actualYear = year + 1;
        }
      }
    }

    const key = this.getMonthKey(actualYear, actualMonth);
    const cached = this.monthCache.get(key);

    if (!cached || !cached.data) {
      console.warn(`⚠️ Datos no disponibles para ${key}`);
      return [];
    }

    const dataByH3 = cached.data;
    const dayHourKey = `${String(actualDay).padStart(2, '0')}-${String(actualHour).padStart(2, '0')}`;

    // Construir array de features para deck.gl
    const features = [];

    for (const [h3, cellData] of dataByH3.entries()) {
      const value = cellData.valuesByDayHour.get(dayHourKey) || 0;

      // Mantener el valor anterior para transiciones suaves
      const prevValue = cellData.lastValue !== undefined ? cellData.lastValue : value;
      cellData.lastValue = value;

      features.push({
        h3,
        coordinates: cellData.coordinates,
        value,
        prevValue,
      });
    }

    return features;
  }

  /**
   * Verifica si un mes está en cache
   */
  isMonthCached(year, month) {
    const key = this.getMonthKey(year, month);
    const cached = this.monthCache.get(key);
    return cached && cached.data !== null;
  }

  /**
   * Limpia toda la cache
   */
  clearCache() {
    this.monthCache.clear();
    console.log('🧹 Cache completamente limpiado');
  }

  /**
   * Cierra la conexión a DuckDB
   */
  async close() {
    if (this.conn) {
      await this.conn.close();
    }
    if (this.db) {
      await this.db.terminate();
    }
    this.initialized = false;
    console.log('🔌 DuckDB-WASM cerrado');
  }
}

// Singleton global
let globalManager = null;

export function getParquetDataManager(baseUrl) {
  if (!globalManager) {
    globalManager = new ParquetDataManager(baseUrl);
  }
  return globalManager;
}

export default ParquetDataManager;
