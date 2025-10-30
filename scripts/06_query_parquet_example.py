"""
Script de ejemplo para consultar los archivos Parquet particionados.

Este script demuestra cómo realizar queries eficientes sobre los datos
particionados usando DuckDB, que es extremadamente rápido para este tipo de operaciones.

Instalación requerida:
    pip install duckdb pandas

Ventajas de este enfoque:
- Queries SQL sobre archivos Parquet sin cargar todo en memoria
- Filtrado automático por particiones (año/mes)
- 10-100x más rápido que PostgreSQL para queries analíticas
- No requiere servidor de base de datos
"""

import duckdb
import pandas as pd
from datetime import datetime
import time

# Ruta a los datos particionados
PARQUET_PATH = '/Users/luisizquierdo/repos/upm/madno2/madno2-viewer/public/data/parquet'

def execute_timed_query(conn, query, description):
    """
    Ejecuta una query y mide el tiempo de ejecución
    """
    print(f"\n⏱️  Ejecutando: {description}")
    start_time = time.time()
    result = conn.execute(query).df()
    end_time = time.time()
    elapsed_ms = (end_time - start_time) * 1000

    print(f"✓ Completado en: {elapsed_ms:.2f} ms ({elapsed_ms/1000:.3f} segundos)")
    return result, elapsed_ms

def example_1_query_specific_cell_and_time():
    """
    Ejemplo 1: Consultar datos de una celda H3 específica en un rango de tiempo
    Similar a tu query SQL original
    """
    print("\n" + "="*60)
    print("Ejemplo 1: Query específica por H3 y hora")
    print("="*60)

    conn = duckdb.connect()

    query = f"""
    SELECT
        h3_index,
        datetime,
        value,
        year,
        month
    FROM read_parquet('{PARQUET_PATH}/**/*.parquet', hive_partitioning=true)
    WHERE h3_index = '89390ca0083ffff'
      AND EXTRACT(HOUR FROM datetime) = 15
      AND year = 2010
      AND month = 12
    ORDER BY datetime
    LIMIT 10
    """

    result, elapsed = execute_timed_query(conn, query, "Query específica por H3 y hora")
    print(f"\nResultados encontrados: {len(result)}")
    print(result)

    return result, elapsed


def example_2_aggregate_by_cell():
    """
    Ejemplo 2: Calcular estadísticas agregadas por celda H3
    """
    print("\n" + "="*60)
    print("Ejemplo 2: Estadísticas por celda H3")
    print("="*60)

    conn = duckdb.connect()

    query = f"""
    SELECT
        h3_index,
        COUNT(*) as num_mediciones,
        AVG(value) as no2_promedio,
        MAX(value) as no2_maximo,
        MIN(value) as no2_minimo,
        STDDEV(value) as desviacion_std
    FROM read_parquet('{PARQUET_PATH}/**/*.parquet', hive_partitioning=true)
    WHERE year = 2010
      AND month = 12
    GROUP BY h3_index
    ORDER BY no2_promedio DESC
    LIMIT 10
    """

    result, elapsed = execute_timed_query(conn, query, "Estadísticas agregadas por celda")
    print(f"\nTop 10 celdas con mayor NO2 promedio en dic-2010:")
    print(result)

    return result, elapsed


def example_3_time_series_analysis():
    """
    Ejemplo 3: Serie temporal para una celda específica
    """
    print("\n" + "="*60)
    print("Ejemplo 3: Serie temporal de una celda")
    print("="*60)

    conn = duckdb.connect()

    query = f"""
    SELECT
        datetime,
        value as no2_level,
        EXTRACT(DOW FROM datetime) as dia_semana,
        EXTRACT(HOUR FROM datetime) as hora
    FROM read_parquet('{PARQUET_PATH}/**/*.parquet', hive_partitioning=true)
    WHERE h3_index = '89390ca0083ffff'
      AND year = 2010
      AND month = 12
    ORDER BY datetime
    """

    result, elapsed = execute_timed_query(conn, query, "Serie temporal de una celda")
    print(f"\nRegistros totales: {len(result)}")
    print(result.head(20))

    # Análisis básico
    print(f"\nEstadísticas:")
    print(f"  Promedio NO2: {result['no2_level'].mean():.2f}")
    print(f"  Máximo NO2: {result['no2_level'].max():.2f}")
    print(f"  Mínimo NO2: {result['no2_level'].min():.2f}")

    return result, elapsed


def example_4_hourly_patterns():
    """
    Ejemplo 4: Patrones por hora del día (promedio de todas las celdas)
    """
    print("\n" + "="*60)
    print("Ejemplo 4: Patrón de NO2 por hora del día")
    print("="*60)

    conn = duckdb.connect()

    query = f"""
    SELECT
        EXTRACT(HOUR FROM datetime) as hora,
        COUNT(*) as num_mediciones,
        AVG(value) as no2_promedio,
        MAX(value) as no2_maximo
    FROM read_parquet('{PARQUET_PATH}/**/*.parquet', hive_partitioning=true)
    WHERE year = 2010
      AND month = 12
    GROUP BY hora
    ORDER BY hora
    """

    result, elapsed = execute_timed_query(conn, query, "Patrón horario de NO2")
    print(f"\nPatrón horario de NO2 en diciembre 2010:")
    print(result)

    return result, elapsed


def example_5_yearly_comparison():
    """
    Ejemplo 5: Comparación año por año (todos los datos)
    """
    print("\n" + "="*60)
    print("Ejemplo 5: Evolución anual del NO2")
    print("="*60)

    conn = duckdb.connect()

    query = f"""
    SELECT
        year,
        COUNT(*) as total_mediciones,
        AVG(value) as no2_promedio,
        MAX(value) as no2_maximo,
        COUNT(DISTINCT h3_index) as num_celdas
    FROM read_parquet('{PARQUET_PATH}/**/*.parquet', hive_partitioning=true)
    GROUP BY year
    ORDER BY year
    """

    result, elapsed = execute_timed_query(conn, query, "Evolución anual (todos los datos)")
    print(f"\nEvolución anual:")
    print(result)

    return result, elapsed


def example_6_filter_by_partition():
    """
    Ejemplo 6: Query eficiente usando filtrado por particiones
    Solo lee los archivos necesarios gracias al particionado
    """
    print("\n" + "="*60)
    print("Ejemplo 6: Query eficiente con particiones")
    print("="*60)

    conn = duckdb.connect()

    # Esta query solo lee 3 archivos (3 meses) en lugar de 120 (10 años x 12 meses)
    query = f"""
    SELECT
        h3_index,
        datetime,
        value
    FROM read_parquet('{PARQUET_PATH}/**/*.parquet', hive_partitioning=true)
    WHERE year = 2010
      AND month IN (10, 11, 12)
    ORDER BY datetime DESC
    LIMIT 100
    """

    result, elapsed = execute_timed_query(conn, query, "Query con filtrado por particiones")
    print(f"\nÚltimos 100 registros de oct-dic 2010:")
    print(result.head(10))
    print(f"\nTotal de registros: {len(result)}")

    return result, elapsed


if __name__ == "__main__":
    print("\n" + "="*60)
    print("EJEMPLOS DE QUERIES SOBRE PARQUET PARTICIONADO")
    print("="*60)
    print(f"\nRuta de datos: {PARQUET_PATH}")
    print("Usando DuckDB para queries eficientes sin servidor\n")

    # Recolectar tiempos de ejecución
    times = []

    # Ejecutar ejemplos
    try:
        _, t1 = example_1_query_specific_cell_and_time()
        times.append(("Query específica por H3 y hora", t1))

        _, t2 = example_2_aggregate_by_cell()
        times.append(("Estadísticas agregadas por celda", t2))

        _, t3 = example_3_time_series_analysis()
        times.append(("Serie temporal de una celda", t3))

        _, t4 = example_4_hourly_patterns()
        times.append(("Patrón horario de NO2", t4))

        _, t5 = example_5_yearly_comparison()
        times.append(("Evolución anual (todos los datos)", t5))

        _, t6 = example_6_filter_by_partition()
        times.append(("Query con filtrado por particiones", t6))

        # Resumen de rendimiento
        print("\n" + "="*60)
        print("RESUMEN DE RENDIMIENTO")
        print("="*60)
        print(f"\n{'Query':<45} {'Tiempo':<15}")
        print("-" * 60)

        total_time = 0
        for query_name, elapsed in times:
            total_time += elapsed
            print(f"{query_name:<45} {elapsed:>8.2f} ms")

        print("-" * 60)
        print(f"{'TOTAL':<45} {total_time:>8.2f} ms")
        print(f"{'PROMEDIO':<45} {total_time/len(times):>8.2f} ms")

        print("\n" + "="*60)
        print("TODOS LOS EJEMPLOS COMPLETADOS")
        print("="*60)

    except Exception as e:
        print(f"\nError: {e}")
        print("\nAsegúrate de tener DuckDB instalado:")
        print("  pip install duckdb")
