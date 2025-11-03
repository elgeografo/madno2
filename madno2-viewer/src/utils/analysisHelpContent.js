// Contenido de ayuda para cada tipo de análisis temporal

export const ANALYSIS_HELP = {
  hourly: {
    title: 'Análisis de Horas Pico',
    description: 'Este análisis calcula el promedio, máximo y mínimo de concentración de NO₂ para cada hora del día (0-23 horas). Puedes analizar un mes específico o todo el año. Si no seleccionas días específicos, se mostrarán tres curvas (promedio, máximo, mínimo). Si seleccionas múltiples días de la semana, solo se mostrará el promedio de cada día para evitar saturar el gráfico. Permite identificar las horas con mayor contaminación, típicamente las horas de tráfico intenso (8-9 AM y 6-7 PM).',
    sqlQuery: `-- Para un mes específico (con AVG, MAX, MIN):
SELECT
  EXTRACT(hour FROM datetime) as hour,
  AVG(value) as avg_value,
  MAX(value) as max_value,
  MIN(value) as min_value
FROM read_parquet('url_del_mes')
GROUP BY hour
ORDER BY hour

-- Para todo el año (con AVG, MAX, MIN):
SELECT
  EXTRACT(hour FROM datetime) as hour,
  AVG(value) as avg_value,
  MAX(value) as max_value,
  MIN(value) as min_value
FROM (
  SELECT datetime, value FROM read_parquet('año/mes=01/**')
  UNION ALL
  SELECT datetime, value FROM read_parquet('año/mes=02/**')
  -- ... hasta mes=12
)
GROUP BY hour
ORDER BY hour

-- Con múltiples días (solo promedio):
SELECT
  DAYOFWEEK(datetime) as dow,
  EXTRACT(hour FROM datetime) as hour,
  AVG(value) as avg_value
FROM read_parquet('url')
WHERE DAYOFWEEK(datetime) IN (1, 0) -- Lun, Dom
GROUP BY dow, hour
ORDER BY dow, hour`,
    example: 'Si seleccionas el año 2001 completo sin filtrar días, verás tres curvas: el promedio mostrará picos a las 8:00 y 19:00, el máximo mostrará los valores extremos registrados en esas horas, y el mínimo mostrará la variabilidad (útil para identificar si hay días con contaminación muy baja). Si seleccionas "Lunes" y "Domingo", verás dos curvas de promedio comparando ambos días.'
  },

  seasonal: {
    title: 'Análisis Estacional',
    description: 'Agrupa todos los datos por estaciones del año (Primavera: Mar-May, Verano: Jun-Ago, Otoño: Sep-Nov, Invierno: Dic-Feb) y calcula el promedio de NO₂ para cada estación. Útil para identificar patrones climáticos y de consumo energético.',
    sqlQuery: `SELECT
  CASE
    WHEN month IN (12, 1, 2) THEN 'Invierno'
    WHEN month IN (3, 4, 5) THEN 'Primavera'
    WHEN month IN (6, 7, 8) THEN 'Verano'
    ELSE 'Otoño'
  END as season,
  AVG(value) as avg_value
FROM (
  SELECT *, month FROM read_parquet('urls_múltiples')
)
GROUP BY season`,
    example: 'Analizando 2001-2010, normalmente verás que el invierno tiene mayores niveles de NO₂ debido al uso de calefacción y las inversiones térmicas que atrapan contaminantes.'
  },

  weekday: {
    title: 'Análisis por Día de la Semana',
    description: 'Calcula el promedio de NO₂ para cada día de la semana (Lunes a Domingo) en un mes específico. Revela diferencias entre días laborables (mayor tráfico vehicular) y fines de semana (menor actividad).',
    sqlQuery: `SELECT
  DAYOFWEEK(datetime) as dow,
  AVG(value) as avg_value
FROM read_parquet('url_del_mes')
GROUP BY dow
ORDER BY dow`,
    example: 'En enero de 2001, el gráfico típicamente mostrará valores más altos de lunes a viernes (actividad laboral) y valores notablemente más bajos en sábado y domingo.'
  },

  yearly: {
    title: 'Evolución Anual',
    description: 'Muestra la tendencia de los niveles promedio de NO₂ año tras año en un rango temporal seleccionado. Permite evaluar el impacto de políticas ambientales, cambios en el tráfico o eventos específicos (como Madrid Central en 2018 o el COVID-19 en 2020).',
    sqlQuery: `SELECT
  year,
  AVG(value) as avg_value
FROM (
  SELECT *, year FROM read_parquet('urls_múltiples')
)
GROUP BY year
ORDER BY year`,
    example: 'Comparando 2001-2010, podrías observar una tendencia decreciente debido a regulaciones más estrictas de emisiones vehiculares y mejoras tecnológicas en motores.'
  },

  // ========== ANÁLISIS ESPACIAL ==========

  hotspots: {
    title: 'Hotspots - Zonas más contaminadas',
    description: 'Identifica las N zonas (hexágonos H3) con las concentraciones promedio más altas de NO₂ en un periodo específico. Este análisis agrupa todos los valores de cada hexágono y calcula estadísticas (promedio, máximo, mínimo) para identificar los puntos críticos de contaminación. Útil para focalizar medidas de mejora de calidad del aire en las zonas más afectadas.',
    sqlQuery: `SELECT
  h3_index,
  AVG(value) as avg_value,
  MAX(value) as max_value,
  MIN(value) as min_value,
  COUNT(*) as count
FROM read_parquet('year=2001/month=01/data.parquet')
-- Filtros opcionales:
-- WHERE EXTRACT(day FROM datetime) = 15
-- AND EXTRACT(hour FROM datetime) = 8
GROUP BY h3_index
ORDER BY avg_value DESC
LIMIT 10`,
    example: 'Si analizas enero de 2001 a las 8:00 AM (hora pico de tráfico), los resultados mostrarán los 10 hexágonos más contaminados, típicamente localizados en avenidas principales como M-30, Gran Vía o Paseo de la Castellana. El gráfico de barras permite comparar visualmente la intensidad entre estas zonas, y los hexágonos se resaltan en naranja en el mapa para una identificación espacial inmediata.'
  },

  threshold: {
    title: 'Superar Umbral - Zonas por encima del límite',
    description: 'Encuentra todos los hexágonos que superan un umbral específico de concentración de NO₂. Este análisis es fundamental para cumplimiento normativo y salud pública. La Unión Europea establece 40 µg/m³ como límite anual y 200 µg/m³ como umbral de alerta horaria. Permite identificar rápidamente todas las áreas que exceden estos límites legales.',
    sqlQuery: `SELECT
  h3_index,
  AVG(value) as avg_value,
  MAX(value) as max_value,
  COUNT(*) as exceedances
FROM read_parquet('year=2001/month=01/data.parquet')
-- Filtros opcionales:
-- WHERE EXTRACT(day FROM datetime) = 15
-- AND EXTRACT(hour FROM datetime) = 19
GROUP BY h3_index
HAVING AVG(value) > 80
ORDER BY avg_value DESC`,
    example: 'Si estableces un umbral de 80 µg/m³ para enero de 2001 a las 19:00 (hora pico vespertina), el análisis devolverá todas las zonas que superan este límite. Por ejemplo, podrías encontrar 25 hexágonos en violación, concentrados principalmente en el centro urbano y ejes viarios principales. El número de excedencias (count) te indica cuántas mediciones de ese hexágono superaron el umbral, ayudando a identificar si es un problema puntual o persistente.'
  },

  // ========== ANÁLISIS DE EVENTOS EXTREMOS ==========

  peak_days: {
    title: 'Días con Mayor Contaminación',
    description: 'Identifica los N días con las concentraciones promedio más altas de NO₂ en un periodo determinado. Este análisis es crucial para identificar días críticos de contaminación que pueden requerir activación de protocolos anti-contaminación. Puede aplicarse a toda la superficie de Madrid o a un hexágono específico si seleccionas uno en el mapa.',
    sqlQuery: `SELECT
  EXTRACT(day FROM datetime) as day,
  AVG(value) as avg_value,
  MAX(value) as max_value,
  MIN(value) as min_value,
  COUNT(*) as count
FROM read_parquet('year=2001/month=01/data.parquet')
-- Filtros opcionales:
-- WHERE EXTRACT(hour FROM datetime) = 8
-- AND h3_index = '89390ca0083ffff'
GROUP BY day
ORDER BY avg_value DESC
LIMIT 10`,
    example: 'Si analizas enero de 2001 a las 8:00 AM (hora pico matutina), el análisis mostrará los 10 días con mayor contaminación. Por ejemplo, podrías encontrar que los días 15, 18 y 22 tuvieron los mayores niveles, probablemente debido a condiciones meteorológicas adversas (inversión térmica) que atrapan contaminantes cerca del suelo. El gráfico muestra barras de promedio con líneas de máximos y mínimos para ver la variabilidad.'
  },

  consecutive_days: {
    title: 'Episodios Consecutivos',
    description: 'Encuentra periodos de días consecutivos donde el promedio de NO₂ superó un umbral específico. Este análisis es fundamental para identificar episodios de contaminación prolongada que tienen mayor impacto en la salud pública. Los episodios de varios días consecutivos son especialmente preocupantes según la normativa de calidad del aire.',
    sqlQuery: `WITH daily_avg AS (
  SELECT
    EXTRACT(day FROM datetime) as day,
    AVG(value) as avg_value,
    MAX(value) as max_value,
    MIN(value) as min_value
  FROM read_parquet('year=2001/month=01/data.parquet')
  -- WHERE h3_index = '89390ca0083ffff'
  GROUP BY day
  HAVING AVG(value) > 80
  ORDER BY day
)
SELECT
  day,
  avg_value,
  max_value,
  min_value,
  day - ROW_NUMBER() OVER (ORDER BY day) as grp
FROM daily_avg`,
    example: 'Si buscas episodios de 3+ días consecutivos que superaron 80 µg/m³ en enero de 2001, podrías encontrar 2 episodios: Episodio 1 del 5 al 8 de enero (4 días) con promedio de 95 µg/m³, y Episodio 2 del 20 al 22 (3 días) con promedio de 88 µg/m³. Estos episodios prolongados son los que más preocupan a las autoridades sanitarias.'
  },

  percentile: {
    title: 'Análisis de Percentiles',
    description: 'Identifica días que superan un percentil específico (P90, P95, P99) de la distribución de valores. Este análisis estadístico permite identificar eventos extremos basándose en la distribución histórica de datos, en lugar de usar umbrales fijos. Es útil para detectar días anómalos comparados con el comportamiento típico del periodo.',
    sqlQuery: `WITH daily_stats AS (
  SELECT
    EXTRACT(day FROM datetime) as day,
    AVG(value) as avg_value,
    MAX(value) as max_value,
    MIN(value) as min_value,
    COUNT(*) as count
  FROM read_parquet('year=2001/month=01/data.parquet')
  -- WHERE h3_index = '89390ca0083ffff'
  GROUP BY day
),
percentile_threshold AS (
  SELECT PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY avg_value) as p_value
  FROM daily_stats
)
SELECT
  ds.day,
  ds.avg_value,
  ds.max_value,
  ds.min_value,
  pt.p_value as percentile_threshold
FROM daily_stats ds
CROSS JOIN percentile_threshold pt
WHERE ds.avg_value >= pt.p_value
ORDER BY ds.avg_value DESC`,
    example: 'Si calculas el percentil 95 para enero de 2001, encontrarás los días que están en el 5% superior de contaminación del mes. Por ejemplo, si el P95 es 85 µg/m³, verás solo los días que superaron ese valor. Esto te muestra los días verdaderamente excepcionales del mes, independientemente de umbrales normativos fijos.'
  },

  duration: {
    title: 'Duración de Eventos',
    description: 'Encuentra días donde se superó un umbral de NO₂ durante un número mínimo de horas consecutivas. Este análisis es crítico para cumplimiento normativo, ya que la UE establece que no se debe superar 200 µg/m³ durante más de 18 horas al año. Identifica días con exposición prolongada a niveles elevados de contaminación.',
    sqlQuery: `WITH hourly_data AS (
  SELECT
    EXTRACT(day FROM datetime) as day,
    EXTRACT(hour FROM datetime) as hour,
    AVG(value) as avg_value
  FROM read_parquet('year=2001/month=01/data.parquet')
  -- WHERE h3_index = '89390ca0083ffff'
  GROUP BY day, hour
  HAVING AVG(value) > 80
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
  HAVING COUNT(*) >= 8
)
SELECT
  day,
  MAX(consecutive_hours) as max_consecutive_hours,
  AVG(avg_value) as avg_value,
  MAX(max_value) as max_value,
  MIN(min_value) as min_value
FROM daily_episodes
GROUP BY day
ORDER BY max_consecutive_hours DESC`,
    example: 'Si buscas días con 8+ horas consecutivas por encima de 80 µg/m³ en enero de 2001, podrías encontrar 5 días críticos. Por ejemplo, el día 15 tuvo 12 horas consecutivas superando el umbral, desde las 7:00 hasta las 19:00, indicando un día completo de alta contaminación sin respiro. Estos días requieren atención especial y posible activación de protocolos.'
  },

  // ========== ANÁLISIS COMPARATIVOS ==========

  comparative_years: {
    title: 'Comparación entre Años',
    description: 'Compara el patrón horario (24 horas) de NO₂ entre dos años diferentes para el mismo mes y día. Este análisis es fundamental para evaluar la evolución temporal de la contaminación y el impacto de políticas ambientales. Permite comparar cualquier año desde 2001 hasta la actualidad, identificando mejoras o empeoramientos en la calidad del aire. Puedes analizar toda la superficie de Madrid o limitarlo a un hexágono específico.',
    sqlQuery: `WITH year1_data AS (
  SELECT
    EXTRACT(hour FROM datetime) as hour,
    AVG(value) as avg_value,
    MAX(value) as max_value,
    MIN(value) as min_value
  FROM read_parquet('year=2001/month=01/data.parquet')
  -- WHERE EXTRACT(day FROM datetime) = 15
  -- AND h3_index = '89390ca0083ffff'
  GROUP BY hour
  ORDER BY hour
),
year2_data AS (
  SELECT
    EXTRACT(hour FROM datetime) as hour,
    AVG(value) as avg_value,
    MAX(value) as max_value,
    MIN(value) as min_value
  FROM read_parquet('year=2020/month=01/data.parquet')
  -- WHERE EXTRACT(day FROM datetime) = 15
  -- AND h3_index = '89390ca0083ffff'
  GROUP BY hour
  ORDER BY hour
)
SELECT
  COALESCE(y1.hour, y2.hour) as hour,
  y1.avg_value as year1_avg,
  y2.avg_value as year2_avg
FROM year1_data y1
FULL OUTER JOIN year2_data y2 ON y1.hour = y2.hour
ORDER BY hour`,
    example: 'Si comparas enero de 2001 vs enero de 2020 (sin seleccionar día específico), el gráfico mostrará dos líneas representando el promedio horario de todo el mes para cada año. Por ejemplo, podrías observar que en 2001 los picos de contaminación eran de 120 µg/m³ a las 8:00 y 19:00, mientras que en 2020 esos mismos picos se redujeron a 70 µg/m³, evidenciando el impacto positivo de las políticas de Madrid Central y la renovación del parque automovilístico. Si seleccionas el día 15 de enero, compararías exactamente ese mismo día en ambos años, mostrando diferencias más específicas.'
  },

  // ========== ESTADÍSTICAS ==========

  summary: {
    title: 'Resumen Estadístico',
    description: 'Calcula estadísticas descriptivas completas de un periodo determinado, incluyendo medidas de tendencia central (media, mediana), dispersión (desviación estándar, varianza, rango) y percentiles clave. Este análisis proporciona una visión cuantitativa completa de la distribución de valores de NO₂, permitiendo entender la variabilidad y características típicas de la contaminación en el periodo analizado.',
    sqlQuery: `SELECT
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
FROM read_parquet('year=2001/month=01/data.parquet')
-- WHERE EXTRACT(day FROM datetime) = 15
-- AND h3_index = '89390ca0083ffff'`,
    example: 'Si calculas el resumen estadístico de enero 2001 para toda Madrid, podrías obtener: Media 65 µg/m³, Mediana 58 µg/m³, Desv. Est. 25 µg/m³, Mín 5 µg/m³, Máx 250 µg/m³, P95 105 µg/m³. La diferencia entre media y mediana indica asimetría positiva (valores extremos altos ocasionales). El P95 de 105 µg/m³ te dice que el 95% del tiempo la contaminación estuvo por debajo de ese valor. Una desviación estándar alta (25) indica gran variabilidad día a día y hora a hora.'
  },

  compliance: {
    title: 'Cumplimiento Normativo',
    description: 'Evalúa el cumplimiento de los límites establecidos por la Unión Europea para NO₂. La normativa europea establece 40 µg/m³ como valor límite anual para protección de la salud humana, y 200 µg/m³ como umbral de alerta para exposiciones de corta duración. Este análisis clasifica todas las mediciones en tres categorías: Cumple (≤40), Aceptable (40-200), y Alerta (>200), mostrando el porcentaje de tiempo en cada categoría.',
    sqlQuery: `WITH stats AS (
  SELECT
    COUNT(*) as total,
    SUM(CASE WHEN value <= 40 THEN 1 ELSE 0 END) as cumple_40,
    SUM(CASE WHEN value > 40 AND value <= 200 THEN 1 ELSE 0 END) as entre_40_200,
    SUM(CASE WHEN value > 200 THEN 1 ELSE 0 END) as supera_200,
    AVG(value) as promedio
  FROM read_parquet('year=2001/month=01/data.parquet')
  -- WHERE EXTRACT(day FROM datetime) = 15
  -- AND h3_index = '89390ca0083ffff'
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
FROM stats`,
    example: 'Si analizas enero 2001 en toda Madrid, podrías encontrar: 25% cumple (≤40 µg/m³), 72% aceptable (40-200 µg/m³), 3% alerta (>200 µg/m³). Esto significa que solo el 25% del tiempo se cumplió el límite anual de la UE, el 72% estuvo en niveles elevados pero no críticos, y un preocupante 3% del tiempo se superó el umbral de alerta. Si analizas un hexágono específico en una vía principal, el porcentaje en alerta podría ser significativamente mayor, indicando zona problemática que requiere intervención.'
  }
};
