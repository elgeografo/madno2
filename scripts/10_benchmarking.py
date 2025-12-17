#!/usr/bin/env python3
import psycopg2
import time
import subprocess
import socket
import shutil
from contextlib import contextmanager
from typing import Tuple, Any


@contextmanager
def get_conn(host: str, dbname: str, user: str, password: str, port: int = 5432):
    """Context manager para conexión a PostgreSQL"""
    conn = psycopg2.connect(host=host, dbname=dbname, user=user, password=password, port=port)
    try:
        yield conn
    finally:
        conn.close()


@contextmanager
def open_system_ssh_tunnel(ssh_host: str, ssh_port: int, ssh_user: str,
                            ssh_password: str | None,
                            remote_pg_host: str, remote_pg_port: int):
    """
    Abre un túnel SSH usando el binario del sistema `ssh`. Si `sshpass` está disponible y
    se proporciona `ssh_password`, se usará para evitar prompts interactivos.
    Devuelve (local_host, local_port).
    """
    if not shutil.which("ssh"):
        raise RuntimeError("No se encontró el binario 'ssh' en PATH.")

    # Reserva un puerto local libre
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        _, local_port = s.getsockname()
    local_host = "127.0.0.1"

    base_ssh = [
        "ssh",
        "-N",
        "-L", f"{local_host}:{local_port}:{remote_pg_host}:{remote_pg_port}",
        "-p", str(ssh_port),
        "-o", "ExitOnForwardFailure=yes",
        "-o", "ServerAliveInterval=30",
        "-o", "StrictHostKeyChecking=no",
        f"{ssh_user}@{ssh_host}",
    ]

    # Si hay password y sshpass disponible, úsalo
    if ssh_password and shutil.which("sshpass"):
        cmd = ["sshpass", "-p", ssh_password] + base_ssh
    else:
        cmd = base_ssh

    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    try:
        # Espera hasta que el puerto esté levantado o se agote el tiempo
        deadline = time.time() + 15
        last_err = None
        while time.time() < deadline:
            try:
                with socket.create_connection((local_host, local_port), timeout=0.3):
                    break
            except Exception as e:
                last_err = e
                time.sleep(0.2)
        else:
            stderr = b""
            try:
                stderr = proc.stderr.read(4000) or b""
            except Exception:
                pass
            raise RuntimeError(f"No se pudo establecer el túnel SSH en {local_host}:{local_port}. Detalle: {last_err}\n{stderr.decode(errors='ignore')}")

        yield (local_host, local_port)
    finally:
        if proc and proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()


def execute_query_benchmark(cur, query: str, query_name: str) -> Tuple[float, Any]:
    """
    Ejecuta una query y mide el tiempo de ejecución.
    Retorna (tiempo_en_segundos, resultado)
    """
    print(f"\n{'='*60}")
    print(f"Ejecutando: {query_name}")
    print(f"{'='*60}")
    print(f"Query: {query}\n")

    start_time = time.time()
    cur.execute(query)
    result = cur.fetchall()
    end_time = time.time()

    elapsed_time = end_time - start_time

    print(f"Tiempo de ejecución: {elapsed_time:.4f} segundos")
    print(f"Resultados: {len(result)} filas")
    if len(result) > 0 and len(result) <= 10:
        print(f"Datos: {result}")
    elif len(result) > 0:
        print(f"Primeras 3 filas: {result[:3]}")

    return elapsed_time, result


def main():
    # ============================================================
    # CONFIGURACIÓN DE PARÁMETROS
    # ============================================================

    # Rango de años a evaluar (ambos inclusive)
    YEAR_FROM = 2005  # Año inicial
    YEAR_TO = 2009    # Año final (si es igual a YEAR_FROM, solo evalúa ese año)

    # Modo de conexión
    USE_REMOTE = False  # True para PostgreSQL remoto vía SSH, False para PostgreSQL local

    # Parámetros para conexión REMOTA (si USE_REMOTE=True)
    SSH_HOST = "138.100.127.190"
    SSH_PORT = 22
    SSH_USER = "upm"
    SSH_PASSWORD = "madrid"
    REMOTE_PG_HOST = "127.0.0.1"
    REMOTE_PG_PORT = 5432

    # Parámetros para conexión LOCAL (si USE_REMOTE=False)
    LOCAL_PG_HOST = "localhost"
    LOCAL_PG_PORT = 5432

    # Parámetros de conexión PostgreSQL (comunes)
    DBNAME = "gis"
    USER = "gis"
    PASSWORD = "hjJ7_hj76HHjdftGg"
    SCHEMA = "madno"
    TABLE = "h3_points"

    # Validar rango de años
    if YEAR_FROM > YEAR_TO:
        print(f"ERROR: YEAR_FROM ({YEAR_FROM}) debe ser menor o igual a YEAR_TO ({YEAR_TO})")
        return

    # Construir descripción del rango
    if YEAR_FROM == YEAR_TO:
        year_desc = f"año {YEAR_FROM}"
        year_filter = f"dt >= '{YEAR_FROM}-01-01' AND dt < '{YEAR_FROM + 1}-01-01'"
    else:
        year_desc = f"años {YEAR_FROM} a {YEAR_TO}"
        year_filter = f"dt >= '{YEAR_FROM}-01-01' AND dt < '{YEAR_TO + 1}-01-01'"

    # Definir las queries a benchmarking
    queries = [
        {
            "name": f"Q1: Contar todos los registros del {year_desc}",
            "sql": f"""
                SELECT COUNT(*)
                FROM {SCHEMA}.{TABLE}
                WHERE {year_filter}
            """
        },
        {
            "name": f"Q2: Promedio de valores por mes en el {year_desc}",
            "sql": f"""
                SELECT
                    DATE_TRUNC('month', dt) as month,
                    COUNT(*) as num_registros,
                    AVG(value) as avg_value,
                    MIN(value) as min_value,
                    MAX(value) as max_value
                FROM {SCHEMA}.{TABLE}
                WHERE {year_filter}
                GROUP BY DATE_TRUNC('month', dt)
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
                FROM {SCHEMA}.{TABLE}
                WHERE {year_filter}
                GROUP BY h3_index
                ORDER BY avg_value DESC
                LIMIT 10
            """
        },
        {
            "name": f"Q5: Registros de una fecha específica ({YEAR_FROM}-07-15)",
            "sql": f"""
                SELECT COUNT(*), AVG(value)
                FROM {SCHEMA}.{TABLE}
                WHERE dt >= '{YEAR_FROM}-07-15' AND dt < '{YEAR_FROM}-07-16'
            """
        },
        {
            "name": f"Q6: Rango de fechas disponibles en el {year_desc}",
            "sql": f"""
                SELECT
                    MIN(dt) as fecha_min,
                    MAX(dt) as fecha_max,
                    COUNT(DISTINCT DATE_TRUNC('year', dt)) as num_years
                FROM {SCHEMA}.{TABLE}
                WHERE {year_filter}
            """
        },
        {
            "name": f"Q7: Estadísticas generales por año ({year_desc})",
            "sql": f"""
                SELECT
                    DATE_TRUNC('year', dt) as year,
                    COUNT(*) as num_registros,
                    AVG(value) as avg_value,
                    STDDEV(value) as stddev_value
                FROM {SCHEMA}.{TABLE}
                WHERE {year_filter}
                GROUP BY DATE_TRUNC('year', dt)
                ORDER BY year
            """
        },
        {
            "name": f"Q8: Patrón horario de NO2 en el {year_desc}",
            "sql": f"""
                SELECT
                    EXTRACT(HOUR FROM dt) as hora,
                    COUNT(*) as num_mediciones,
                    AVG(value) as no2_promedio,
                    MAX(value) as no2_maximo,
                    MIN(value) as no2_minimo
                FROM {SCHEMA}.{TABLE}
                WHERE {year_filter}
                GROUP BY EXTRACT(HOUR FROM dt)
                ORDER BY hora
            """
        },
        {
            "name": f"Q9: Días con mayor contaminación promedio en el {year_desc}",
            "sql": f"""
                SELECT
                    EXTRACT(MONTH FROM dt) as mes,
                    EXTRACT(DAY FROM dt) as dia,
                    COUNT(*) as mediciones,
                    AVG(value) as no2_promedio,
                    MAX(value) as no2_maximo
                FROM {SCHEMA}.{TABLE}
                WHERE {year_filter}
                GROUP BY EXTRACT(MONTH FROM dt), EXTRACT(DAY FROM dt)
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
                FROM {SCHEMA}.{TABLE}
                WHERE {year_filter}
            """
        }
    ]

    print("="*60)
    print("BENCHMARKING DE CONSULTAS SQL - PostgreSQL")
    print("="*60)
    print(f"Rango de evaluación: {year_desc}")
    if USE_REMOTE:
        print(f"Modo: REMOTO vía túnel SSH")
        print(f"SSH Host: {SSH_HOST}:{SSH_PORT}")
        print(f"SSH User: {SSH_USER}")
        print(f"PostgreSQL (remoto): {REMOTE_PG_HOST}:{REMOTE_PG_PORT}")
    else:
        print(f"Modo: LOCAL")
        print(f"PostgreSQL (local): {LOCAL_PG_HOST}:{LOCAL_PG_PORT}")
    print(f"Database: {DBNAME}")
    print(f"Schema.Table: {SCHEMA}.{TABLE}")
    print("="*60)

    # Conectar y ejecutar queries
    if USE_REMOTE:
        # Conexión remota vía SSH tunnel
        print(f"\nEstableciendo túnel SSH a {SSH_USER}@{SSH_HOST}:{SSH_PORT}...")
        with open_system_ssh_tunnel(SSH_HOST, SSH_PORT, SSH_USER, SSH_PASSWORD,
                                    REMOTE_PG_HOST, REMOTE_PG_PORT) as (local_host, local_port):
            print(f"✓ Túnel SSH establecido: {local_host}:{local_port} -> {REMOTE_PG_HOST}:{REMOTE_PG_PORT}\n")

            with get_conn(local_host, DBNAME, USER, PASSWORD, local_port) as conn:
                with conn.cursor() as cur:
                    results = []

                    for query in queries:
                        try:
                            elapsed_time, result = execute_query_benchmark(
                                cur,
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

                    # Resumen final
                    print("\n" + "="*60)
                    print("RESUMEN DE BENCHMARKS")
                    print("="*60)
                    for r in results:
                        if r["success"]:
                            print(f"{r['name']}: {r['time']:.4f}s")
                        else:
                            print(f"{r['name']}: FAILED - {r.get('error', 'Unknown error')}")

                    print("="*60)

                    # Calcular tiempo total
                    total_time = sum([r["time"] for r in results if r["success"]])
                    print(f"Tiempo total de ejecución: {total_time:.4f}s")
                    print(f"Consultas exitosas: {sum([1 for r in results if r['success']])}/{len(results)}")
                    print("="*60)
    else:
        # Conexión local directa
        print(f"\nConectando a PostgreSQL local en {LOCAL_PG_HOST}:{LOCAL_PG_PORT}...\n")
        with get_conn(LOCAL_PG_HOST, DBNAME, USER, PASSWORD, LOCAL_PG_PORT) as conn:
            with conn.cursor() as cur:
                results = []

                for query in queries:
                    try:
                        elapsed_time, result = execute_query_benchmark(
                            cur,
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

                # Resumen final
                print("\n" + "="*60)
                print("RESUMEN DE BENCHMARKS")
                print("="*60)
                for r in results:
                    if r["success"]:
                        print(f"{r['name']}: {r['time']:.4f}s")
                    else:
                        print(f"{r['name']}: FAILED - {r.get('error', 'Unknown error')}")

                print("="*60)

                # Calcular tiempo total
                total_time = sum([r["time"] for r in results if r["success"]])
                print(f"Tiempo total de ejecución: {total_time:.4f}s")
                print(f"Consultas exitosas: {sum([1 for r in results if r['success']])}/{len(results)}")
                print("="*60)


if __name__ == "__main__":
    main()
