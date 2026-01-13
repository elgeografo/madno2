#!/usr/bin/env python3
"""
Script para descargar datos históricos de WorldClim v2.1
Resolución: 30 segundos (~1 km²)
Período: 1970-2000
"""

import os
import requests
from pathlib import Path
from tqdm import tqdm
import time

# Configuración
BASE_URL = "https://geodata.ucdavis.edu/climate/worldclim/2_1/base/"
OUTPUT_DIR = Path("/Volumes/Datos/srv/carto_private/01_ORIGINAL/world/climate/hitorical/")
RESOLUTION = "30s"  # Máxima resolución

# Variables disponibles
VARIABLES = {
    'tmin': 'Temperatura mínima',
    'tmax': 'Temperatura máxima',
    'tavg': 'Temperatura media',
    'prec': 'Precipitación',
    'srad': 'Radiación solar',
    'wind': 'Velocidad del viento',
    'vapr': 'Presión de vapor de agua',
    'bio': 'Variables bioclimáticas (19)',
    'elev': 'Elevación'
}




def download_file(url, output_path):
    """
    Descarga un archivo con barra de progreso

    Args:
        url: URL del archivo a descargar
        output_path: Ruta donde guardar el archivo

    Returns:
        bool: True si la descarga fue exitosa, False en caso contrario
    """
    try:
        response = requests.get(url, stream=True, timeout=30)
        response.raise_for_status()

        total_size = int(response.headers.get('content-length', 0))

        with open(output_path, 'wb') as file, tqdm(
            desc=output_path.name,
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
        print(f"❌ Error descargando {url}: {e}")
        return False


def download_worldclim_data(variables=None, skip_existing=True):
    """
    Descarga datos históricos de WorldClim

    Args:
        variables: Lista de variables a descargar (None = todas)
        skip_existing: Si True, omite archivos ya descargados
    """

    # Si no se especifican variables, descargar todas
    if variables is None:
        variables = list(VARIABLES.keys())

    print(f"\n🌍 Descargando datos históricos de WorldClim v2.1")
    print(f"   Resolución: {RESOLUTION} (~1 km²)")
    print(f"   Período: 1970-2000")
    print(f"   Variables: {len(variables)}\n")

    successful_downloads = []
    failed_downloads = []
    skipped_downloads = []

    for var in variables:
        if var not in VARIABLES:
            print(f"⚠️  Variable '{var}' no reconocida. Saltando...")
            continue

        filename = f"wc2.1_{RESOLUTION}_{var}.zip"
        output_path = OUTPUT_DIR / filename
        url = BASE_URL + filename

        print(f"\n{'='*60}")
        print(f"Variable: {VARIABLES[var]} ({var})")
        print(f"Archivo: {filename}")

        # Verificar si ya existe
        if skip_existing and output_path.exists():
            file_size = output_path.stat().st_size / (1024 * 1024)  # MB
            print(f"✓ Archivo ya existe ({file_size:.2f} MB) - Saltando")
            skipped_downloads.append(var)
            continue

        print(f"🔽 Descargando desde: {url}")

        # Intentar descarga
        success = download_file(url, output_path)

        if success:
            file_size = output_path.stat().st_size / (1024 * 1024)  # MB
            print(f"✓ Descarga completada ({file_size:.2f} MB)")
            successful_downloads.append(var)
        else:
            failed_downloads.append(var)

        # Pequeña pausa entre descargas para no sobrecargar el servidor
        time.sleep(1)

    # Resumen
    print(f"\n{'='*60}")
    print(f"\n📊 RESUMEN DE DESCARGAS")
    print(f"   ✓ Exitosas: {len(successful_downloads)}")
    print(f"   ⊘ Saltadas: {len(skipped_downloads)}")
    print(f"   ✗ Fallidas: {len(failed_downloads)}")

    if successful_downloads:
        print(f"\n✓ Descargadas: {', '.join(successful_downloads)}")

    if skipped_downloads:
        print(f"\n⊘ Saltadas: {', '.join(skipped_downloads)}")

    if failed_downloads:
        print(f"\n✗ Fallidas: {', '.join(failed_downloads)}")

    print(f"\n📁 Archivos guardados en: {OUTPUT_DIR}")

    return {
        'successful': successful_downloads,
        'skipped': skipped_downloads,
        'failed': failed_downloads
    }


def main():
    """Función principal"""
    import argparse

    parser = argparse.ArgumentParser(
        description='Descarga datos históricos de WorldClim v2.1',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Variables disponibles:
  tmin  - Temperatura mínima mensual
  tmax  - Temperatura máxima mensual
  tavg  - Temperatura media mensual
  prec  - Precipitación mensual
  srad  - Radiación solar mensual
  wind  - Velocidad del viento mensual
  vapr  - Presión de vapor de agua mensual
  bio   - Variables bioclimáticas (19)
  elev  - Elevación

Ejemplos:
  # Descargar todas las variables
  python download_historical_data.py

  # Descargar solo temperatura y precipitación
  python download_historical_data.py --variables tmin tmax prec

  # Forzar re-descarga de archivos existentes
  python download_historical_data.py --force
        """
    )

    parser.add_argument(
        '--variables',
        nargs='+',
        choices=list(VARIABLES.keys()),
        help='Variables específicas a descargar (por defecto: todas)'
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

    args = parser.parse_args()

    # Configurar directorio de salida personalizado si se especifica
    global OUTPUT_DIR
    if args.output_dir:
        OUTPUT_DIR = args.output_dir

    # Ejecutar descarga
    results = download_worldclim_data(
        variables=args.variables,
        skip_existing=not args.force
    )

    # Código de salida
    exit_code = 0 if not results['failed'] else 1
    exit(exit_code)


if __name__ == "__main__":
    main()
