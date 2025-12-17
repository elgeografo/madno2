#!/usr/bin/env python3
"""
Script de benchmarking comparativo entre PostgreSQL y Parquet.
Ejecuta múltiples escenarios de benchmarking y genera un CSV con los resultados.

Escenarios:
1. Año único: 2005
2. Rango corto: 2005-2009 (5 años)
3. Rango largo: 2001-2010 (10 años)

Instalación requerida:
    pip install psycopg2 duckdb pandas

Uso:
    python3 scripts/12_comparative_benchmarking.py
"""

import subprocess
import csv
import json
import time
from datetime import datetime
from pathlib import Path


def run_benchmark_script(script_path: str, year_from: int, year_to: int) -> dict:
    """
    Ejecuta un script de benchmarking modificando los parámetros YEAR_FROM y YEAR_TO.
    Retorna un diccionario con los resultados parseados.
    """
    print(f"\n{'='*80}")
    print(f"Ejecutando {script_path} para años {year_from}-{year_to}")
    print(f"{'='*80}")

    # Leer el script original
    with open(script_path, 'r') as f:
        script_content = f.read()

    # Modificar YEAR_FROM y YEAR_TO
    modified_content = script_content

    # Reemplazar YEAR_FROM
    import re
    modified_content = re.sub(
        r'YEAR_FROM\s*=\s*\d+',
        f'YEAR_FROM = {year_from}',
        modified_content
    )

    # Reemplazar YEAR_TO
    modified_content = re.sub(
        r'YEAR_TO\s*=\s*\d+',
        f'YEAR_TO = {year_to}',
        modified_content
    )

    # Crear archivo temporal
    temp_script = script_path.replace('.py', '_temp.py')
    with open(temp_script, 'w') as f:
        f.write(modified_content)

    try:
        # Ejecutar el script y capturar la salida
        start_time = time.time()
        result = subprocess.run(
            ['python3', temp_script],
            capture_output=True,
            text=True,
            timeout=600  # 10 minutos timeout
        )
        total_execution_time = time.time() - start_time

        print(result.stdout)

        if result.returncode != 0:
            print(f"ERROR: {result.stderr}")
            return {
                'success': False,
                'error': result.stderr,
                'total_time': total_execution_time
            }

        # Parsear la salida para extraer los resultados
        output = result.stdout
        results = {
            'success': True,
            'queries': [],
            'total_time': total_execution_time,
            'year_from': year_from,
            'year_to': year_to
        }

        # Buscar el resumen de benchmarks en la salida
        lines = output.split('\n')
        in_summary = False

        for line in lines:
            if 'RESUMEN DE BENCHMARKS' in line:
                in_summary = True
                continue

            if in_summary and line.strip().startswith('Q'):
                # Formato: "Q1: Nombre: X.XXXXs" o "Q1: Nombre: FAILED"
                parts = line.split(':')
                if len(parts) >= 3:
                    query_name = ':'.join(parts[:-1]).strip()
                    time_str = parts[-1].strip()

                    if 'FAILED' in time_str:
                        results['queries'].append({
                            'query': query_name,
                            'time': None,
                            'success': False
                        })
                    else:
                        # Extraer tiempo (puede estar en formato "X.XXXXs" o "X.XXXXs (XXX.XXms)")
                        time_match = re.search(r'([\d.]+)s', time_str)
                        if time_match:
                            results['queries'].append({
                                'query': query_name,
                                'time': float(time_match.group(1)),
                                'success': True
                            })

            # Detectar fin del resumen
            if in_summary and '=' * 20 in line and len(results['queries']) > 0:
                break

        return results

    except subprocess.TimeoutExpired:
        print(f"TIMEOUT: El script tardó más de 10 minutos")
        return {
            'success': False,
            'error': 'Timeout después de 10 minutos',
            'total_time': 600
        }
    except Exception as e:
        print(f"ERROR: {e}")
        return {
            'success': False,
            'error': str(e),
            'total_time': 0
        }
    finally:
        # Limpiar archivo temporal
        try:
            Path(temp_script).unlink()
        except Exception:
            pass


def main():
    print("="*80)
    print("BENCHMARKING COMPARATIVO: PostgreSQL vs Parquet")
    print("="*80)
    print(f"Fecha de ejecución: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    # Definir escenarios
    scenarios = [
        {'name': 'Año único (2005)', 'year_from': 2005, 'year_to': 2005},
        {'name': 'Rango corto (2005-2009)', 'year_from': 2005, 'year_to': 2009},
        {'name': 'Rango largo (2001-2010)', 'year_from': 2001, 'year_to': 2010},
    ]

    # Rutas a los scripts
    scripts_dir = Path(__file__).parent
    pg_script = scripts_dir / '10_benchmarking.py'
    parquet_script = scripts_dir / '11_benchmarking_parquet.py'

    # Verificar que los scripts existen
    if not pg_script.exists():
        print(f"ERROR: No se encontró {pg_script}")
        return

    if not parquet_script.exists():
        print(f"ERROR: No se encontró {parquet_script}")
        return

    # Almacenar todos los resultados
    all_results = []

    # Ejecutar cada escenario
    for scenario in scenarios:
        print(f"\n{'#'*80}")
        print(f"ESCENARIO: {scenario['name']}")
        print(f"{'#'*80}")

        year_from = scenario['year_from']
        year_to = scenario['year_to']

        # Ejecutar PostgreSQL
        print("\n--- PostgreSQL ---")
        pg_results = run_benchmark_script(str(pg_script), year_from, year_to)

        # Ejecutar Parquet
        print("\n--- Parquet + DuckDB ---")
        parquet_results = run_benchmark_script(str(parquet_script), year_from, year_to)

        # Combinar resultados
        if pg_results['success'] and parquet_results['success']:
            # Emparejar queries por nombre
            for pg_query in pg_results['queries']:
                query_name = pg_query['query']

                # Buscar la query correspondiente en parquet
                parquet_query = next(
                    (q for q in parquet_results['queries'] if q['query'] == query_name),
                    None
                )

                if parquet_query:
                    all_results.append({
                        'scenario': scenario['name'],
                        'year_from': year_from,
                        'year_to': year_to,
                        'query': query_name,
                        'postgresql_time_s': pg_query['time'] if pg_query['success'] else None,
                        'parquet_time_s': parquet_query['time'] if parquet_query['success'] else None,
                        'speedup': (
                            pg_query['time'] / parquet_query['time']
                            if pg_query['success'] and parquet_query['success'] and parquet_query['time'] > 0
                            else None
                        ),
                        'postgresql_success': pg_query['success'],
                        'parquet_success': parquet_query['success']
                    })

        # Agregar tiempos totales
        all_results.append({
            'scenario': scenario['name'],
            'year_from': year_from,
            'year_to': year_to,
            'query': 'TOTAL',
            'postgresql_time_s': pg_results.get('total_time'),
            'parquet_time_s': parquet_results.get('total_time'),
            'speedup': (
                pg_results.get('total_time', 0) / parquet_results.get('total_time', 1)
                if pg_results.get('total_time') and parquet_results.get('total_time')
                else None
            ),
            'postgresql_success': pg_results['success'],
            'parquet_success': parquet_results['success']
        })

    # Generar CSV con resultados
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    csv_filename = scripts_dir / f'benchmark_results_{timestamp}.csv'

    print(f"\n{'='*80}")
    print(f"Guardando resultados en: {csv_filename}")
    print(f"{'='*80}\n")

    with open(csv_filename, 'w', newline='') as csvfile:
        fieldnames = [
            'scenario',
            'year_from',
            'year_to',
            'query',
            'postgresql_time_s',
            'parquet_time_s',
            'speedup',
            'postgresql_success',
            'parquet_success'
        ]

        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()

        for result in all_results:
            writer.writerow(result)

    # Mostrar resumen
    print("\nRESUMEN DE RESULTADOS:")
    print("="*80)

    for scenario in scenarios:
        scenario_results = [r for r in all_results if r['scenario'] == scenario['name'] and r['query'] != 'TOTAL']
        total_result = next((r for r in all_results if r['scenario'] == scenario['name'] and r['query'] == 'TOTAL'), None)

        print(f"\n{scenario['name']}:")
        print(f"  Queries exitosas (PostgreSQL): {sum(1 for r in scenario_results if r['postgresql_success'])}/{len(scenario_results)}")
        print(f"  Queries exitosas (Parquet): {sum(1 for r in scenario_results if r['parquet_success'])}/{len(scenario_results)}")

        if total_result:
            print(f"  Tiempo total PostgreSQL: {total_result['postgresql_time_s']:.2f}s")
            print(f"  Tiempo total Parquet: {total_result['parquet_time_s']:.2f}s")
            if total_result['speedup']:
                print(f"  Speedup general: {total_result['speedup']:.2f}x")

        # Calcular speedup promedio de queries exitosas
        successful_speedups = [
            r['speedup'] for r in scenario_results
            if r['speedup'] is not None and r['postgresql_success'] and r['parquet_success']
        ]

        if successful_speedups:
            avg_speedup = sum(successful_speedups) / len(successful_speedups)
            print(f"  Speedup promedio por query: {avg_speedup:.2f}x")

    print(f"\n{'='*80}")
    print(f"Resultados guardados en: {csv_filename}")
    print(f"{'='*80}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nInterrumpido por el usuario")
    except Exception as e:
        print(f"\n❌ Error crítico: {e}")
        import traceback
        traceback.print_exc()
