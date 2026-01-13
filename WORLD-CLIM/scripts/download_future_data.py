#!/usr/bin/env python3
"""
Script para descargar proyecciones futuras de CMIP6 de WorldClim
Resolución: 30 segundos (~1 km²)
Períodos: 2021-2040, 2041-2060, 2061-2080, 2081-2100
"""

import os
import requests
from pathlib import Path
from tqdm import tqdm
import time
from typing import List, Dict, Optional

# Configuración
BASE_URL = "https://geodata.ucdavis.edu/cmip6/30s"
OUTPUT_DIR = Path("/Volumes/Datos/srv/carto_private/01_ORIGINAL/world/climate/future/")
RESOLUTION = "30s"  # Máxima resolución

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

# Escenarios SSP (Shared Socio-economic Pathways)
SSP_SCENARIOS = {
    'ssp126': 'SSP1-2.6 (bajo - optimista)',
    'ssp245': 'SSP2-4.5 (intermedio-bajo)',
    'ssp370': 'SSP3-7.0 (intermedio-alto)',
    'ssp585': 'SSP5-8.5 (alto - pesimista)'
}

# Períodos temporales
TIME_PERIODS = [
    '2021-2040',
    '2041-2060',
    '2061-2080',
    '2081-2100'
]

# Variables climáticas
VARIABLES = {
    'tmin': 'Temperatura mínima',
    'tmax': 'Temperatura máxima',
    'prec': 'Precipitación',
    'bioc': 'Variables bioclimáticas'
}


def download_file(url: str, output_path: Path) -> bool:
    """
    Descarga un archivo con barra de progreso

    Args:
        url: URL del archivo a descargar
        output_path: Ruta donde guardar el archivo

    Returns:
        bool: True si la descarga fue exitosa, False en caso contrario
    """
    try:
        response = requests.get(url, stream=True, timeout=60)
        response.raise_for_status()

        total_size = int(response.headers.get('content-length', 0))

        with open(output_path, 'wb') as file, tqdm(
            desc=output_path.name[:50],  # Limitar nombre para mejor visualización
            total=total_size,
            unit='iB',
            unit_scale=True,
            unit_divisor=1024,
        ) as progress_bar:
            for data in response.iter_content(chunk_size=1024):
                size = file.write(data)
                progress_bar.update(size)

        return True

    except requests.exceptions.RequestException as e:
        print(f"❌ Error: {e}")
        return False


def build_url(gcm: str, ssp: str, variable: str, period: str) -> str:
    """
    Construye la URL de descarga para un archivo específico

    Args:
        gcm: Modelo climático global (ej: 'ACCESS-CM2')
        ssp: Escenario SSP (ej: 'ssp126')
        variable: Variable climática (ej: 'tmin')
        period: Período temporal (ej: '2021-2040')

    Returns:
        str: URL completa del archivo
    """
    filename = f"wc2.1_{RESOLUTION}_{variable}_{gcm}_{ssp}_{period}.tif"
    url = f"{BASE_URL}/{gcm}/{ssp}/{filename}"
    return url


def download_cmip6_data(
    gcms: Optional[List[str]] = None,
    ssps: Optional[List[str]] = None,
    variables: Optional[List[str]] = None,
    periods: Optional[List[str]] = None,
    skip_existing: bool = True
) -> Dict:
    """
    Descarga proyecciones futuras de CMIP6

    Args:
        gcms: Lista de modelos GCM a descargar (None = todos)
        ssps: Lista de escenarios SSP a descargar (None = todos)
        variables: Lista de variables a descargar (None = todas)
        periods: Lista de períodos a descargar (None = todos)
        skip_existing: Si True, omite archivos ya descargados

    Returns:
        Dict: Diccionario con estadísticas de descarga
    """
    # Usar valores por defecto si no se especifican
    if gcms is None:
        gcms = GCM_MODELS
    if ssps is None:
        ssps = list(SSP_SCENARIOS.keys())
    if variables is None:
        variables = list(VARIABLES.keys())
    if periods is None:
        periods = TIME_PERIODS

    # Calcular total de archivos a descargar
    total_files = len(gcms) * len(ssps) * len(variables) * len(periods)

    print(f"\n🌍 Descargando proyecciones futuras CMIP6 de WorldClim")
    print(f"   Resolución: {RESOLUTION} (~1 km²)")
    print(f"   Modelos GCM: {len(gcms)}")
    print(f"   Escenarios SSP: {len(ssps)}")
    print(f"   Variables: {len(variables)}")
    print(f"   Períodos: {len(periods)}")
    print(f"   Total archivos: {total_files}\n")

    successful_downloads = []
    failed_downloads = []
    skipped_downloads = []

    file_counter = 0

    for gcm in gcms:
        for ssp in ssps:
            for variable in variables:
                for period in periods:
                    file_counter += 1

                    # Construir URL y ruta de salida
                    url = build_url(gcm, ssp, variable, period)

                    # Crear estructura de directorios
                    output_subdir = OUTPUT_DIR / gcm / ssp
                    output_subdir.mkdir(parents=True, exist_ok=True)

                    filename = f"wc2.1_{RESOLUTION}_{variable}_{gcm}_{ssp}_{period}.tif"
                    output_path = output_subdir / filename

                    print(f"\n{'='*70}")
                    print(f"[{file_counter}/{total_files}] {gcm} | {ssp} | {VARIABLES[variable]} | {period}")

                    # Verificar si ya existe
                    if skip_existing and output_path.exists():
                        file_size = output_path.stat().st_size / (1024 * 1024)  # MB
                        print(f"✓ Archivo ya existe ({file_size:.2f} MB) - Saltando")
                        skipped_downloads.append(filename)
                        continue

                    print(f"🔽 Descargando...")

                    # Intentar descarga
                    success = download_file(url, output_path)

                    if success:
                        file_size = output_path.stat().st_size / (1024 * 1024)  # MB
                        print(f"✓ Completado ({file_size:.2f} MB)")
                        successful_downloads.append(filename)
                    else:
                        failed_downloads.append({
                            'file': filename,
                            'url': url,
                            'gcm': gcm,
                            'ssp': ssp,
                            'variable': variable,
                            'period': period
                        })

                    # Pequeña pausa entre descargas
                    time.sleep(0.5)

    # Resumen
    print(f"\n{'='*70}")
    print(f"\n📊 RESUMEN DE DESCARGAS")
    print(f"   ✓ Exitosas: {len(successful_downloads)}")
    print(f"   ⊘ Saltadas: {len(skipped_downloads)}")
    print(f"   ✗ Fallidas: {len(failed_downloads)}")

    if failed_downloads:
        print(f"\n❌ ARCHIVOS FALLIDOS:")
        for failed in failed_downloads[:10]:  # Mostrar máximo 10
            print(f"   - {failed['file']}")
        if len(failed_downloads) > 10:
            print(f"   ... y {len(failed_downloads) - 10} más")

    print(f"\n📁 Archivos guardados en: {OUTPUT_DIR}")

    return {
        'successful': successful_downloads,
        'skipped': skipped_downloads,
        'failed': failed_downloads,
        'total': total_files
    }


def main():
    """Función principal"""
    import argparse

    parser = argparse.ArgumentParser(
        description='Descarga proyecciones futuras CMIP6 de WorldClim',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=f"""
Modelos GCM disponibles ({len(GCM_MODELS)}):
  {', '.join(GCM_MODELS)}

Escenarios SSP disponibles:
  ssp126 - SSP1-2.6 (bajo - optimista)
  ssp245 - SSP2-4.5 (intermedio-bajo)
  ssp370 - SSP3-7.0 (intermedio-alto)
  ssp585 - SSP5-8.5 (alto - pesimista)

Variables disponibles:
  tmin - Temperatura mínima mensual
  tmax - Temperatura máxima mensual
  prec - Precipitación mensual
  bioc - Variables bioclimáticas

Períodos disponibles:
  2021-2040, 2041-2060, 2061-2080, 2081-2100

Ejemplos:
  # Descargar todos los datos (¡CUIDADO! son miles de archivos)
  python download_future_data.py

  # Descargar un modelo específico, todos los escenarios
  python download_future_data.py --gcms ACCESS-CM2

  # Descargar varios modelos, escenario optimista
  python download_future_data.py --gcms ACCESS-CM2 GFDL-ESM4 --ssps ssp126

  # Solo temperatura, escenarios bajo y alto, primer período
  python download_future_data.py --variables tmin tmax --ssps ssp126 ssp585 --periods 2021-2040

  # Forzar re-descarga
  python download_future_data.py --force
        """
    )

    parser.add_argument(
        '--gcms',
        nargs='+',
        choices=GCM_MODELS,
        help='Modelos GCM específicos a descargar (por defecto: todos)'
    )

    parser.add_argument(
        '--ssps',
        nargs='+',
        choices=list(SSP_SCENARIOS.keys()),
        help='Escenarios SSP específicos a descargar (por defecto: todos)'
    )

    parser.add_argument(
        '--variables',
        nargs='+',
        choices=list(VARIABLES.keys()),
        help='Variables específicas a descargar (por defecto: todas)'
    )

    parser.add_argument(
        '--periods',
        nargs='+',
        choices=TIME_PERIODS,
        help='Períodos específicos a descargar (por defecto: todos)'
    )

    parser.add_argument(
        '--force',
        action='store_true',
        help='Forzar descarga incluso si los archivos ya existen'
    )

    parser.add_argument(
        '--output-dir',
        type=Path,
        help='Directorio de salida personalizado'
    )

    parser.add_argument(
        '--yes',
        action='store_true',
        help='Omitir confirmación de descarga masiva (útil para nohup)'
    )

    args = parser.parse_args()

    # Configurar directorio de salida personalizado si se especifica
    global OUTPUT_DIR
    if args.output_dir:
        OUTPUT_DIR = args.output_dir

    # Advertencia si se van a descargar todos los archivos
    if not any([args.gcms, args.ssps, args.variables, args.periods]):
        total = len(GCM_MODELS) * len(SSP_SCENARIOS) * len(VARIABLES) * len(TIME_PERIODS)
        print(f"\n⚠️  ADVERTENCIA: Estás a punto de descargar {total} archivos.")
        print(f"    Esto puede tardar HORAS y ocupar MUCHO espacio en disco.")

        # Omitir confirmación si se usa --yes
        if not args.yes:
            response = input("\n¿Deseas continuar? (escribe 'si' para confirmar): ")
            if response.lower() not in ['si', 'sí', 'yes', 'y']:
                print("Descarga cancelada.")
                return
        else:
            print("\n✓ Confirmación automática activada (--yes). Iniciando descarga...")
            time.sleep(2)  # Pausa breve para ver el mensaje

    # Ejecutar descarga
    results = download_cmip6_data(
        gcms=args.gcms,
        ssps=args.ssps,
        variables=args.variables,
        periods=args.periods,
        skip_existing=not args.force
    )

    # Código de salida
    exit_code = 0 if not results['failed'] else 1
    exit(exit_code)


if __name__ == "__main__":
    main()
