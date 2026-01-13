#!/usr/bin/env python3
"""
Script para descargar datos mensuales históricos de WorldClim (1950-2024)
Resolución máxima: 2.5 minutos (~21 km²)
Fuente: CRU TS 4.09 downscaled con WorldClim v2.1
"""

import os
import requests
from pathlib import Path
from tqdm import tqdm
import time
from typing import List, Dict, Optional

# Configuración
BASE_URL = "https://geodata.ucdavis.edu/climate/worldclim/2_1/hist/cts4.09/"
OUTPUT_DIR = Path("/Volumes/Datos/srv/carto_private/01_ORIGINAL/world/climate/monthly_timeseries/")

# Resoluciones disponibles
RESOLUTIONS = {
    '2.5m': '2.5 minutos (~21 km²) - Máxima resolución',
    '5m': '5 minutos (~85 km²)',
    '10m': '10 minutos (~340 km²)'
}

# Variables disponibles
VARIABLES = {
    'tmin': 'Temperatura mínima',
    'tmax': 'Temperatura máxima',
    'prec': 'Precipitación'
}

# Décadas disponibles
DECADES = [
    '1950-1959',
    '1960-1969',
    '1970-1979',
    '1980-1989',
    '1990-1999',
    '2000-2009',
    '2010-2019',
    '2020-2024'
]


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
        print(f"❌ Error: {e}")
        return False


def download_monthly_timeseries(
    resolution: str = '2.5m',
    variables: Optional[List[str]] = None,
    decades: Optional[List[str]] = None,
    skip_existing: bool = True
) -> Dict:
    """
    Descarga series temporales mensuales de WorldClim

    Args:
        resolution: Resolución espacial ('2.5m', '5m', '10m')
        variables: Lista de variables a descargar (None = todas)
        decades: Lista de décadas a descargar (None = todas)
        skip_existing: Si True, omite archivos ya descargados

    Returns:
        Dict: Diccionario con estadísticas de descarga
    """
    # Validar resolución
    if resolution not in RESOLUTIONS:
        print(f"❌ Resolución '{resolution}' no válida. Opciones: {list(RESOLUTIONS.keys())}")
        return {'successful': [], 'skipped': [], 'failed': []}

    # Usar valores por defecto si no se especifican
    if variables is None:
        variables = list(VARIABLES.keys())
    if decades is None:
        decades = DECADES

    # Crear directorio de salida
    output_dir = OUTPUT_DIR / resolution
    output_dir.mkdir(parents=True, exist_ok=True)

    # Calcular total de archivos
    total_files = len(variables) * len(decades)

    print(f"\n🌍 Descargando series temporales mensuales de WorldClim")
    print(f"   Fuente: CRU TS 4.09 (downscaled)")
    print(f"   Resolución: {RESOLUTIONS[resolution]}")
    print(f"   Período: 1950-2024")
    print(f"   Variables: {len(variables)}")
    print(f"   Décadas: {len(decades)}")
    print(f"   Total archivos: {total_files}\n")

    successful_downloads = []
    failed_downloads = []
    skipped_downloads = []

    file_counter = 0

    for variable in variables:
        if variable not in VARIABLES:
            print(f"⚠️  Variable '{variable}' no reconocida. Saltando...")
            continue

        for decade in decades:
            if decade not in DECADES:
                print(f"⚠️  Década '{decade}' no reconocida. Saltando...")
                continue

            file_counter += 1

            # Construir nombre de archivo y URL
            filename = f"wc2.1_cruts4.09_{resolution}_{variable}_{decade}.zip"
            output_path = output_dir / filename
            url = BASE_URL + filename

            print(f"\n{'='*70}")
            print(f"[{file_counter}/{total_files}] {VARIABLES[variable]} | {decade}")

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
                    'variable': variable,
                    'decade': decade
                })

            # Pequeña pausa entre descargas
            time.sleep(0.5)

    # Resumen
    print(f"\n{'='*70}")
    print(f"\n📊 RESUMEN DE DESCARGAS")
    print(f"   ✓ Exitosas: {len(successful_downloads)}")
    print(f"   ⊘ Saltadas: {len(skipped_downloads)}")
    print(f"   ✗ Fallidas: {len(failed_downloads)}")

    if successful_downloads:
        print(f"\n✓ Descargadas:")
        for file in successful_downloads:
            print(f"   - {file}")

    if skipped_downloads:
        print(f"\n⊘ Saltadas:")
        for file in skipped_downloads[:5]:  # Mostrar máximo 5
            print(f"   - {file}")
        if len(skipped_downloads) > 5:
            print(f"   ... y {len(skipped_downloads) - 5} más")

    if failed_downloads:
        print(f"\n❌ FALLIDAS:")
        for failed in failed_downloads:
            print(f"   - {failed['file']}")

    print(f"\n📁 Archivos guardados en: {output_dir}")

    # Información adicional sobre los datos descargados
    if successful_downloads or skipped_downloads:
        total_months = 0
        for decade in decades:
            if decade == '2020-2024':
                total_months += 5 * 12  # 5 años
            else:
                total_months += 10 * 12  # 10 años

        print(f"\n📈 Datos disponibles:")
        print(f"   - Meses totales: {total_months}")
        print(f"   - Archivos por variable: {len(decades)} ZIPs")
        print(f"   - GeoTiffs por década: 120 archivos (10 años × 12 meses)")
        print(f"   - GeoTiffs 2020-2024: 60 archivos (5 años × 12 meses)")

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
        description='Descarga series temporales mensuales de WorldClim (1950-2024)',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=f"""
Resoluciones disponibles:
  2.5m  - 2.5 minutos (~21 km²) - MÁXIMA RESOLUCIÓN
  5m    - 5 minutos (~85 km²)
  10m   - 10 minutos (~340 km²)

Variables disponibles:
  tmin  - Temperatura mínima mensual (°C)
  tmax  - Temperatura máxima mensual (°C)
  prec  - Precipitación mensual (mm)

Décadas disponibles:
  1950-1959, 1960-1969, 1970-1979, 1980-1989,
  1990-1999, 2000-2009, 2010-2019, 2020-2024

Ejemplos:
  # Descargar todo a máxima resolución (24 archivos, ~10-15 GB)
  python download_monthly_timeseries.py

  # Solo temperatura a máxima resolución
  python download_monthly_timeseries.py --variables tmin tmax

  # Últimas 3 décadas a máxima resolución
  python download_monthly_timeseries.py --decades 2000-2009 2010-2019 2020-2024

  # Resolución más baja (más rápido, menos espacio)
  python download_monthly_timeseries.py --resolution 5m

  # Forzar re-descarga
  python download_monthly_timeseries.py --force

  # Con confirmación automática para nohup
  nohup python download_monthly_timeseries.py --yes > descarga_monthly.log 2>&1 &
        """
    )

    parser.add_argument(
        '--resolution',
        default='2.5m',
        choices=list(RESOLUTIONS.keys()),
        help='Resolución espacial (por defecto: 2.5m - máxima)'
    )

    parser.add_argument(
        '--variables',
        nargs='+',
        choices=list(VARIABLES.keys()),
        help='Variables específicas a descargar (por defecto: todas)'
    )

    parser.add_argument(
        '--decades',
        nargs='+',
        choices=DECADES,
        help='Décadas específicas a descargar (por defecto: todas)'
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
    if not any([args.variables, args.decades]):
        total = len(VARIABLES) * len(DECADES)
        print(f"\n⚠️  ADVERTENCIA: Estás a punto de descargar {total} archivos.")
        print(f"    Tamaño estimado: ~10-15 GB (resolución {args.resolution})")
        print(f"    Esto puede tardar varias horas dependiendo de tu conexión.")

        if not args.yes:
            response = input("\n¿Deseas continuar? (escribe 'si' para confirmar): ")
            if response.lower() not in ['si', 'sí', 'yes', 'y']:
                print("Descarga cancelada.")
                return
        else:
            print("\n✓ Confirmación automática activada (--yes). Iniciando descarga...")
            time.sleep(2)

    # Ejecutar descarga
    results = download_monthly_timeseries(
        resolution=args.resolution,
        variables=args.variables,
        decades=args.decades,
        skip_existing=not args.force
    )

    # Código de salida
    exit_code = 0 if not results['failed'] else 1
    exit(exit_code)


if __name__ == "__main__":
    main()
