#!/usr/bin/env python3
"""
Script para calcular el tamaño total de datos futuros CMIP6 sin descargarlos
Solo consulta los headers HTTP para obtener el tamaño de cada archivo
"""

import requests
from pathlib import Path
from typing import List, Optional
import time

# Configuración
BASE_URL = "https://geodata.ucdavis.edu/cmip6/30s"
RESOLUTION = "30s"

# Modelos climáticos globales disponibles (GCMs)
GCM_MODELS = [
    'ACCESS-CM2',
    'BCC-CSM2-MR',
    'CMCC-ESM2',
    'EC-Earth3-Veg',
    'FIO-ESM-2-0',
    'GFDL-ESM4',
    'GISS-E2-1-G',
    'HadGEM3-GC31-LL',
    'INM-CM5-0',
    'IPSL-CM6A-LR',
    'MIROC6',
    'MPI-ESM1-2-HR',
    'MRI-ESM2-0',
    'UKESM1-0-LL'
]

# Escenarios SSP
SSP_SCENARIOS = ['ssp126', 'ssp245', 'ssp370', 'ssp585']

# Períodos temporales
TIME_PERIODS = ['2021-2040', '2041-2060', '2061-2080', '2081-2100']

# Variables climáticas
VARIABLES = ['tmin', 'tmax', 'prec', 'bioc']


def get_file_size(url: str, retries: int = 3) -> tuple[int, bool]:
    """
    Obtiene el tamaño de un archivo sin descargarlo usando HEAD request

    Args:
        url: URL del archivo
        retries: Número de reintentos si falla

    Returns:
        tuple: (tamaño en bytes, existe)
    """
    for attempt in range(retries):
        try:
            response = requests.head(url, timeout=10, allow_redirects=True)

            if response.status_code == 200:
                size = int(response.headers.get('content-length', 0))
                return (size, True)
            elif response.status_code == 404:
                return (0, False)
            else:
                # Código inesperado, reintentar
                time.sleep(1)
                continue

        except requests.exceptions.RequestException as e:
            if attempt < retries - 1:
                time.sleep(1)
                continue
            else:
                print(f"  ⚠️  Error al consultar: {url.split('/')[-1]}")
                return (0, False)

    return (0, False)


def build_url(gcm: str, ssp: str, variable: str, period: str) -> str:
    """Construye la URL de descarga para un archivo específico"""
    filename = f"wc2.1_{RESOLUTION}_{variable}_{gcm}_{ssp}_{period}.tif"
    url = f"{BASE_URL}/{gcm}/{ssp}/{filename}"
    return url


def check_cmip6_data_size(
    gcms: Optional[List[str]] = None,
    ssps: Optional[List[str]] = None,
    variables: Optional[List[str]] = None,
    periods: Optional[List[str]] = None,
    verbose: bool = True
) -> dict:
    """
    Calcula el tamaño total de datos CMIP6 a descargar

    Args:
        gcms: Lista de modelos GCM (None = todos)
        ssps: Lista de escenarios SSP (None = todos)
        variables: Lista de variables (None = todas)
        periods: Lista de períodos (None = todos)
        verbose: Mostrar detalles por archivo

    Returns:
        dict: Estadísticas de tamaño
    """
    # Usar valores por defecto si no se especifican
    if gcms is None:
        gcms = GCM_MODELS
    if ssps is None:
        ssps = SSP_SCENARIOS
    if variables is None:
        variables = VARIABLES
    if periods is None:
        periods = TIME_PERIODS

    total_files = len(gcms) * len(ssps) * len(variables) * len(periods)

    print(f"\n🔍 Calculando tamaño de datos CMIP6 de WorldClim")
    print(f"   Resolución: {RESOLUTION} (~1 km²)")
    print(f"   Modelos GCM: {len(gcms)}")
    print(f"   Escenarios SSP: {len(ssps)}")
    print(f"   Variables: {len(variables)}")
    print(f"   Períodos: {len(periods)}")
    print(f"   Total archivos: {total_files}\n")
    print(f"⏳ Consultando tamaños (esto puede tardar unos minutos)...\n")

    total_size = 0
    file_counter = 0
    existing_files = 0
    missing_files = 0
    file_sizes = []

    # Estadísticas por categoría
    size_by_variable = {var: 0 for var in variables}
    size_by_gcm = {gcm: 0 for gcm in gcms}
    size_by_ssp = {ssp: 0 for ssp in ssps}
    size_by_period = {period: 0 for period in periods}

    for gcm in gcms:
        for ssp in ssps:
            for variable in variables:
                for period in periods:
                    file_counter += 1

                    url = build_url(gcm, ssp, variable, period)
                    filename = url.split('/')[-1]

                    if verbose:
                        print(f"[{file_counter}/{total_files}] {filename[:50]}...", end=' ', flush=True)

                    size, exists = get_file_size(url)

                    if exists:
                        total_size += size
                        existing_files += 1
                        file_sizes.append(size)

                        # Acumular por categoría
                        size_by_variable[variable] += size
                        size_by_gcm[gcm] += size
                        size_by_ssp[ssp] += size
                        size_by_period[period] += size

                        if verbose:
                            size_gb = size / (1024**3)
                            print(f"✓ {size_gb:.2f} GB")
                    else:
                        missing_files += 1
                        if verbose:
                            print(f"✗ No disponible")

                    # Pequeña pausa para no saturar el servidor
                    time.sleep(0.1)

    # Calcular estadísticas
    total_gb = total_size / (1024**3)
    total_tb = total_size / (1024**4)

    if file_sizes:
        avg_size = sum(file_sizes) / len(file_sizes)
        avg_gb = avg_size / (1024**3)
        min_size = min(file_sizes) / (1024**3)
        max_size = max(file_sizes) / (1024**3)
    else:
        avg_gb = min_size = max_size = 0

    # Imprimir resumen
    print(f"\n{'='*70}")
    print(f"\n📊 RESUMEN")
    print(f"   Archivos disponibles: {existing_files}/{total_files}")
    print(f"   Archivos no disponibles: {missing_files}")

    print(f"\n💾 TAMAÑO TOTAL")
    if total_tb >= 1:
        print(f"   {total_tb:.2f} TB ({total_gb:.2f} GB)")
    else:
        print(f"   {total_gb:.2f} GB")

    if file_sizes:
        print(f"\n📈 ESTADÍSTICAS POR ARCHIVO")
        print(f"   Promedio: {avg_gb:.2f} GB")
        print(f"   Mínimo: {min_size:.2f} GB")
        print(f"   Máximo: {max_size:.2f} GB")

    # Tamaño por variable
    print(f"\n📦 TAMAÑO POR VARIABLE")
    for var in variables:
        var_gb = size_by_variable[var] / (1024**3)
        var_files = len(gcms) * len(ssps) * len(periods)
        print(f"   {var:4s}: {var_gb:7.2f} GB ({var_files} archivos)")

    # Tamaño por modelo (top 5)
    print(f"\n🌍 TAMAÑO POR MODELO GCM (Top 5)")
    sorted_gcms = sorted(size_by_gcm.items(), key=lambda x: x[1], reverse=True)
    for gcm, size in sorted_gcms[:5]:
        gcm_gb = size / (1024**3)
        gcm_files = len(ssps) * len(variables) * len(periods)
        print(f"   {gcm:20s}: {gcm_gb:7.2f} GB ({gcm_files} archivos)")

    # Tamaño por escenario
    print(f"\n🔮 TAMAÑO POR ESCENARIO SSP")
    for ssp in ssps:
        ssp_gb = size_by_ssp[ssp] / (1024**3)
        ssp_files = len(gcms) * len(variables) * len(periods)
        print(f"   {ssp:6s}: {ssp_gb:7.2f} GB ({ssp_files} archivos)")

    # Tamaño por período
    print(f"\n📅 TAMAÑO POR PERÍODO")
    for period in periods:
        period_gb = size_by_period[period] / (1024**3)
        period_files = len(gcms) * len(ssps) * len(variables)
        print(f"   {period}: {period_gb:7.2f} GB ({period_files} archivos)")

    # Estimación de tiempo
    print(f"\n⏱️  ESTIMACIÓN DE TIEMPO DE DESCARGA")
    # Diferentes velocidades de conexión
    speeds = [
        ("10 Mbps", 10 * 1024 * 1024 / 8),
        ("100 Mbps", 100 * 1024 * 1024 / 8),
        ("1 Gbps", 1000 * 1024 * 1024 / 8),
    ]

    for speed_name, speed_bytes in speeds:
        time_seconds = total_size / speed_bytes
        hours = time_seconds / 3600
        days = hours / 24

        if days >= 1:
            print(f"   {speed_name:10s}: {days:.1f} días ({hours:.1f} horas)")
        elif hours >= 1:
            print(f"   {speed_name:10s}: {hours:.1f} horas")
        else:
            minutes = time_seconds / 60
            print(f"   {speed_name:10s}: {minutes:.1f} minutos")

    return {
        'total_size_bytes': total_size,
        'total_size_gb': total_gb,
        'total_size_tb': total_tb,
        'total_files': total_files,
        'existing_files': existing_files,
        'missing_files': missing_files,
        'avg_size_gb': avg_gb,
        'min_size_gb': min_size,
        'max_size_gb': max_size,
        'size_by_variable': {k: v/(1024**3) for k, v in size_by_variable.items()},
        'size_by_gcm': {k: v/(1024**3) for k, v in size_by_gcm.items()},
        'size_by_ssp': {k: v/(1024**3) for k, v in size_by_ssp.items()},
        'size_by_period': {k: v/(1024**3) for k, v in size_by_period.items()}
    }


def main():
    """Función principal"""
    import argparse

    parser = argparse.ArgumentParser(
        description='Calcula el tamaño de datos CMIP6 sin descargarlos',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos:
  # Calcular tamaño de TODO
  python check_future_data_size.py

  # Solo un modelo específico
  python check_future_data_size.py --gcms ACCESS-CM2

  # Solo escenarios extremos
  python check_future_data_size.py --ssps ssp126 ssp585

  # Solo temperatura
  python check_future_data_size.py --variables tmin tmax

  # Combinación específica
  python check_future_data_size.py --gcms ACCESS-CM2 GFDL-ESM4 --ssps ssp126 --periods 2021-2040

  # Modo silencioso (solo resumen)
  python check_future_data_size.py --quiet
        """
    )

    parser.add_argument(
        '--gcms',
        nargs='+',
        choices=GCM_MODELS,
        help='Modelos GCM específicos a consultar (por defecto: todos)'
    )

    parser.add_argument(
        '--ssps',
        nargs='+',
        choices=SSP_SCENARIOS,
        help='Escenarios SSP específicos a consultar (por defecto: todos)'
    )

    parser.add_argument(
        '--variables',
        nargs='+',
        choices=VARIABLES,
        help='Variables específicas a consultar (por defecto: todas)'
    )

    parser.add_argument(
        '--periods',
        nargs='+',
        choices=TIME_PERIODS,
        help='Períodos específicos a consultar (por defecto: todos)'
    )

    parser.add_argument(
        '--quiet', '-q',
        action='store_true',
        help='Modo silencioso (no mostrar cada archivo)'
    )

    args = parser.parse_args()

    # Ejecutar consulta
    results = check_cmip6_data_size(
        gcms=args.gcms,
        ssps=args.ssps,
        variables=args.variables,
        periods=args.periods,
        verbose=not args.quiet
    )

    print(f"\n{'='*70}\n")


if __name__ == "__main__":
    main()
