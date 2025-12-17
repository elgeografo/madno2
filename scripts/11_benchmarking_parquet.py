#!/usr/bin/env python3
"""
Script de benchmarking para archivos Parquet usando DuckDB.
Realiza las mismas queries que 10_benchmarking.py pero sobre archivos Parquet remotos.

Instalación requerida:
    pip install duckdb pandas

Para acceso remoto vía SSHFS (recomendado):
    macOS: brew install macfuse && brew install gromgit/fuse/sshfs-mac
    Linux: apt-get install sshfs

Ventajas de Parquet + DuckDB:
- Queries SQL directas sobre archivos sin cargar todo en memoria
- Filtrado automático por particiones (año/mes)
- 10-100x más rápido que PostgreSQL para queries analíticas
- No requiere servidor de base de datos
"""

import duckdb
import time
import subprocess
import os
import tempfile
import shutil
from contextlib import contextmanager
from typing import Tuple, Any


@contextmanager
def mount_remote_sshfs(ssh_host: str, ssh_port: int, ssh_user: str,
                       ssh_password: str | None, remote_path: str):
    """
    Monta un directorio remoto vía SSHFS temporalmente.
    Devuelve el path del punto de montaje local.
    """
    # Crear directorio temporal para el punto de montaje
    mount_point = tempfile.mkdtemp(prefix="parquet_remote_")

    try:
        print(f"📁 Montando {ssh_user}@{ssh_host}:{remote_path} en {mount_point}...")

        # Comando SSHFS
        cmd = [
            "sshfs",
            f"{ssh_user}@{ssh_host}:{remote_path}",
            mount_point,
            "-o", f"port={ssh_port}",
            "-o", "StrictHostKeyChecking=no",
            "-o", "reconnect",
            "-o", "ServerAliveInterval=15",
            "-o", "ServerAliveCountMax=3"
        ]

        # Si hay password, intentar con sshpass
        if ssh_password and shutil.which("sshpass"):
            cmd = ["sshpass", "-p", ssh_password] + cmd

        # Montar
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)

        if result.returncode != 0:
            raise RuntimeError(f"Error montando SSHFS: {result.stderr}")

        # Verificar que el montaje fue exitoso
        if not os.path.ismount(mount_point):
            # En macOS, SSHFS puede no marcar como mount point, verificar contenido
            if not os.listdir(mount_point):
                raise RuntimeError(f"El directorio {mount_point} está vacío después del montaje")

        print(f"✓ Directorio remoto montado correctamente\n")

        yield mount_point

    finally:
        # Desmontar
        print(f"\n🔌 Desmontando {mount_point}...")
        try:
            # Intentar umount normal
            subprocess.run(["umount", mount_point], capture_output=True, timeout=10)
            # En macOS puede ser necesario fusermount
            if os.path.ismount(mount_point):
                subprocess.run(["diskutil", "unmount", "force", mount_point],
                             capture_output=True, timeout=10)
        except Exception as e:
            print(f"⚠️ Advertencia al desmontar: {e}")

        # Limpiar directorio temporal
        try:
            os.rmdir(mount_point)
        except Exception:
            pass


def execute_query_benchmark(conn, query: str, query_name: str) -> Tuple[float, Any]:
    """
    Ejecuta una query y mide el tiempo de ejecución.
    Retorna (tiempo_en_segundos, resultado_dataframe)
    """
    print(f"\n{'='*60}")
    print(f"Ejecutando: {query_name}")
    print(f"{'='*60}")
    print(f"Query: {query.strip()}\n")

    start_time = time.time()
    result = conn.execute(query).df()
    end_time = time.time()

    elapsed_time = end_time - start_time

    print(f"Tiempo de ejecución: {elapsed_time:.4f} segundos")
    print(f"Resultados: {len(result)} filas")
    if len(result) > 0 and len(result) <= 10:
        print(f"Datos:\n{result}")
    elif len(result) > 0:
        print(f"Primeras 3 filas:\n{result.head(3)}")

    return elapsed_time, result


def main():
    # ============================================================
    # CONFIGURACIÓN DE PARÁMETROS
    # ============================================================

    # Rango de años a evaluar (ambos inclusive)
    YEAR_FROM = 2005  # Año inicial
    YEAR_TO = 2005    # Año final (si es igual a YEAR_FROM, solo evalúa ese año)

    # Configuración de acceso remoto
    USE_REMOTE = False  # True para archivos remotos vía SSH, False para archivos locales

    # Parámetros SSH (si USE_REMOTE=True)
    SSH_HOST = "138.100.127.190"
    SSH_PORT = 22
    SSH_USER = "upm"
    SSH_PASSWORD = "madrid"
    REMOTE_PARQUET_PATH = "/mnt/datos1/www/spain/madno/parquet"

    # Ruta local (si USE_REMOTE=False)
    LOCAL_PARQUET_PATH = '/Volumes/MV/carto/madno2Parquet'

    # Validar rango de años
    if YEAR_FROM > YEAR_TO:
        print(f"ERROR: YEAR_FROM ({YEAR_FROM}) debe ser menor o igual a YEAR_TO ({YEAR_TO})")
        return

    # Construir descripción del rango y filtro
    if YEAR_FROM == YEAR_TO:
        year_desc = f"año {YEAR_FROM}"
        year_filter = f"year = {YEAR_FROM}"
    else:
        year_desc = f"años {YEAR_FROM} a {YEAR_TO}"
        year_filter = f"year >= {YEAR_FROM} AND year <= {YEAR_TO}"

    # Definir las mismas queries que en PostgreSQL pero adaptadas a DuckDB
    # Nota: PARQUET_PATH se establecerá dinámicamente según USE_REMOTE
    def build_queries(parquet_path):
        return [
            {
                "name": f"Q1: Contar todos los registros del {year_desc}",
                "sql": f"""
                    SELECT COUNT(*) as total
                    FROM read_parquet('{parquet_path}/**/*.parquet', hive_partitioning=true)
                    WHERE {year_filter}
                """
            },
            {
                "name": f"Q2: Promedio de valores por mes en el {year_desc}",
            "sql": f"""
                SELECT
                    month,
                    COUNT(*) as num_registros,
                    AVG(value) as avg_value,
                    MIN(value) as min_value,
                    MAX(value) as max_value
                FROM read_parquet('{parquet_path}/**/*.parquet', hive_partitioning=true)
                WHERE {year_filter}
                GROUP BY month
                ORDER BY month
            """
        },
        {
            "name": f"Q4: Top 10 celdas H3 con mayor valor promedio en el {year_desc}",
            "sql": f"""
                SELECT
                    h3_index,
                    COUNT(*) as num_mediciones,
                    AVG(value) as avg_value,
                    MAX(value) as max_value
                FROM read_parquet('{parquet_path}/**/*.parquet', hive_partitioning=true)
                WHERE {year_filter}
                GROUP BY h3_index
                ORDER BY avg_value DESC
                LIMIT 10
            """
        },
        {
            "name": f"Q5: Registros de una fecha específica ({YEAR_FROM}-07-15)",
            "sql": f"""
                SELECT
                    COUNT(*) as total,
                    AVG(value) as avg_value
                FROM read_parquet('{parquet_path}/**/*.parquet', hive_partitioning=true)
                WHERE year = {YEAR_FROM}
                  AND month = 7
                  AND EXTRACT(DAY FROM datetime) = 15
            """
        },
        {
            "name": f"Q6: Rango de fechas disponibles en el {year_desc}",
            "sql": f"""
                SELECT
                    MIN(datetime) as fecha_min,
                    MAX(datetime) as fecha_max,
                    COUNT(DISTINCT year) as num_years
                FROM read_parquet('{parquet_path}/**/*.parquet', hive_partitioning=true)
                WHERE {year_filter}
            """
        },
        {
            "name": f"Q7: Estadísticas generales por año ({year_desc})",
            "sql": f"""
                SELECT
                    year,
                    COUNT(*) as num_registros,
                    AVG(value) as avg_value,
                    STDDEV(value) as stddev_value
                FROM read_parquet('{parquet_path}/**/*.parquet', hive_partitioning=true)
                WHERE {year_filter}
                GROUP BY year
                ORDER BY year
            """
        },
        {
            "name": f"Q8: Patrón horario de NO2 en el {year_desc}",
            "sql": f"""
                SELECT
                    EXTRACT(HOUR FROM datetime) as hora,
                    COUNT(*) as num_mediciones,
                    AVG(value) as no2_promedio,
                    MAX(value) as no2_maximo,
                    MIN(value) as no2_minimo
                FROM read_parquet('{parquet_path}/**/*.parquet', hive_partitioning=true)
                WHERE {year_filter}
                GROUP BY hora
                ORDER BY hora
            """
        },
        {
            "name": f"Q9: Días con mayor contaminación promedio en el {year_desc}",
            "sql": f"""
                SELECT
                    EXTRACT(MONTH FROM datetime) as mes,
                    EXTRACT(DAY FROM datetime) as dia,
                    COUNT(*) as mediciones,
                    AVG(value) as no2_promedio,
                    MAX(value) as no2_maximo
                FROM read_parquet('{parquet_path}/**/*.parquet', hive_partitioning=true)
                WHERE {year_filter}
                GROUP BY mes, dia
                ORDER BY no2_promedio DESC
                LIMIT 10
            """
        },
        {
            "name": f"Q10: Percentiles de NO2 en el {year_desc}",
            "sql": f"""
                SELECT
                    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY value) as p25,
                    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY value) as p50_mediana,
                    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY value) as p75,
                    PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY value) as p90,
                    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) as p95,
                    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY value) as p99
                FROM read_parquet('{parquet_path}/**/*.parquet', hive_partitioning=true)
                WHERE {year_filter}
            """
            }
        ]

    print("="*60)
    print("BENCHMARKING DE CONSULTAS SQL - PARQUET + DuckDB")
    print("="*60)
    print(f"Rango de evaluación: {year_desc}")

    if USE_REMOTE:
        print(f"Modo: REMOTO vía SSHFS")
        print(f"SSH Host: {SSH_HOST}:{SSH_PORT}")
        print(f"SSH User: {SSH_USER}")
        print(f"Ruta remota: {REMOTE_PARQUET_PATH}")
    else:
        print(f"Modo: LOCAL")
        print(f"Ruta local: {LOCAL_PARQUET_PATH}")

    print("="*60)

    # Determinar la ruta según el modo
    if USE_REMOTE:
        # Montar directorio remoto vía SSHFS
        with mount_remote_sshfs(SSH_HOST, SSH_PORT, SSH_USER, SSH_PASSWORD,
                                REMOTE_PARQUET_PATH) as mount_point:
            PARQUET_PATH = mount_point
            queries = build_queries(PARQUET_PATH)
            print(f"Total de queries: {len(queries)}")
            print("="*60)

            # Crear conexión a DuckDB (en memoria)
            conn = duckdb.connect()
            results = []

            for query in queries:
                try:
                    elapsed_time, result = execute_query_benchmark(
                        conn,
                        query["sql"].strip(),
                        query["name"]
                    )
                    results.append({
                        "name": query["name"],
                        "time": elapsed_time,
                        "success": True
                    })
                except Exception as e:
                    print(f"ERROR: {e}")
                    results.append({
                        "name": query["name"],
                        "time": None,
                        "success": False,
                        "error": str(e)
                    })

            # Cerrar conexión
            conn.close()
    else:
        # Modo local
        PARQUET_PATH = LOCAL_PARQUET_PATH
        queries = build_queries(PARQUET_PATH)
        print(f"Total de queries: {len(queries)}")
        print("="*60)

        # Crear conexión a DuckDB (en memoria)
        conn = duckdb.connect()
        results = []

        for query in queries:
            try:
                elapsed_time, result = execute_query_benchmark(
                    conn,
                    query["sql"].strip(),
                    query["name"]
                )
                results.append({
                    "name": query["name"],
                    "time": elapsed_time,
                    "success": True
                })
            except Exception as e:
                print(f"ERROR: {e}")
                results.append({
                    "name": query["name"],
                    "time": None,
                    "success": False,
                    "error": str(e)
                })

        # Cerrar conexión
        conn.close()

    # Resumen final
    print("\n" + "="*60)
    print("RESUMEN DE BENCHMARKS")
    print("="*60)
    for r in results:
        if r["success"]:
            print(f"{r['name']}: {r['time']:.4f}s ({r['time']*1000:.2f}ms)")
        else:
            print(f"{r['name']}: FAILED - {r.get('error', 'Unknown error')}")

    print("="*60)

    # Calcular tiempo total
    successful_results = [r for r in results if r["success"]]
    if successful_results:
        total_time = sum([r["time"] for r in successful_results])
        print(f"Tiempo total de ejecución: {total_time:.4f}s ({total_time*1000:.2f}ms)")
        print(f"Tiempo promedio por query: {total_time/len(successful_results):.4f}s ({(total_time/len(successful_results))*1000:.2f}ms)")
        print(f"Consultas exitosas: {len(successful_results)}/{len(results)}")
    else:
        print("No se completó ninguna consulta exitosamente.")

    print("="*60)

    # Comparación con PostgreSQL (valores esperados aproximados)
    print("\n" + "="*60)
    print("COMPARACIÓN APROXIMADA CON POSTGRESQL")
    print("="*60)
    print("Nota: Los tiempos de PostgreSQL dependen de la red, índices, caché, etc.")
    print("DuckDB + Parquet suele ser 10-100x más rápido para queries analíticas")
    print("sobre archivos locales gracias a:")
    print("  - Formato columnar (Parquet)")
    print("  - Ejecución vectorizada (DuckDB)")
    print("  - Sin latencia de red")
    print("  - Particionado eficiente (year/month)")
    print("="*60)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n❌ Error crítico: {e}")
        import traceback
        traceback.print_exc()
        print("\nAsegúrate de que:")
        print("1. DuckDB esté instalado: pip install duckdb")
        print("2. Si USE_REMOTE=True:")
        print("   - SSHFS esté instalado:")
        print("     macOS: brew install macfuse && brew install gromgit/fuse/sshfs-mac")
        print("     Linux: apt-get install sshfs")
        print("   - Puedas conectarte por SSH al servidor")
        print("3. Si USE_REMOTE=False:")
        print("   - La ruta local a los archivos Parquet sea correcta")
        print("   - Los archivos Parquet existan en la ruta especificada")
