/**
 * Help content for the analysis panel, in both supported languages.
 *
 * The SQL blocks are authored once (SQL_ES) and mirrored into English by
 * translating only their comments, placeholder paths and the season labels
 * they emit; the statements themselves are identical.
 */

const SQL_ES = {
  hourly: `-- Para un mes específico (con AVG, MAX, MIN):
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

  seasonal: `SELECT
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

  weekday: `SELECT
  DAYOFWEEK(datetime) as dow,
  AVG(value) as avg_value
FROM read_parquet('url_del_mes')
GROUP BY dow
ORDER BY dow`,

  yearly: `SELECT
  year,
  AVG(value) as avg_value
FROM (
  SELECT *, year FROM read_parquet('urls_múltiples')
)
GROUP BY year
ORDER BY year`,

  hotspots: `SELECT
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

  threshold: `SELECT
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

  peak_days: `SELECT
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

  consecutive_days: `WITH daily_avg AS (
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

  percentile: `WITH daily_stats AS (
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

  duration: `WITH hourly_data AS (
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

  comparative_years: `WITH year1_data AS (
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

  summary: `SELECT
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

  compliance: `WITH stats AS (
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
};

/**
 * Comment / placeholder / label substitutions applied to produce the English
 * variant of each SQL block. Keys are plain substrings, replaced in order.
 */
const SQL_EN_SUBSTITUTIONS = [
  ['-- Para un mes específico (con AVG, MAX, MIN):', '-- For a specific month (with AVG, MAX, MIN):'],
  ['-- Para todo el año (con AVG, MAX, MIN):', '-- For the whole year (with AVG, MAX, MIN):'],
  ['-- Con múltiples días (solo promedio):', '-- With several weekdays (average only):'],
  ['-- ... hasta mes=12', '-- ... up to month=12'],
  ['-- Lun, Dom', '-- Mon, Sun'],
  ["'año/mes=01/**'", "'year/month=01/**'"],
  ["'año/mes=02/**'", "'year/month=02/**'"],
  ["'url_del_mes'", "'month_url'"],
  ["'urls_múltiples'", "'multiple_urls'"],
  ["'Invierno'", "'Winter'"],
  ["'Primavera'", "'Spring'"],
  ["'Verano'", "'Summer'"],
  ["'Otoño'", "'Autumn'"],
];

const SQL_EN = Object.fromEntries(
  Object.entries(SQL_ES).map(([key, query]) => [
    key,
    SQL_EN_SUBSTITUTIONS.reduce(
      (acc, [from, to]) => acc.split(from).join(to),
      query,
    ),
  ]),
);

export const ANALYSIS_HELP = {
  en: {
    hourly: {
      title: 'Peak Hours Analysis',
      description: 'This analysis computes the mean, maximum and minimum NO₂ concentration for each hour of the day (0-23 hours). You can analyse a specific month or the whole year. If you do not select specific days, three curves are shown (mean, maximum, minimum). If you select several weekdays, only the mean for each day is shown to avoid cluttering the chart. It makes it possible to identify the hours with the highest pollution, typically the heavy-traffic rush hours (8-9 AM and 6-7 PM).',
      sqlQuery: SQL_EN.hourly,
      example: 'If you select the whole year 2001 without filtering by day, you will see three curves: the mean will show peaks at 8:00 and 19:00, the maximum will show the extreme values recorded at those hours, and the minimum will show the variability (useful to identify whether there are days with very low pollution). If you select "Monday" and "Sunday", you will see two mean curves comparing both days.',
    },
    seasonal: {
      title: 'Seasonal Analysis',
      description: 'Groups all the data by season of the year (Spring: Mar-May, Summer: Jun-Aug, Autumn: Sep-Nov, Winter: Dec-Feb) and computes the mean NO₂ for each season. Useful for identifying weather and energy-consumption patterns.',
      sqlQuery: SQL_EN.seasonal,
      example: 'Analysing 2001-2010, you will normally see that winter has higher NO₂ levels due to heating use and the thermal inversions that trap pollutants.',
    },
    weekday: {
      title: 'Day of the Week Analysis',
      description: 'Computes the mean NO₂ for each day of the week (Monday to Sunday) in a specific month. It reveals differences between working days (heavier vehicle traffic) and weekends (lower activity).',
      sqlQuery: SQL_EN.weekday,
      example: 'In January 2001, the chart will typically show higher values from Monday to Friday (working activity) and markedly lower values on Saturday and Sunday.',
    },
    yearly: {
      title: 'Annual Evolution',
      description: 'Shows the trend in mean NO₂ levels year after year over a selected time range. It makes it possible to assess the impact of environmental policies, changes in traffic or specific events (such as Madrid Central in 2018 or COVID-19 in 2020).',
      sqlQuery: SQL_EN.yearly,
      example: 'Comparing 2001-2010, you could observe a downward trend due to stricter vehicle emission regulations and technological improvements in engines.',
    },
    hotspots: {
      title: 'Hotspots - Most polluted areas',
      description: 'Identifies the N areas (H3 hexagons) with the highest mean NO₂ concentrations over a specific period. This analysis groups all the values of each hexagon and computes statistics (mean, maximum, minimum) to identify the critical pollution points. Useful for targeting air-quality improvement measures at the most affected areas.',
      sqlQuery: SQL_EN.hotspots,
      example: 'If you analyse January 2001 at 8:00 AM (traffic rush hour), the results will show the 10 most polluted hexagons, typically located on main avenues such as M-30, Gran Vía or Paseo de la Castellana. The bar chart lets you visually compare the intensity across these areas, and the hexagons are highlighted in orange on the map for immediate spatial identification.',
    },
    threshold: {
      title: 'Exceed Threshold - Areas above the limit',
      description: 'Finds all the hexagons that exceed a specific NO₂ concentration threshold. This analysis is fundamental for regulatory compliance and public health. The European Union sets 40 µg/m³ as the annual limit and 200 µg/m³ as the hourly alert threshold. It makes it possible to quickly identify all the areas that exceed these legal limits.',
      sqlQuery: SQL_EN.threshold,
      example: 'If you set a threshold of 80 µg/m³ for January 2001 at 19:00 (evening rush hour), the analysis will return all the areas that exceed this limit. For example, you could find 25 hexagons in violation, concentrated mainly in the urban centre and the main road axes. The number of exceedances (count) tells you how many measurements from that hexagon exceeded the threshold, helping to identify whether it is a one-off or a persistent problem.',
    },
    peak_days: {
      title: 'Most Polluted Days',
      description: 'Identifies the N days with the highest mean NO₂ concentrations over a given period. This analysis is crucial for identifying critical pollution days that may require the activation of anti-pollution protocols. It can be applied to the whole surface of Madrid or to a specific hexagon if you select one on the map.',
      sqlQuery: SQL_EN.peak_days,
      example: 'If you analyse January 2001 at 8:00 AM (morning rush hour), the analysis will show the 10 most polluted days. For example, you could find that the 15th, 18th and 22nd had the highest levels, probably due to adverse weather conditions (thermal inversion) that trap pollutants close to the ground. The chart shows mean bars with maximum and minimum lines so you can see the variability.',
    },
    consecutive_days: {
      title: 'Consecutive Episodes',
      description: 'Finds periods of consecutive days where the mean NO₂ exceeded a specific threshold. This analysis is fundamental for identifying prolonged pollution episodes, which have a greater impact on public health. Episodes lasting several consecutive days are especially worrying according to air-quality regulations.',
      sqlQuery: SQL_EN.consecutive_days,
      example: 'If you look for episodes of 3+ consecutive days that exceeded 80 µg/m³ in January 2001, you could find 2 episodes: Episode 1 from 5 to 8 January (4 days) with a mean of 95 µg/m³, and Episode 2 from the 20th to the 22nd (3 days) with a mean of 88 µg/m³. These prolonged episodes are the ones that most concern the health authorities.',
    },
    percentile: {
      title: 'Percentile Analysis',
      description: 'Identifies days that exceed a specific percentile (P90, P95, P99) of the distribution of values. This statistical analysis makes it possible to identify extreme events based on the historical distribution of the data, instead of using fixed thresholds. It is useful for detecting anomalous days compared with the typical behaviour of the period.',
      sqlQuery: SQL_EN.percentile,
      example: 'If you compute the 95th percentile for January 2001, you will find the days that are in the top 5% of the month in terms of pollution. For example, if P95 is 85 µg/m³, you will see only the days that exceeded that value. This shows you the truly exceptional days of the month, independently of fixed regulatory thresholds.',
    },
    duration: {
      title: 'Event Duration',
      description: 'Finds days where an NO₂ threshold was exceeded for a minimum number of consecutive hours. This analysis is critical for regulatory compliance, since the EU establishes that 200 µg/m³ must not be exceeded for more than 18 hours per year. It identifies days with prolonged exposure to elevated pollution levels.',
      sqlQuery: SQL_EN.duration,
      example: 'If you look for days with 8+ consecutive hours above 80 µg/m³ in January 2001, you could find 5 critical days. For example, the 15th had 12 consecutive hours exceeding the threshold, from 7:00 until 19:00, indicating a full day of high pollution without respite. These days require special attention and possible activation of protocols.',
    },
    comparative_years: {
      title: 'Comparison between Years',
      description: 'Compares the hourly NO₂ pattern (24 hours) between two different years for the same month and day. This analysis is fundamental for assessing the temporal evolution of pollution and the impact of environmental policies. It makes it possible to compare any year from 2001 to the present, identifying improvements or deteriorations in air quality. You can analyse the whole surface of Madrid or restrict it to a specific hexagon.',
      sqlQuery: SQL_EN.comparative_years,
      example: 'If you compare January 2001 vs January 2020 (without selecting a specific day), the chart will show two lines representing the hourly mean for the whole month in each year. For example, you could observe that in 2001 the pollution peaks were 120 µg/m³ at 8:00 and 19:00, whereas in 2020 those same peaks fell to 70 µg/m³, evidencing the positive impact of the Madrid Central policies and the renewal of the vehicle fleet. If you select 15 January, you would compare exactly that same day in both years, showing more specific differences.',
    },
    summary: {
      title: 'Statistical Summary',
      description: 'Computes complete descriptive statistics for a given period, including measures of central tendency (mean, median), dispersion (standard deviation, variance, range) and key percentiles. This analysis provides a complete quantitative view of the distribution of NO₂ values, making it possible to understand the variability and typical characteristics of pollution over the analysed period.',
      sqlQuery: SQL_EN.summary,
      example: 'If you compute the statistical summary of January 2001 for the whole of Madrid, you could obtain: Mean 65 µg/m³, Median 58 µg/m³, Std. Dev. 25 µg/m³, Min 5 µg/m³, Max 250 µg/m³, P95 105 µg/m³. The difference between mean and median indicates positive skew (occasional high extreme values). The P95 of 105 µg/m³ tells you that 95% of the time pollution was below that value. A high standard deviation (25) indicates great variability from day to day and from hour to hour.',
    },
    compliance: {
      title: 'Regulatory Compliance',
      description: 'Assesses compliance with the limits set by the European Union for NO₂. European regulations set 40 µg/m³ as the annual limit value for the protection of human health, and 200 µg/m³ as the alert threshold for short-duration exposures. This analysis classifies all measurements into three categories: Compliant (≤40), Acceptable (40-200), and Alert (>200), showing the percentage of time in each category.',
      sqlQuery: SQL_EN.compliance,
      example: 'If you analyse January 2001 across the whole of Madrid, you could find: 25% compliant (≤40 µg/m³), 72% acceptable (40-200 µg/m³), 3% alert (>200 µg/m³). This means that only 25% of the time was the EU annual limit met, 72% was at elevated but not critical levels, and a worrying 3% of the time the alert threshold was exceeded. If you analyse a specific hexagon on a main road, the alert percentage could be significantly higher, indicating a problem area that requires intervention.',
    },
  },

  es: {
    hourly: {
      title: 'Análisis de Horas Pico',
      description: 'Este análisis calcula el promedio, máximo y mínimo de concentración de NO₂ para cada hora del día (0-23 horas). Puedes analizar un mes específico o todo el año. Si no seleccionas días específicos, se mostrarán tres curvas (promedio, máximo, mínimo). Si seleccionas múltiples días de la semana, solo se mostrará el promedio de cada día para evitar saturar el gráfico. Permite identificar las horas con mayor contaminación, típicamente las horas de tráfico intenso (8-9 AM y 6-7 PM).',
      sqlQuery: SQL_ES.hourly,
      example: 'Si seleccionas el año 2001 completo sin filtrar días, verás tres curvas: el promedio mostrará picos a las 8:00 y 19:00, el máximo mostrará los valores extremos registrados en esas horas, y el mínimo mostrará la variabilidad (útil para identificar si hay días con contaminación muy baja). Si seleccionas "Lunes" y "Domingo", verás dos curvas de promedio comparando ambos días.',
    },
    seasonal: {
      title: 'Análisis Estacional',
      description: 'Agrupa todos los datos por estaciones del año (Primavera: Mar-May, Verano: Jun-Ago, Otoño: Sep-Nov, Invierno: Dic-Feb) y calcula el promedio de NO₂ para cada estación. Útil para identificar patrones climáticos y de consumo energético.',
      sqlQuery: SQL_ES.seasonal,
      example: 'Analizando 2001-2010, normalmente verás que el invierno tiene mayores niveles de NO₂ debido al uso de calefacción y las inversiones térmicas que atrapan contaminantes.',
    },
    weekday: {
      title: 'Análisis por Día de la Semana',
      description: 'Calcula el promedio de NO₂ para cada día de la semana (Lunes a Domingo) en un mes específico. Revela diferencias entre días laborables (mayor tráfico vehicular) y fines de semana (menor actividad).',
      sqlQuery: SQL_ES.weekday,
      example: 'En enero de 2001, el gráfico típicamente mostrará valores más altos de lunes a viernes (actividad laboral) y valores notablemente más bajos en sábado y domingo.',
    },
    yearly: {
      title: 'Evolución Anual',
      description: 'Muestra la tendencia de los niveles promedio de NO₂ año tras año en un rango temporal seleccionado. Permite evaluar el impacto de políticas ambientales, cambios en el tráfico o eventos específicos (como Madrid Central en 2018 o el COVID-19 en 2020).',
      sqlQuery: SQL_ES.yearly,
      example: 'Comparando 2001-2010, podrías observar una tendencia decreciente debido a regulaciones más estrictas de emisiones vehiculares y mejoras tecnológicas en motores.',
    },
    hotspots: {
      title: 'Hotspots - Zonas más contaminadas',
      description: 'Identifica las N zonas (hexágonos H3) con las concentraciones promedio más altas de NO₂ en un periodo específico. Este análisis agrupa todos los valores de cada hexágono y calcula estadísticas (promedio, máximo, mínimo) para identificar los puntos críticos de contaminación. Útil para focalizar medidas de mejora de calidad del aire en las zonas más afectadas.',
      sqlQuery: SQL_ES.hotspots,
      example: 'Si analizas enero de 2001 a las 8:00 AM (hora pico de tráfico), los resultados mostrarán los 10 hexágonos más contaminados, típicamente localizados en avenidas principales como M-30, Gran Vía o Paseo de la Castellana. El gráfico de barras permite comparar visualmente la intensidad entre estas zonas, y los hexágonos se resaltan en naranja en el mapa para una identificación espacial inmediata.',
    },
    threshold: {
      title: 'Superar Umbral - Zonas por encima del límite',
      description: 'Encuentra todos los hexágonos que superan un umbral específico de concentración de NO₂. Este análisis es fundamental para cumplimiento normativo y salud pública. La Unión Europea establece 40 µg/m³ como límite anual y 200 µg/m³ como umbral de alerta horaria. Permite identificar rápidamente todas las áreas que exceden estos límites legales.',
      sqlQuery: SQL_ES.threshold,
      example: 'Si estableces un umbral de 80 µg/m³ para enero de 2001 a las 19:00 (hora pico vespertina), el análisis devolverá todas las zonas que superan este límite. Por ejemplo, podrías encontrar 25 hexágonos en violación, concentrados principalmente en el centro urbano y ejes viarios principales. El número de excedencias (count) te indica cuántas mediciones de ese hexágono superaron el umbral, ayudando a identificar si es un problema puntual o persistente.',
    },
    peak_days: {
      title: 'Días con Mayor Contaminación',
      description: 'Identifica los N días con las concentraciones promedio más altas de NO₂ en un periodo determinado. Este análisis es crucial para identificar días críticos de contaminación que pueden requerir activación de protocolos anti-contaminación. Puede aplicarse a toda la superficie de Madrid o a un hexágono específico si seleccionas uno en el mapa.',
      sqlQuery: SQL_ES.peak_days,
      example: 'Si analizas enero de 2001 a las 8:00 AM (hora pico matutina), el análisis mostrará los 10 días con mayor contaminación. Por ejemplo, podrías encontrar que los días 15, 18 y 22 tuvieron los mayores niveles, probablemente debido a condiciones meteorológicas adversas (inversión térmica) que atrapan contaminantes cerca del suelo. El gráfico muestra barras de promedio con líneas de máximos y mínimos para ver la variabilidad.',
    },
    consecutive_days: {
      title: 'Episodios Consecutivos',
      description: 'Encuentra periodos de días consecutivos donde el promedio de NO₂ superó un umbral específico. Este análisis es fundamental para identificar episodios de contaminación prolongada que tienen mayor impacto en la salud pública. Los episodios de varios días consecutivos son especialmente preocupantes según la normativa de calidad del aire.',
      sqlQuery: SQL_ES.consecutive_days,
      example: 'Si buscas episodios de 3+ días consecutivos que superaron 80 µg/m³ en enero de 2001, podrías encontrar 2 episodios: Episodio 1 del 5 al 8 de enero (4 días) con promedio de 95 µg/m³, y Episodio 2 del 20 al 22 (3 días) con promedio de 88 µg/m³. Estos episodios prolongados son los que más preocupan a las autoridades sanitarias.',
    },
    percentile: {
      title: 'Análisis de Percentiles',
      description: 'Identifica días que superan un percentil específico (P90, P95, P99) de la distribución de valores. Este análisis estadístico permite identificar eventos extremos basándose en la distribución histórica de datos, en lugar de usar umbrales fijos. Es útil para detectar días anómalos comparados con el comportamiento típico del periodo.',
      sqlQuery: SQL_ES.percentile,
      example: 'Si calculas el percentil 95 para enero de 2001, encontrarás los días que están en el 5% superior de contaminación del mes. Por ejemplo, si el P95 es 85 µg/m³, verás solo los días que superaron ese valor. Esto te muestra los días verdaderamente excepcionales del mes, independientemente de umbrales normativos fijos.',
    },
    duration: {
      title: 'Duración de Eventos',
      description: 'Encuentra días donde se superó un umbral de NO₂ durante un número mínimo de horas consecutivas. Este análisis es crítico para cumplimiento normativo, ya que la UE establece que no se debe superar 200 µg/m³ durante más de 18 horas al año. Identifica días con exposición prolongada a niveles elevados de contaminación.',
      sqlQuery: SQL_ES.duration,
      example: 'Si buscas días con 8+ horas consecutivas por encima de 80 µg/m³ en enero de 2001, podrías encontrar 5 días críticos. Por ejemplo, el día 15 tuvo 12 horas consecutivas superando el umbral, desde las 7:00 hasta las 19:00, indicando un día completo de alta contaminación sin respiro. Estos días requieren atención especial y posible activación de protocolos.',
    },
    comparative_years: {
      title: 'Comparación entre Años',
      description: 'Compara el patrón horario (24 horas) de NO₂ entre dos años diferentes para el mismo mes y día. Este análisis es fundamental para evaluar la evolución temporal de la contaminación y el impacto de políticas ambientales. Permite comparar cualquier año desde 2001 hasta la actualidad, identificando mejoras o empeoramientos en la calidad del aire. Puedes analizar toda la superficie de Madrid o limitarlo a un hexágono específico.',
      sqlQuery: SQL_ES.comparative_years,
      example: 'Si comparas enero de 2001 vs enero de 2020 (sin seleccionar día específico), el gráfico mostrará dos líneas representando el promedio horario de todo el mes para cada año. Por ejemplo, podrías observar que en 2001 los picos de contaminación eran de 120 µg/m³ a las 8:00 y 19:00, mientras que en 2020 esos mismos picos se redujeron a 70 µg/m³, evidenciando el impacto positivo de las políticas de Madrid Central y la renovación del parque automovilístico. Si seleccionas el día 15 de enero, compararías exactamente ese mismo día en ambos años, mostrando diferencias más específicas.',
    },
    summary: {
      title: 'Resumen Estadístico',
      description: 'Calcula estadísticas descriptivas completas de un periodo determinado, incluyendo medidas de tendencia central (media, mediana), dispersión (desviación estándar, varianza, rango) y percentiles clave. Este análisis proporciona una visión cuantitativa completa de la distribución de valores de NO₂, permitiendo entender la variabilidad y características típicas de la contaminación en el periodo analizado.',
      sqlQuery: SQL_ES.summary,
      example: 'Si calculas el resumen estadístico de enero 2001 para toda Madrid, podrías obtener: Media 65 µg/m³, Mediana 58 µg/m³, Desv. Est. 25 µg/m³, Mín 5 µg/m³, Máx 250 µg/m³, P95 105 µg/m³. La diferencia entre media y mediana indica asimetría positiva (valores extremos altos ocasionales). El P95 de 105 µg/m³ te dice que el 95% del tiempo la contaminación estuvo por debajo de ese valor. Una desviación estándar alta (25) indica gran variabilidad día a día y hora a hora.',
    },
    compliance: {
      title: 'Cumplimiento Normativo',
      description: 'Evalúa el cumplimiento de los límites establecidos por la Unión Europea para NO₂. La normativa europea establece 40 µg/m³ como valor límite anual para protección de la salud humana, y 200 µg/m³ como umbral de alerta para exposiciones de corta duración. Este análisis clasifica todas las mediciones en tres categorías: Cumple (≤40), Aceptable (40-200), y Alerta (>200), mostrando el porcentaje de tiempo en cada categoría.',
      sqlQuery: SQL_ES.compliance,
      example: 'Si analizas enero 2001 en toda Madrid, podrías encontrar: 25% cumple (≤40 µg/m³), 72% aceptable (40-200 µg/m³), 3% alerta (>200 µg/m³). Esto significa que solo el 25% del tiempo se cumplió el límite anual de la UE, el 72% estuvo en niveles elevados pero no críticos, y un preocupante 3% del tiempo se superó el umbral de alerta. Si analizas un hexágono específico en una vía principal, el porcentaje en alerta podría ser significativamente mayor, indicando zona problemática que requiere intervención.',
    },
  },
};
