// Help content for each temporal analysis type

export const ANALYSIS_HELP = {
  hourly: {
    title: 'Peak Hours Analysis',
    description: 'This analysis calculates the average, maximum, and minimum NO₂ concentration for each hour of the day (0-23 hours). You can analyze a specific month or the entire year. If you don\'t select specific days, three curves will be displayed (average, maximum, minimum). If you select multiple weekdays, only the average for each day will be shown to avoid overcrowding the chart. This allows identification of hours with highest pollution, typically during heavy traffic hours (8-9 AM and 6-7 PM).',
    sqlQuery: `-- For a specific month (with AVG, MAX, MIN):
SELECT
  EXTRACT(hour FROM datetime) as hour,
  AVG(value) as avg_value,
  MAX(value) as max_value,
  MIN(value) as min_value
FROM read_parquet('month_url')
GROUP BY hour
ORDER BY hour

-- For the entire year (with AVG, MAX, MIN):
SELECT
  EXTRACT(hour FROM datetime) as hour,
  AVG(value) as avg_value,
  MAX(value) as max_value,
  MIN(value) as min_value
FROM (
  SELECT datetime, value FROM read_parquet('year/month=01/**')
  UNION ALL
  SELECT datetime, value FROM read_parquet('year/month=02/**')
  -- ... up to month=12
)
GROUP BY hour
ORDER BY hour

-- With multiple days (average only):
SELECT
  DAYOFWEEK(datetime) as dow,
  EXTRACT(hour FROM datetime) as hour,
  AVG(value) as avg_value
FROM read_parquet('url')
WHERE DAYOFWEEK(datetime) IN (1, 0) -- Mon, Sun
GROUP BY dow, hour
ORDER BY dow, hour`,
    example: 'If you select the complete year 2001 without filtering days, you will see three curves: the average will show peaks at 8:00 and 19:00, the maximum will show the extreme values recorded at those hours, and the minimum will show variability (useful for identifying if there are days with very low pollution). If you select "Monday" and "Sunday", you will see two average curves comparing both days.'
  },

  seasonal: {
    title: 'Seasonal Analysis',
    description: 'Groups all data by seasons of the year (Spring: Mar-May, Summer: Jun-Aug, Fall: Sep-Nov, Winter: Dec-Feb) and calculates the average NO₂ for each season. Useful for identifying climate and energy consumption patterns.',
    sqlQuery: `SELECT
  CASE
    WHEN month IN (12, 1, 2) THEN 'Winter'
    WHEN month IN (3, 4, 5) THEN 'Spring'
    WHEN month IN (6, 7, 8) THEN 'Summer'
    ELSE 'Fall'
  END as season,
  AVG(value) as avg_value
FROM (
  SELECT *, month FROM read_parquet('multiple_urls')
)
GROUP BY season`,
    example: 'Analyzing 2001-2010, you will typically see that winter has higher NO₂ levels due to heating usage and thermal inversions that trap pollutants.'
  },

  weekday: {
    title: 'Weekday Analysis',
    description: 'Calculates the average NO₂ for each day of the week (Monday to Sunday) in a specific month. Reveals differences between weekdays (higher vehicular traffic) and weekends (lower activity).',
    sqlQuery: `SELECT
  DAYOFWEEK(datetime) as dow,
  AVG(value) as avg_value
FROM read_parquet('month_url')
GROUP BY dow
ORDER BY dow`,
    example: 'In January 2001, the chart will typically show higher values from Monday to Friday (work activity) and noticeably lower values on Saturday and Sunday.'
  },

  yearly: {
    title: 'Annual Evolution',
    description: 'Shows the trend of average NO₂ levels year after year in a selected time range. Allows evaluation of the impact of environmental policies, traffic changes, or specific events (such as Madrid Central in 2018 or COVID-19 in 2020).',
    sqlQuery: `SELECT
  year,
  AVG(value) as avg_value
FROM (
  SELECT *, year FROM read_parquet('multiple_urls')
)
GROUP BY year
ORDER BY year`,
    example: 'Comparing 2001-2010, you could observe a decreasing trend due to stricter vehicle emission regulations and technological improvements in engines.'
  },

  // ========== SPATIAL ANALYSIS ==========

  hotspots: {
    title: 'Hotspots - Most Polluted Areas',
    description: 'Identifies the N areas (H3 hexagons) with the highest average NO₂ concentrations in a specific period. This analysis groups all values from each hexagon and calculates statistics (average, maximum, minimum) to identify critical pollution points. Useful for focusing air quality improvement measures in the most affected areas.',
    sqlQuery: `SELECT
  h3_index,
  AVG(value) as avg_value,
  MAX(value) as max_value,
  MIN(value) as min_value,
  COUNT(*) as count
FROM read_parquet('year=2001/month=01/data.parquet')
-- Optional filters:
-- WHERE EXTRACT(day FROM datetime) = 15
-- AND EXTRACT(hour FROM datetime) = 8
GROUP BY h3_index
ORDER BY avg_value DESC
LIMIT 10`,
    example: 'If you analyze January 2001 at 8:00 AM (peak traffic hour), the results will show the 10 most polluted hexagons, typically located on main avenues such as M-30, Gran Vía, or Paseo de la Castellana. The bar chart allows visual comparison of intensity between these areas, and the hexagons are highlighted in orange on the map for immediate spatial identification.'
  },

  threshold: {
    title: 'Threshold Exceedance - Areas Above Limit',
    description: 'Finds all hexagons that exceed a specific NO₂ concentration threshold. This analysis is fundamental for regulatory compliance and public health. The European Union establishes 40 µg/m³ as the annual limit and 200 µg/m³ as the hourly alert threshold. Allows quick identification of all areas exceeding these legal limits.',
    sqlQuery: `SELECT
  h3_index,
  AVG(value) as avg_value,
  MAX(value) as max_value,
  COUNT(*) as exceedances
FROM read_parquet('year=2001/month=01/data.parquet')
-- Optional filters:
-- WHERE EXTRACT(day FROM datetime) = 15
-- AND EXTRACT(hour FROM datetime) = 19
GROUP BY h3_index
HAVING AVG(value) > 80
ORDER BY avg_value DESC`,
    example: 'If you set a threshold of 80 µg/m³ for January 2001 at 19:00 (evening peak hour), the analysis will return all areas exceeding this limit. For example, you might find 25 hexagons in violation, concentrated mainly in the urban center and main road axes. The number of exceedances (count) indicates how many measurements from that hexagon exceeded the threshold, helping to identify if it is a specific or persistent problem.'
  },

  // ========== EXTREME EVENT ANALYSIS ==========

  peak_days: {
    title: 'Days with Highest Pollution',
    description: 'Identifies the N days with the highest average NO₂ concentrations in a given period. This analysis is crucial for identifying critical pollution days that may require activation of anti-pollution protocols. Can be applied to the entire Madrid area or to a specific hexagon if you select one on the map.',
    sqlQuery: `SELECT
  EXTRACT(day FROM datetime) as day,
  AVG(value) as avg_value,
  MAX(value) as max_value,
  MIN(value) as min_value,
  COUNT(*) as count
FROM read_parquet('year=2001/month=01/data.parquet')
-- Optional filters:
-- WHERE EXTRACT(hour FROM datetime) = 8
-- AND h3_index = '89390ca0083ffff'
GROUP BY day
ORDER BY avg_value DESC
LIMIT 10`,
    example: 'If you analyze January 2001 at 8:00 AM (morning peak hour), the analysis will show the 10 days with highest pollution. For example, you might find that days 15, 18, and 22 had the highest levels, probably due to adverse meteorological conditions (thermal inversion) that trap pollutants near the ground. The chart shows average bars with maximum and minimum lines to see variability.'
  },

  consecutive_days: {
    title: 'Consecutive Episodes',
    description: 'Finds periods of consecutive days where the average NO₂ exceeded a specific threshold. This analysis is fundamental for identifying prolonged pollution episodes that have greater impact on public health. Episodes of several consecutive days are especially concerning according to air quality regulations.',
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
    example: 'If you search for episodes of 3+ consecutive days that exceeded 80 µg/m³ in January 2001, you might find 2 episodes: Episode 1 from January 5 to 8 (4 days) with an average of 95 µg/m³, and Episode 2 from the 20th to 22nd (3 days) with an average of 88 µg/m³. These prolonged episodes are what concern health authorities most.'
  },

  percentile: {
    title: 'Percentile Analysis',
    description: 'Identifies days that exceed a specific percentile (P90, P95, P99) of the value distribution. This statistical analysis allows identification of extreme events based on the historical data distribution, instead of using fixed thresholds. It is useful for detecting anomalous days compared to the typical behavior of the period.',
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
    example: 'If you calculate the 95th percentile for January 2001, you will find the days that are in the top 5% of pollution for the month. For example, if P95 is 85 µg/m³, you will see only the days that exceeded that value. This shows you the truly exceptional days of the month, regardless of fixed regulatory thresholds.'
  },

  duration: {
    title: 'Event Duration',
    description: 'Finds days where a NO₂ threshold was exceeded for a minimum number of consecutive hours. This analysis is critical for regulatory compliance, as the EU establishes that 200 µg/m³ should not be exceeded for more than 18 hours per year. Identifies days with prolonged exposure to elevated pollution levels.',
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
    example: 'If you search for days with 8+ consecutive hours above 80 µg/m³ in January 2001, you might find 5 critical days. For example, day 15 had 12 consecutive hours exceeding the threshold, from 7:00 to 19:00, indicating a full day of high pollution without relief. These days require special attention and possible protocol activation.'
  },

  // ========== COMPARATIVE ANALYSIS ==========

  comparative_years: {
    title: 'Year Comparison',
    description: 'Compares the hourly pattern (24 hours) of NO₂ between two different years for the same month and day. This analysis is fundamental for evaluating the temporal evolution of pollution and the impact of environmental policies. Allows comparison of any year from 2001 to present, identifying improvements or deteriorations in air quality. You can analyze the entire Madrid area or limit it to a specific hexagon.',
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
    example: 'If you compare January 2001 vs January 2020 (without selecting a specific day), the chart will show two lines representing the hourly average of the entire month for each year. For example, you might observe that in 2001 pollution peaks were 120 µg/m³ at 8:00 and 19:00, while in 2020 those same peaks were reduced to 70 µg/m³, evidencing the positive impact of Madrid Central policies and vehicle fleet renewal. If you select the 15th of January, you would compare exactly that same day in both years, showing more specific differences.'
  },

  // ========== STATISTICS ==========

  summary: {
    title: 'Statistical Summary',
    description: 'Calculates complete descriptive statistics for a given period, including measures of central tendency (mean, median), dispersion (standard deviation, variance, range), and key percentiles. This analysis provides a complete quantitative view of the NO₂ value distribution, allowing understanding of variability and typical characteristics of pollution in the analyzed period.',
    sqlQuery: `SELECT
  COUNT(*) as total_records,
  AVG(value) as mean,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY value) as median,
  STDDEV(value) as standard_deviation,
  VARIANCE(value) as variance,
  MIN(value) as minimum,
  MAX(value) as maximum,
  MAX(value) - MIN(value) as range,
  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY value) as p25,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY value) as p50,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY value) as p75,
  PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY value) as p90,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) as p95,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY value) as p99
FROM read_parquet('year=2001/month=01/data.parquet')
-- WHERE EXTRACT(day FROM datetime) = 15
-- AND h3_index = '89390ca0083ffff'`,
    example: 'If you calculate the statistical summary of January 2001 for all of Madrid, you might get: Mean 65 µg/m³, Median 58 µg/m³, Std. Dev. 25 µg/m³, Min 5 µg/m³, Max 250 µg/m³, P95 105 µg/m³. The difference between mean and median indicates positive asymmetry (occasional high extreme values). P95 of 105 µg/m³ tells you that 95% of the time pollution was below that value. A high standard deviation (25) indicates great variability day to day and hour to hour.'
  },

  compliance: {
    title: 'Regulatory Compliance',
    description: 'Evaluates compliance with limits established by the European Union for NO₂. European regulations establish 40 µg/m³ as the annual limit value for human health protection, and 200 µg/m³ as the alert threshold for short-term exposures. This analysis classifies all measurements into three categories: Compliant (≤40), Acceptable (40-200), and Alert (>200), showing the percentage of time in each category.',
    sqlQuery: `WITH stats AS (
  SELECT
    COUNT(*) as total,
    SUM(CASE WHEN value <= 40 THEN 1 ELSE 0 END) as compliant_40,
    SUM(CASE WHEN value > 40 AND value <= 200 THEN 1 ELSE 0 END) as between_40_200,
    SUM(CASE WHEN value > 200 THEN 1 ELSE 0 END) as exceeds_200,
    AVG(value) as average
  FROM read_parquet('year=2001/month=01/data.parquet')
  -- WHERE EXTRACT(day FROM datetime) = 15
  -- AND h3_index = '89390ca0083ffff'
)
SELECT
  compliant_40,
  between_40_200,
  exceeds_200,
  total,
  average,
  CAST(compliant_40 AS DOUBLE) / total * 100 as pct_compliant_40,
  CAST(between_40_200 AS DOUBLE) / total * 100 as pct_between_40_200,
  CAST(exceeds_200 AS DOUBLE) / total * 100 as pct_exceeds_200
FROM stats`,
    example: 'If you analyze January 2001 in all of Madrid, you might find: 25% compliant (≤40 µg/m³), 72% acceptable (40-200 µg/m³), 3% alert (>200 µg/m³). This means that only 25% of the time the EU annual limit was met, 72% was at elevated but not critical levels, and a concerning 3% of the time the alert threshold was exceeded. If you analyze a specific hexagon on a main road, the alert percentage could be significantly higher, indicating a problematic area requiring intervention.'
  }
};
