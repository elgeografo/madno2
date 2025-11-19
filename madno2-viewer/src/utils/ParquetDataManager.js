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

  // ========== MÉTODOS DE ANÁLISIS TEMPORAL ==========

  /**
   * Análisis: Promedio por hora del día (0-23) para un mes específico o todo el año
   * Si se proporcionan weekdays, devuelve múltiples series (una por día)
   * Si month es null, calcula para todo el año
   * Si hexId se proporciona, filtra solo ese hexágono
   * @returns {Object} { data: Array, sqlQuery: String }
   */
  async getHourlyAverages(year, month, weekdays = [], hexId = null) {
    await this.initialize();

    const daysFilter = weekdays.length > 0
      ? `AND DAYOFWEEK(datetime) IN (${weekdays.join(',')})`
      : '';

    const hexFilter = hexId
      ? `AND h3_index = '${hexId}'`
      : '';

    // Si month es null, procesar todo el año
    if (month === null) {
      console.log(`📊 Calculando promedios por hora para todo ${year}`,
        weekdays.length > 0 ? `(días: ${weekdays.join(',')})` : '(todos los días)');

      // Construir UNION de todos los meses del año
      const queries = [];
      for (let m = 1; m <= 12; m++) {
        const url = this.getParquetUrl(year, m);
        queries.push(`SELECT h3_index, datetime, value FROM read_parquet('${url}')`);
      }
      const unionQuery = queries.join(' UNION ALL ');

      try {
        // Si no hay filtro de días o solo hay un día, devolver tres series (promedio, máximo, mínimo)
        if (weekdays.length === 0 || weekdays.length === 1) {
          const result = await this.conn.query(`
            SELECT
              EXTRACT(hour FROM datetime) as hour,
              AVG(value) as avg_value,
              MAX(value) as max_value,
              MIN(value) as min_value
            FROM (${unionQuery})
            WHERE 1=1 ${daysFilter} ${hexFilter}
            GROUP BY hour
            ORDER BY hour
          `);

          const rows = result.toArray();
          const prefix = weekdays.length === 1 ? this.getDayName(weekdays[0]) : 'Todos los días';

          return [
            {
              series: `${prefix} (Promedio)`,
              data: rows.map(row => ({
                label: `${row.hour}h`,
                value: row.avg_value
              }))
            },
            {
              series: `${prefix} (Máximo)`,
              data: rows.map(row => ({
                label: `${row.hour}h`,
                value: row.max_value
              }))
            },
            {
              series: `${prefix} (Mínimo)`,
              data: rows.map(row => ({
                label: `${row.hour}h`,
                value: row.min_value
              }))
            }
          ];
        }

        // Múltiples días: devolver una serie por cada día
        const result = await this.conn.query(`
          SELECT
            DAYOFWEEK(datetime) as dow,
            EXTRACT(hour FROM datetime) as hour,
            AVG(value) as avg_value
          FROM (${unionQuery})
          WHERE DAYOFWEEK(datetime) IN (${weekdays.join(',')}) ${hexFilter}
          GROUP BY dow, hour
          ORDER BY dow, hour
        `);

        const rows = result.toArray();

        // Agrupar por día de la semana
        const seriesMap = {};
        rows.forEach(row => {
          const dayName = this.getDayName(row.dow);
          if (!seriesMap[dayName]) {
            seriesMap[dayName] = [];
          }
          seriesMap[dayName].push({
            label: `${row.hour}h`,
            value: row.avg_value
          });
        });

        return Object.keys(seriesMap).map(dayName => ({
          series: dayName,
          data: seriesMap[dayName]
        }));
      } catch (error) {
        console.error('Error en getHourlyAverages (año completo):', error);
        throw error;
      }
    }

    // Análisis para un mes específico
    const url = this.getParquetUrl(year, month);

    console.log(`📊 Calculando promedios por hora para ${year}-${month}`,
      weekdays.length > 0 ? `(días: ${weekdays.join(',')})` : '(todos los días)');

    try {
      // Si no hay filtro de días o solo hay un día, devolver tres series (promedio, máximo, mínimo)
      if (weekdays.length === 0 || weekdays.length === 1) {
        const result = await this.conn.query(`
          SELECT
            EXTRACT(hour FROM datetime) as hour,
            AVG(value) as avg_value,
            MAX(value) as max_value,
            MIN(value) as min_value
          FROM read_parquet('${url}')
          WHERE 1=1 ${daysFilter} ${hexFilter}
          GROUP BY hour
          ORDER BY hour
        `);

        const rows = result.toArray();
        const prefix = weekdays.length === 1 ? this.getDayName(weekdays[0]) : 'Todos los días';

        return [
          {
            series: `${prefix} (Promedio)`,
            data: rows.map(row => ({
              label: `${row.hour}h`,
              value: row.avg_value
            }))
          },
          {
            series: `${prefix} (Máximo)`,
            data: rows.map(row => ({
              label: `${row.hour}h`,
              value: row.max_value
            }))
          },
          {
            series: `${prefix} (Mínimo)`,
            data: rows.map(row => ({
              label: `${row.hour}h`,
              value: row.min_value
            }))
          }
        ];
      }

      // Múltiples días: devolver una serie por cada día
      const result = await this.conn.query(`
        SELECT
          DAYOFWEEK(datetime) as dow,
          EXTRACT(hour FROM datetime) as hour,
          AVG(value) as avg_value
        FROM read_parquet('${url}')
        WHERE DAYOFWEEK(datetime) IN (${weekdays.join(',')}) ${hexFilter}
        GROUP BY dow, hour
        ORDER BY dow, hour
      `);

      const rows = result.toArray();

      // Agrupar por día de la semana
      const seriesMap = {};
      rows.forEach(row => {
        const dayName = this.getDayName(row.dow);
        if (!seriesMap[dayName]) {
          seriesMap[dayName] = [];
        }
        seriesMap[dayName].push({
          label: `${row.hour}h`,
          value: row.avg_value
        });
      });

      return Object.keys(seriesMap).map(dayName => ({
        series: dayName,
        data: seriesMap[dayName]
      }));
    } catch (error) {
      console.error('Error en getHourlyAverages:', error);
      throw error;
    }
  }

  /**
   * Helper: Obtiene el nombre del día de la semana
   */
  getDayName(dow) {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return days[dow] || 'Desconocido';
  }

  /**
   * Análisis: Promedio por estación del año
   */
  async getSeasonalAverages(yearFrom, yearTo) {
    await this.initialize();

    console.log(`📊 Calculando promedios estacionales ${yearFrom}-${yearTo}`);

    const queries = [];
    for (let year = yearFrom; year <= yearTo; year++) {
      for (let month = 1; month <= 12; month++) {
        const url = this.getParquetUrl(year, month);
        queries.push(`SELECT *, ${month} as month FROM read_parquet('${url}')`);
      }
    }

    try {
      const unionQuery = queries.join(' UNION ALL ');
      const result = await this.conn.query(`
        SELECT
          CASE
            WHEN month IN (12, 1, 2) THEN 'Invierno'
            WHEN month IN (3, 4, 5) THEN 'Primavera'
            WHEN month IN (6, 7, 8) THEN 'Verano'
            ELSE 'Otoño'
          END as season,
          AVG(value) as avg_value
        FROM (${unionQuery})
        GROUP BY season
        ORDER BY
          CASE
            WHEN season = 'Primavera' THEN 1
            WHEN season = 'Verano' THEN 2
            WHEN season = 'Otoño' THEN 3
            ELSE 4
          END
      `);

      const rows = result.toArray();
      return rows.map(row => ({
        label: row.season,
        value: row.avg_value
      }));
    } catch (error) {
      console.error('Error en getSeasonalAverages:', error);
      throw error;
    }
  }

  /**
   * Análisis: Promedio por día de la semana para un mes
   */
  async getWeekdayAverages(year, month) {
    await this.initialize();
    const url = this.getParquetUrl(year, month);

    console.log(`📊 Calculando promedios por día de la semana para ${year}-${month}`);

    try {
      const result = await this.conn.query(`
        SELECT
          DAYOFWEEK(datetime) as dow,
          AVG(value) as avg_value
        FROM read_parquet('${url}')
        GROUP BY dow
        ORDER BY dow
      `);

      const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const rows = result.toArray();
      return rows.map(row => ({
        label: days[row.dow],
        value: row.avg_value
      }));
    } catch (error) {
      console.error('Error en getWeekdayAverages:', error);
      throw error;
    }
  }

  /**
   * Análisis: Evolución anual (promedio por año)
   */
  async getYearlyTrend(yearFrom, yearTo) {
    await this.initialize();

    console.log(`📊 Calculando tendencia anual ${yearFrom}-${yearTo}`);

    const queries = [];
    for (let year = yearFrom; year <= yearTo; year++) {
      for (let month = 1; month <= 12; month++) {
        const url = this.getParquetUrl(year, month);
        queries.push(`SELECT *, ${year} as year FROM read_parquet('${url}')`);
      }
    }

    try {
      const unionQuery = queries.join(' UNION ALL ');
      const result = await this.conn.query(`
        SELECT
          year,
          AVG(value) as avg_value
        FROM (${unionQuery})
        GROUP BY year
        ORDER BY year
      `);

      const rows = result.toArray();
      return rows.map(row => ({
        label: row.year.toString(),
        value: row.avg_value
      }));
    } catch (error) {
      console.error('Error en getYearlyTrend:', error);
      throw error;
    }
  }

  /**
   * Ejecuta una query SQL personalizada y retorna los resultados en formato tabla
   * @param {string} sqlQuery - La query SQL a ejecutar
   * @returns {Promise<Array>} - Array de objetos con los resultados
   */
  async executeCustomQuery(sqlQuery) {
    await this.initialize();

    try {
      console.log(`📊 Ejecutando query personalizada...`);
      const result = await this.conn.query(sqlQuery);
      const rows = result.toArray();
      console.log(`✅ Query ejecutada: ${rows.length} filas`);
      return rows;
    } catch (error) {
      console.error('❌ Error ejecutando query:', error);
      throw error;
    }
  }

  // ========== MÉTODOS DE ANÁLISIS ESPACIAL ==========

  /**
   * Análisis Espacial: Top N hexágonos más contaminados
   * @param {number} year - Año a analizar
   * @param {number} month - Mes a analizar
   * @param {number|null} day - Día específico (opcional)
   * @param {number|null} hour - Hora específica (opcional)
   * @param {number} topN - Número de hexágonos a retornar
   * @returns {Promise<{data: Array, sqlQuery: string}>}
   */
  async getSpatialHotspots(year, month, day = null, hour = null, topN = 10) {
    await this.initialize();
    const url = this.getParquetUrl(year, month);

    const dayFilter = day !== null ? `AND EXTRACT(day FROM datetime) = ${day}` : '';
    const hourFilter = hour !== null ? `AND EXTRACT(hour FROM datetime) = ${hour}` : '';

    const sqlQuery = `SELECT
  h3_index,
  AVG(value) as avg_value,
  MAX(value) as max_value,
  MIN(value) as min_value,
  COUNT(*) as count
FROM read_parquet('${url}')
WHERE 1=1 ${dayFilter} ${hourFilter}
GROUP BY h3_index
ORDER BY avg_value DESC
LIMIT ${topN}`;

    console.log(`📊 Calculando hotspots espaciales para ${year}-${month}` +
                (day ? ` día ${day}` : '') +
                (hour !== null ? ` hora ${hour}` : ''));

    try {
      const result = await this.conn.query(sqlQuery);
      const rows = result.toArray();

      return {
        data: rows.map((row, index) => ({
          label: `#${index + 1}`,  // Etiqueta simple y única
          h3_index: row.h3_index,
          value: row.avg_value,
          max_value: row.max_value,
          min_value: row.min_value,
          count: row.count
        })),
        sqlQuery: sqlQuery
      };
    } catch (error) {
      console.error('Error en getSpatialHotspots:', error);
      throw error;
    }
  }

  /**
   * Análisis Espacial: Hexágonos que superan umbral
   * @param {number} year - Año a analizar
   * @param {number} month - Mes a analizar
   * @param {number|null} day - Día específico (opcional)
   * @param {number|null} hour - Hora específica (opcional)
   * @param {number} threshold - Umbral en µg/m³
   * @returns {Promise<{data: Array, sqlQuery: string}>}
   */
  async getSpatialThreshold(year, month, day = null, hour = null, threshold = 80) {
    await this.initialize();
    const url = this.getParquetUrl(year, month);

    const dayFilter = day !== null ? `AND EXTRACT(day FROM datetime) = ${day}` : '';
    const hourFilter = hour !== null ? `AND EXTRACT(hour FROM datetime) = ${hour}` : '';

    const sqlQuery = `SELECT
  h3_index,
  AVG(value) as avg_value,
  MAX(value) as max_value,
  MIN(value) as min_value,
  COUNT(*) as exceedances
FROM read_parquet('${url}')
WHERE 1=1 ${dayFilter} ${hourFilter}
GROUP BY h3_index
HAVING AVG(value) > ${threshold}
ORDER BY avg_value DESC`;

    console.log(`📊 Calculando hexágonos que superan ${threshold} µg/m³ para ${year}-${month}` +
                (day ? ` día ${day}` : '') +
                (hour !== null ? ` hora ${hour}` : ''));

    try {
      const result = await this.conn.query(sqlQuery);
      const rows = result.toArray();

      const mappedData = rows.map((row, index) => ({
        label: `#${index + 1}`,  // Etiqueta simple y única
        h3_index: row.h3_index,
        value: row.avg_value,
        max_value: row.max_value,
        min_value: row.min_value,
        exceedances: row.exceedances
      }));

      console.log('📊 Datos de threshold con min/max:', mappedData.slice(0, 3));

      return {
        data: mappedData,
        sqlQuery: sqlQuery
      };
    } catch (error) {
      console.error('Error en getSpatialThreshold:', error);
      throw error;
    }
  }

  // ========== ANÁLISIS DE EVENTOS EXTREMOS ==========

  /**
   * Encuentra los N días con mayor contaminación promedio
   * @param {number} year - Año a analizar
   * @param {number} month - Mes a analizar
   * @param {number|null} day - Día específico (opcional)
   * @param {number|null} hour - Hora específica (opcional)
   * @param {number} topN - Número de días a devolver (default: 10)
   * @param {string|null} hexId - Hexágono específico (opcional)
   * @returns {Promise<Object>} - { data: Array, sqlQuery: string }
   */
  async getExtremePeakDays(year, month, day = null, hour = null, topN = 10, hexId = null) {
    await this.initialize();
    const url = this.getParquetUrl(year, month);

    const dayFilter = day !== null ? `AND EXTRACT(day FROM datetime) = ${day}` : '';
    const hourFilter = hour !== null ? `AND EXTRACT(hour FROM datetime) = ${hour}` : '';
    const hexFilter = hexId ? `AND h3_index = '${hexId}'` : '';

    const sqlQuery = `SELECT
  EXTRACT(day FROM datetime) as day,
  AVG(value) as avg_value,
  MAX(value) as max_value,
  MIN(value) as min_value,
  COUNT(*) as count
FROM read_parquet('${url}')
WHERE 1=1 ${dayFilter} ${hourFilter} ${hexFilter}
GROUP BY day
ORDER BY avg_value DESC
LIMIT ${topN}`;

    console.log(`📊 Calculando top ${topN} días más contaminados para ${year}-${month}` +
                (day ? ` día ${day}` : '') +
                (hour !== null ? ` hora ${hour}` : '') +
                (hexId ? ` hexágono ${hexId}` : ' (toda la superficie)'));

    try {
      const result = await this.conn.query(sqlQuery);
      const rows = result.toArray();

      return {
        data: rows.map((row, index) => ({
          label: `Día ${row.day}`,
          day: row.day,
          value: row.avg_value,
          max_value: row.max_value,
          min_value: row.min_value,
          count: row.count
        })),
        sqlQuery: sqlQuery
      };
    } catch (error) {
      console.error('Error en getExtremePeakDays:', error);
      throw error;
    }
  }

  /**
   * Encuentra episodios de días consecutivos que superan un umbral
   * @param {number} year - Año a analizar
   * @param {number} month - Mes a analizar
   * @param {number} threshold - Umbral de NO₂ (µg/m³)
   * @param {number} consecutiveDays - Número mínimo de días consecutivos
   * @param {string|null} hexId - Hexágono específico (opcional)
   * @returns {Promise<Object>} - { data: Array, sqlQuery: string }
   */
  async getExtremeConsecutiveDays(year, month, threshold, consecutiveDays = 3, hexId = null) {
    await this.initialize();
    const url = this.getParquetUrl(year, month);

    const hexFilter = hexId ? `AND h3_index = '${hexId}'` : '';

    // Query que agrupa por día y luego identifica episodios consecutivos
    const sqlQuery = `WITH daily_avg AS (
  SELECT
    EXTRACT(day FROM datetime) as day,
    AVG(value) as avg_value,
    MAX(value) as max_value,
    MIN(value) as min_value
  FROM read_parquet('${url}')
  WHERE 1=1 ${hexFilter}
  GROUP BY day
  HAVING AVG(value) > ${threshold}
  ORDER BY day
)
SELECT
  day,
  avg_value,
  max_value,
  min_value,
  day - ROW_NUMBER() OVER (ORDER BY day) as grp
FROM daily_avg`;

    console.log(`📊 Buscando episodios de ${consecutiveDays}+ días consecutivos > ${threshold} µg/m³ en ${year}-${month}` +
                (hexId ? ` hexágono ${hexId}` : ' (toda la superficie)'));

    try {
      const result = await this.conn.query(sqlQuery);
      const rows = result.toArray();

      // Agrupar días consecutivos
      const episodes = {};
      rows.forEach(row => {
        const grp = row.grp;
        if (!episodes[grp]) {
          episodes[grp] = [];
        }
        episodes[grp].push(row);
      });

      // Filtrar solo episodios con el número mínimo de días consecutivos
      const filteredEpisodes = Object.values(episodes)
        .filter(ep => ep.length >= consecutiveDays)
        .map((ep, idx) => ({
          label: `Episodio ${idx + 1} (${ep.length}d)`,
          episode_number: idx + 1,
          start_day: ep[0].day,
          end_day: ep[ep.length - 1].day,
          duration: ep.length,
          value: ep.reduce((sum, d) => sum + d.avg_value, 0) / ep.length, // promedio del episodio
          max_value: Math.max(...ep.map(d => d.max_value)),
          min_value: Math.min(...ep.map(d => d.min_value))
        }));

      return {
        data: filteredEpisodes,
        sqlQuery: sqlQuery
      };
    } catch (error) {
      console.error('Error en getExtremeConsecutiveDays:', error);
      throw error;
    }
  }

  /**
   * Encuentra días que superan un percentil específico
   * @param {number} year - Año a analizar
   * @param {number} month - Mes a analizar
   * @param {number|null} day - Día específico (opcional)
   * @param {number|null} hour - Hora específica (opcional)
   * @param {number} percentile - Percentil a calcular (90, 95, 99)
   * @param {string|null} hexId - Hexágono específico (opcional)
   * @returns {Promise<Object>} - { data: Array, sqlQuery: string }
   */
  async getExtremePercentile(year, month, day = null, hour = null, percentile = 95, hexId = null) {
    await this.initialize();
    const url = this.getParquetUrl(year, month);

    const dayFilter = day !== null ? `AND EXTRACT(day FROM datetime) = ${day}` : '';
    const hourFilter = hour !== null ? `AND EXTRACT(hour FROM datetime) = ${hour}` : '';
    const hexFilter = hexId ? `AND h3_index = '${hexId}'` : '';

    const sqlQuery = `WITH daily_stats AS (
  SELECT
    EXTRACT(day FROM datetime) as day,
    AVG(value) as avg_value,
    MAX(value) as max_value,
    MIN(value) as min_value,
    COUNT(*) as count
  FROM read_parquet('${url}')
  WHERE 1=1 ${dayFilter} ${hourFilter} ${hexFilter}
  GROUP BY day
),
percentile_threshold AS (
  SELECT PERCENTILE_CONT(${percentile / 100.0}) WITHIN GROUP (ORDER BY avg_value) as p_value
  FROM daily_stats
)
SELECT
  ds.day,
  ds.avg_value,
  ds.max_value,
  ds.min_value,
  ds.count,
  pt.p_value as percentile_threshold
FROM daily_stats ds
CROSS JOIN percentile_threshold pt
WHERE ds.avg_value >= pt.p_value
ORDER BY ds.avg_value DESC`;

    console.log(`📊 Calculando días que superan percentil ${percentile} en ${year}-${month}` +
                (day ? ` día ${day}` : '') +
                (hour !== null ? ` hora ${hour}` : '') +
                (hexId ? ` hexágono ${hexId}` : ' (toda la superficie)'));

    try {
      const result = await this.conn.query(sqlQuery);
      const rows = result.toArray();

      return {
        data: rows.map((row, index) => ({
          label: `Día ${row.day}`,
          day: row.day,
          value: row.avg_value,
          max_value: row.max_value,
          min_value: row.min_value,
          count: row.count,
          percentile_threshold: row.percentile_threshold
        })),
        sqlQuery: sqlQuery
      };
    } catch (error) {
      console.error('Error en getExtremePercentile:', error);
      throw error;
    }
  }

  /**
   * Encuentra días donde se superó el umbral durante N horas consecutivas
   * @param {number} year - Año a analizar
   * @param {number} month - Mes a analizar
   * @param {number} threshold - Umbral de NO₂ (µg/m³)
   * @param {number} consecutiveHours - Número mínimo de horas consecutivas
   * @param {string|null} hexId - Hexágono específico (opcional)
   * @returns {Promise<Object>} - { data: Array, sqlQuery: string }
   */
  async getExtremeDuration(year, month, threshold, consecutiveHours = 8, hexId = null) {
    await this.initialize();
    const url = this.getParquetUrl(year, month);

    const hexFilter = hexId ? `AND h3_index = '${hexId}'` : '';

    // Query que cuenta horas consecutivas por encima del umbral para cada día
    const sqlQuery = `WITH hourly_data AS (
  SELECT
    EXTRACT(day FROM datetime) as day,
    EXTRACT(hour FROM datetime) as hour,
    AVG(value) as avg_value
  FROM read_parquet('${url}')
  WHERE 1=1 ${hexFilter}
  GROUP BY day, hour
  HAVING AVG(value) > ${threshold}
  ORDER BY day, hour
),
consecutive_count AS (
  SELECT
    day,
    hour,
    avg_value,
    hour - ROW_NUMBER() OVER (PARTITION BY day ORDER BY hour) as grp
  FROM hourly_data
),
daily_episodes AS (
  SELECT
    day,
    COUNT(*) as consecutive_hours,
    AVG(avg_value) as avg_value,
    MAX(avg_value) as max_value,
    MIN(avg_value) as min_value
  FROM consecutive_count
  GROUP BY day, grp
  HAVING COUNT(*) >= ${consecutiveHours}
)
SELECT
  day,
  MAX(consecutive_hours) as max_consecutive_hours,
  AVG(avg_value) as avg_value,
  MAX(max_value) as max_value,
  MIN(min_value) as min_value
FROM daily_episodes
GROUP BY day
ORDER BY max_consecutive_hours DESC, avg_value DESC`;

    console.log(`📊 Buscando días con ${consecutiveHours}+ horas consecutivas > ${threshold} µg/m³ en ${year}-${month}` +
                (hexId ? ` hexágono ${hexId}` : ' (toda la superficie)'));

    try {
      const result = await this.conn.query(sqlQuery);
      const rows = result.toArray();

      return {
        data: rows.map((row, index) => ({
          label: `Día ${row.day}`,
          day: row.day,
          value: row.avg_value,
          max_value: row.max_value,
          min_value: row.min_value,
          consecutive_hours: row.max_consecutive_hours
        })),
        sqlQuery: sqlQuery
      };
    } catch (error) {
      console.error('Error en getExtremeDuration:', error);
      throw error;
    }
  }

  // ========== FIN ANÁLISIS DE EVENTOS EXTREMOS ==========

  // ========== ANÁLISIS COMPARATIVOS ==========

  /**
   * Compara el patrón horario (24h) de dos años diferentes
   * @param {number} year1 - Primer año a comparar
   * @param {number} year2 - Segundo año a comparar
   * @param {number} month - Mes a analizar
   * @param {number|null} day - Día específico (opcional, si null promedia todo el mes)
   * @param {string|null} hexId - Hexágono específico (opcional)
   * @returns {Promise<Object>} - { data: Array, sqlQuery: string }
   */
  async getComparativeHourly(year1, year2, month, day = null, hexId = null) {
    await this.initialize();

    const url1 = this.getParquetUrl(year1, month);
    const url2 = this.getParquetUrl(year2, month);

    const dayFilter = day !== null ? `AND EXTRACT(day FROM datetime) = ${day}` : '';
    const hexFilter = hexId ? `AND h3_index = '${hexId}'` : '';

    // Query para obtener datos de ambos años en una sola consulta
    const sqlQuery = `WITH year1_data AS (
  SELECT
    EXTRACT(hour FROM datetime) as hour,
    AVG(value) as avg_value,
    MAX(value) as max_value,
    MIN(value) as min_value
  FROM read_parquet('${url1}')
  WHERE 1=1 ${dayFilter} ${hexFilter}
  GROUP BY hour
  ORDER BY hour
),
year2_data AS (
  SELECT
    EXTRACT(hour FROM datetime) as hour,
    AVG(value) as avg_value,
    MAX(value) as max_value,
    MIN(value) as min_value
  FROM read_parquet('${url2}')
  WHERE 1=1 ${dayFilter} ${hexFilter}
  GROUP BY hour
  ORDER BY hour
)
SELECT
  COALESCE(y1.hour, y2.hour) as hour,
  y1.avg_value as year1_avg,
  y1.max_value as year1_max,
  y1.min_value as year1_min,
  y2.avg_value as year2_avg,
  y2.max_value as year2_max,
  y2.min_value as year2_min
FROM year1_data y1
FULL OUTER JOIN year2_data y2 ON y1.hour = y2.hour
ORDER BY hour`;

    console.log(`📊 Comparando ${year1} vs ${year2} para ${month}` +
                (day ? ` día ${day}` : ' (todo el mes)') +
                (hexId ? ` hexágono ${hexId}` : ' (toda la superficie)'));

    try {
      const result = await this.conn.query(sqlQuery);
      const rows = result.toArray();

      // Transformar los datos al formato esperado por renderLineChartWithTooltip
      // Formato: [ { series: 'Año X', data: [{label, value}, ...] }, ... ]
      const year1Data = rows.map(row => ({
        label: `${String(row.hour).padStart(2, '0')}:00`,
        value: row.year1_avg || 0
      }));

      const year2Data = rows.map(row => ({
        label: `${String(row.hour).padStart(2, '0')}:00`,
        value: row.year2_avg || 0
      }));

      const data = [
        { series: `Año ${year1}`, data: year1Data },
        { series: `Año ${year2}`, data: year2Data }
      ];

      console.log('📊 Datos comparativos (formato series):', {
        year1: year1Data.slice(0, 3),
        year2: year2Data.slice(0, 3)
      });

      return {
        data: data,
        sqlQuery: sqlQuery
      };
    } catch (error) {
      console.error('Error en getComparativeHourly:', error);
      throw error;
    }
  }

  // ========== FIN ANÁLISIS COMPARATIVOS ==========

  // ========== ESTADÍSTICAS ==========

  /**
   * Calcula estadísticas descriptivas completas de un periodo
   * @param {number} year - Año a analizar
   * @param {number} month - Mes a analizar
   * @param {number|null} day - Día específico (opcional)
   * @param {string|null} hexId - Hexágono específico (opcional)
   * @returns {Promise<Object>} - { data: Array, sqlQuery: string }
   */
  async getStatisticsSummary(year, month, day = null, hexId = null) {
    await this.initialize();
    const url = this.getParquetUrl(year, month);

    const dayFilter = day !== null ? `AND EXTRACT(day FROM datetime) = ${day}` : '';
    const hexFilter = hexId ? `AND h3_index = '${hexId}'` : '';

    const sqlQuery = `SELECT
  COUNT(*) as total_registros,
  AVG(value) as media,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY value) as mediana,
  STDDEV(value) as desviacion_estandar,
  VARIANCE(value) as varianza,
  MIN(value) as minimo,
  MAX(value) as maximo,
  MAX(value) - MIN(value) as rango,
  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY value) as p25,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY value) as p50,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY value) as p75,
  PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY value) as p90,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) as p95,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY value) as p99
FROM read_parquet('${url}')
WHERE 1=1 ${dayFilter} ${hexFilter}`;

    console.log(`📊 Calculando resumen estadístico para ${year}-${month}` +
                (day ? ` día ${day}` : '') +
                (hexId ? ` hexágono ${hexId}` : ' (toda la superficie)'));

    try {
      const result = await this.conn.query(sqlQuery);
      const row = result.toArray()[0];

      // Formatear los datos como array de objetos {label, value} para mostrar en tabla
      const data = [
        { label: 'Total de registros', value: row.total_registros.toLocaleString() },
        { label: 'Media', value: `${row.media.toFixed(2)} µg/m³` },
        { label: 'Mediana', value: `${row.mediana.toFixed(2)} µg/m³` },
        { label: 'Desviación estándar', value: `${row.desviacion_estandar.toFixed(2)} µg/m³` },
        { label: 'Varianza', value: `${row.varianza.toFixed(2)}` },
        { label: 'Mínimo', value: `${row.minimo.toFixed(2)} µg/m³` },
        { label: 'Máximo', value: `${row.maximo.toFixed(2)} µg/m³` },
        { label: 'Rango', value: `${row.rango.toFixed(2)} µg/m³` },
        { label: 'Percentil 25 (P25)', value: `${row.p25.toFixed(2)} µg/m³` },
        { label: 'Percentil 50 (P50/Mediana)', value: `${row.p50.toFixed(2)} µg/m³` },
        { label: 'Percentil 75 (P75)', value: `${row.p75.toFixed(2)} µg/m³` },
        { label: 'Percentil 90 (P90)', value: `${row.p90.toFixed(2)} µg/m³` },
        { label: 'Percentil 95 (P95)', value: `${row.p95.toFixed(2)} µg/m³` },
        { label: 'Percentil 99 (P99)', value: `${row.p99.toFixed(2)} µg/m³` }
      ];

      console.log('📊 Resumen estadístico:', row);

      return {
        data: data,
        sqlQuery: sqlQuery,
        rawData: row // Guardamos también los datos crudos por si se necesitan
      };
    } catch (error) {
      console.error('Error en getStatisticsSummary:', error);
      throw error;
    }
  }

  /**
   * Evalúa el cumplimiento de límites normativos de la UE
   * @param {number} year - Año a analizar
   * @param {number} month - Mes a analizar
   * @param {number|null} day - Día específico (opcional)
   * @param {string|null} hexId - Hexágono específico (opcional)
   * @returns {Promise<Object>} - { data: Array, sqlQuery: string }
   */
  async getStatisticsCompliance(year, month, day = null, hexId = null) {
    await this.initialize();
    const url = this.getParquetUrl(year, month);

    const dayFilter = day !== null ? `AND EXTRACT(day FROM datetime) = ${day}` : '';
    const hexFilter = hexId ? `AND h3_index = '${hexId}'` : '';

    const sqlQuery = `WITH stats AS (
  SELECT
    COUNT(*) as total,
    SUM(CASE WHEN value <= 40 THEN 1 ELSE 0 END) as cumple_40,
    SUM(CASE WHEN value > 40 AND value <= 200 THEN 1 ELSE 0 END) as entre_40_200,
    SUM(CASE WHEN value > 200 THEN 1 ELSE 0 END) as supera_200,
    AVG(value) as promedio
  FROM read_parquet('${url}')
  WHERE 1=1 ${dayFilter} ${hexFilter}
)
SELECT
  cumple_40,
  entre_40_200,
  supera_200,
  total,
  promedio,
  CAST(cumple_40 AS DOUBLE) / total * 100 as pct_cumple_40,
  CAST(entre_40_200 AS DOUBLE) / total * 100 as pct_entre_40_200,
  CAST(supera_200 AS DOUBLE) / total * 100 as pct_supera_200
FROM stats`;

    console.log(`📊 Calculando cumplimiento normativo para ${year}-${month}` +
                (day ? ` día ${day}` : '') +
                (hexId ? ` hexágono ${hexId}` : ' (toda la superficie)'));

    try {
      const result = await this.conn.query(sqlQuery);
      const row = result.toArray()[0];

      // Formatear como datos para gráfico de barras
      const data = [
        {
          label: '≤ 40 µg/m³\n(Cumple)',
          value: row.pct_cumple_40,
          count: row.cumple_40,
          color: '#10b981' // verde
        },
        {
          label: '40-200 µg/m³\n(Aceptable)',
          value: row.pct_entre_40_200,
          count: row.entre_40_200,
          color: '#f59e0b' // naranja
        },
        {
          label: '> 200 µg/m³\n(Alerta)',
          value: row.pct_supera_200,
          count: row.supera_200,
          color: '#ef4444' // rojo
        }
      ];

      console.log('📊 Cumplimiento normativo:', {
        cumple: `${row.pct_cumple_40.toFixed(2)}%`,
        aceptable: `${row.pct_entre_40_200.toFixed(2)}%`,
        alerta: `${row.pct_supera_200.toFixed(2)}%`
      });

      return {
        data: data,
        sqlQuery: sqlQuery,
        summary: {
          total: row.total,
          promedio: row.promedio,
          cumple_40: row.cumple_40,
          entre_40_200: row.entre_40_200,
          supera_200: row.supera_200
        }
      };
    } catch (error) {
      console.error('Error en getStatisticsCompliance:', error);
      throw error;
    }
  }

  // ========== FIN ESTADÍSTICAS ==========

  /**
   * Obtiene todos los datos espaciales agregados para el mapa
   * @param {number} year - Año a analizar
   * @param {number} month - Mes a analizar
   * @param {number|null} day - Día específico (opcional)
   * @param {number|null} hour - Hora específica (opcional)
   * @returns {Promise<Array>} - Array con datos en formato deck.gl: [{ h3, coordinates, value, prevValue }]
   */
  async getSpatialMapData(year, month, day = null, hour = null) {
    await this.initialize();
    const url = this.getParquetUrl(year, month);

    const dayFilter = day !== null ? `AND EXTRACT(day FROM datetime) = ${day}` : '';
    const hourFilter = hour !== null ? `AND EXTRACT(hour FROM datetime) = ${hour}` : '';

    const sqlQuery = `SELECT
  h3_index,
  AVG(value) as avg_value
FROM read_parquet('${url}')
WHERE 1=1 ${dayFilter} ${hourFilter}
GROUP BY h3_index`;

    console.log(`🗺️ Cargando datos del mapa para ${year}-${String(month).padStart(2, '0')}` +
                (day ? ` día ${day}` : '') +
                (hour !== null ? ` hora ${hour}` : ''));

    try {
      const result = await this.conn.query(sqlQuery);
      const rows = result.toArray();

      // Convertir a formato deck.gl
      const features = rows.map(row => {
        // Calcular coordenadas del hexágono si no las tenemos cacheadas
        const coords = cellToLatLng(row.h3_index);

        return {
          h3: row.h3_index,
          coordinates: [coords[1], coords[0]], // [lon, lat]
          value: row.avg_value,
          prevValue: 0, // No hay valor previo en análisis espacial
        };
      });

      console.log(`✅ ${features.length} hexágonos cargados para el mapa`);
      return features;
    } catch (error) {
      console.error('Error en getSpatialMapData:', error);
      throw error;
    }
  }

  /**
   * Construye la query SQL para un análisis horario
   * @returns {string} - La query SQL
   */
  buildHourlyQuery(year, month, weekdays = [], hexId = null) {
    const daysFilter = weekdays.length > 0
      ? `AND DAYOFWEEK(datetime) IN (${weekdays.join(',')})`
      : '';

    const hexFilter = hexId
      ? `AND h3_index = '${hexId}'`
      : '';

    // Si month es null, procesar todo el año
    if (month === null) {
      // Construir UNION de todos los meses del año
      const queries = [];
      for (let m = 1; m <= 12; m++) {
        const url = this.getParquetUrl(year, m);
        queries.push(`SELECT h3_index, datetime, value FROM read_parquet('${url}')`);
      }
      const unionQuery = queries.join(' UNION ALL ');

      // Si no hay filtro de días o solo hay un día
      if (weekdays.length === 0 || weekdays.length === 1) {
        return `SELECT
  EXTRACT(hour FROM datetime) as hour,
  AVG(value) as avg_value,
  MAX(value) as max_value,
  MIN(value) as min_value
FROM (${unionQuery})
WHERE 1=1 ${daysFilter} ${hexFilter}
GROUP BY hour
ORDER BY hour`;
      } else {
        // Múltiples días
        return `SELECT
  DAYOFWEEK(datetime) as dow,
  EXTRACT(hour FROM datetime) as hour,
  AVG(value) as avg_value
FROM (${unionQuery})
WHERE DAYOFWEEK(datetime) IN (${weekdays.join(',')}) ${hexFilter}
GROUP BY dow, hour
ORDER BY dow, hour`;
      }
    } else {
      // Análisis para un mes específico
      const url = this.getParquetUrl(year, month);

      if (weekdays.length === 0 || weekdays.length === 1) {
        return `SELECT
  EXTRACT(hour FROM datetime) as hour,
  AVG(value) as avg_value,
  MAX(value) as max_value,
  MIN(value) as min_value
FROM read_parquet('${url}')
WHERE 1=1 ${daysFilter} ${hexFilter}
GROUP BY hour
ORDER BY hour`;
      } else {
        return `SELECT
  DAYOFWEEK(datetime) as dow,
  EXTRACT(hour FROM datetime) as hour,
  AVG(value) as avg_value
FROM read_parquet('${url}')
WHERE DAYOFWEEK(datetime) IN (${weekdays.join(',')}) ${hexFilter}
GROUP BY dow, hour
ORDER BY dow, hour`;
      }
    }
  }

  /**
   * Obtiene la instancia singleton del manager
   */
  static getInstance(baseUrl) {
    if (!ParquetDataManager.instance) {
      if (!baseUrl) {
        throw new Error('Se requiere baseUrl para la primera inicialización');
      }
      ParquetDataManager.instance = new ParquetDataManager(baseUrl);
    }
    return ParquetDataManager.instance;
  }
}

// Singleton global (mantener por compatibilidad)
let globalManager = null;

export function getParquetDataManager(baseUrl) {
  if (!globalManager) {
    globalManager = new ParquetDataManager(baseUrl);
  }
  return globalManager;
}

export default ParquetDataManager;
