#!/usr/bin/env python3
"""
Script para verificar la integridad de las descargas de CMIP6 de WorldClim.
Compara tamaños de archivos locales vs remotos y genera un log de discrepancias.
"""

import requests
from pathlib import Path
from datetime import datetime
from typing import List, Optional
import argparse
import sys
from tqdm import tqdm

# Configuración (misma que download_future_data.py)
BASE_URL = "https://geodata.ucdavis.edu/cmip6/30s"
DEFAULT_OUTPUT_DIR = Path("/mnt/data/srv/carto_private/01_ORIGINAL/world/climate/future/")
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


def get_remote_size(url: str) -> Optional[int]:
    """Obtiene el tamaño del archivo remoto usando HEAD request."""
    try:
        response = requests.head(url, timeout=30, allow_redirects=True)
        if response.status_code == 200:
            return int(response.headers.get('content-length', 0))
        return None
    except requests.exceptions.RequestException:
        return None


def format_size(size_bytes: int) -> str:
    """Formatea bytes a formato legible."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.2f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.2f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"


def download_file(url: str, output_path: Path) -> bool:
    """Descarga un archivo con barra de progreso."""
    try:
        response = requests.get(url, stream=True, timeout=60)
        response.raise_for_status()

        total_size = int(response.headers.get('content-length', 0))

        # Crear directorio si no existe
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, 'wb') as file, tqdm(
            desc=output_path.name[:50],
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
        print(f"  [!] Error descarga: {e}")
        return False


def check_downloads(
    local_dir: Path,
    gcms: Optional[List[str]] = None,
    ssps: Optional[List[str]] = None,
    variables: Optional[List[str]] = None,
    periods: Optional[List[str]] = None,
    log_file: Optional[Path] = None,
    overwrite: bool = False
):
    """
    Verifica descargas comparando archivos locales con remotos.
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

    # Preparar archivo de log
    if log_file is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        log_file = Path(f"check_downloads_{timestamp}.log")

    # Calcular total de archivos
    total_files = len(gcms) * len(ssps) * len(variables) * len(periods)

    print(f"\n{'='*70}")
    print(f"  VERIFICACION DE DESCARGAS CMIP6 - WorldClim")
    print(f"{'='*70}")
    print(f"  Directorio local: {local_dir}")
    print(f"  Modelos GCM: {len(gcms)}")
    print(f"  Escenarios SSP: {len(ssps)}")
    print(f"  Variables: {len(variables)}")
    print(f"  Periodos: {len(periods)}")
    print(f"  Total archivos a verificar: {total_files}")
    print(f"  Log de errores: {log_file}")
    print(f"  Modo overwrite: {'SI' if overwrite else 'NO'}")
    print(f"{'='*70}\n")

    # Contadores
    ok_count = 0
    missing_count = 0
    size_mismatch_count = 0
    remote_error_count = 0
    downloaded_count = 0
    download_failed_count = 0
    file_counter = 0

    # Lista de problemas para el log
    problems = []

    for gcm in gcms:
        for ssp in ssps:
            for variable in variables:
                for period in periods:
                    file_counter += 1

                    # Construir nombres y rutas
                    filename = f"wc2.1_{RESOLUTION}_{variable}_{gcm}_{ssp}_{period}.tif"
                    url = f"{BASE_URL}/{gcm}/{ssp}/{filename}"
                    local_path = local_dir / gcm / ssp / filename

                    # Mostrar progreso
                    progress = f"[{file_counter}/{total_files}]"
                    file_info = f"{gcm}/{ssp}/{variable}/{period}"

                    sys.stdout.write(f"\r{progress} Verificando: {file_info}".ljust(80))
                    sys.stdout.flush()

                    # Obtener tamaño remoto
                    remote_size = get_remote_size(url)

                    if remote_size is None:
                        remote_error_count += 1
                        msg = f"ERROR_REMOTO | {filename} | No se pudo obtener tamaño remoto"
                        problems.append({
                            'type': 'REMOTE_ERROR',
                            'file': filename,
                            'url': url,
                            'local_path': str(local_path),
                            'message': 'No se pudo obtener tamaño remoto'
                        })
                        print(f"\n  [!] Error remoto: {filename}")
                        continue

                    # Verificar archivo local
                    if not local_path.exists():
                        missing_count += 1
                        print(f"\n  [X] Falta: {filename} ({format_size(remote_size)})")

                        if overwrite:
                            print(f"      Descargando...")
                            if download_file(url, local_path):
                                downloaded_count += 1
                                print(f"      Descargado correctamente")
                            else:
                                download_failed_count += 1
                                problems.append({
                                    'type': 'MISSING',
                                    'file': filename,
                                    'url': url,
                                    'local_path': str(local_path),
                                    'remote_size': remote_size,
                                    'remote_size_human': format_size(remote_size)
                                })
                        else:
                            problems.append({
                                'type': 'MISSING',
                                'file': filename,
                                'url': url,
                                'local_path': str(local_path),
                                'remote_size': remote_size,
                                'remote_size_human': format_size(remote_size)
                            })
                        continue

                    # Comparar tamaños
                    local_size = local_path.stat().st_size

                    if local_size < remote_size:
                        size_mismatch_count += 1
                        diff = remote_size - local_size
                        print(f"\n  [!] Incompleto: {filename}")
                        print(f"      Local: {format_size(local_size)} | Remoto: {format_size(remote_size)} | Faltan: {format_size(diff)}")

                        if overwrite:
                            print(f"      Re-descargando...")
                            if download_file(url, local_path):
                                downloaded_count += 1
                                print(f"      Descargado correctamente")
                            else:
                                download_failed_count += 1
                                problems.append({
                                    'type': 'SIZE_MISMATCH',
                                    'file': filename,
                                    'url': url,
                                    'local_path': str(local_path),
                                    'local_size': local_size,
                                    'remote_size': remote_size,
                                    'local_size_human': format_size(local_size),
                                    'remote_size_human': format_size(remote_size),
                                    'difference': diff,
                                    'difference_human': format_size(diff)
                                })
                        else:
                            problems.append({
                                'type': 'SIZE_MISMATCH',
                                'file': filename,
                                'url': url,
                                'local_path': str(local_path),
                                'local_size': local_size,
                                'remote_size': remote_size,
                                'local_size_human': format_size(local_size),
                                'remote_size_human': format_size(remote_size),
                                'difference': diff,
                                'difference_human': format_size(diff)
                            })
                        continue

                    # Todo OK
                    ok_count += 1

    # Limpiar línea de progreso
    sys.stdout.write("\r" + " " * 80 + "\r")
    sys.stdout.flush()

    # Escribir log
    with open(log_file, 'w') as f:
        f.write(f"VERIFICACION DE DESCARGAS CMIP6 - WorldClim\n")
        f.write(f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Directorio: {local_dir}\n")
        f.write(f"{'='*70}\n\n")

        f.write(f"RESUMEN:\n")
        f.write(f"  - Total verificados: {total_files}\n")
        f.write(f"  - OK: {ok_count}\n")
        f.write(f"  - Faltantes: {missing_count}\n")
        f.write(f"  - Tamaño incorrecto: {size_mismatch_count}\n")
        f.write(f"  - Errores remotos: {remote_error_count}\n")
        if overwrite:
            f.write(f"  - Descargados (corregidos): {downloaded_count}\n")
            f.write(f"  - Fallos en descarga: {download_failed_count}\n")
        f.write(f"\n{'='*70}\n\n")

        if problems:
            f.write("PROBLEMAS DETECTADOS:\n\n")

            # Archivos faltantes
            missing = [p for p in problems if p['type'] == 'MISSING']
            if missing:
                f.write(f"--- ARCHIVOS FALTANTES ({len(missing)}) ---\n")
                for p in missing:
                    f.write(f"  {p['file']}\n")
                    f.write(f"    URL: {p['url']}\n")
                    f.write(f"    Tamaño remoto: {p['remote_size_human']}\n\n")

            # Tamaño incorrecto
            mismatch = [p for p in problems if p['type'] == 'SIZE_MISMATCH']
            if mismatch:
                f.write(f"\n--- TAMAÑO INCORRECTO ({len(mismatch)}) ---\n")
                for p in mismatch:
                    f.write(f"  {p['file']}\n")
                    f.write(f"    Local: {p['local_size_human']} | Remoto: {p['remote_size_human']}\n")
                    f.write(f"    Faltan: {p['difference_human']}\n")
                    f.write(f"    URL: {p['url']}\n\n")

            # Errores remotos
            errors = [p for p in problems if p['type'] == 'REMOTE_ERROR']
            if errors:
                f.write(f"\n--- ERRORES REMOTOS ({len(errors)}) ---\n")
                for p in errors:
                    f.write(f"  {p['file']}\n")
                    f.write(f"    URL: {p['url']}\n\n")

    # Resumen final en pantalla
    print(f"\n{'='*70}")
    print(f"  RESUMEN DE VERIFICACION")
    print(f"{'='*70}")
    print(f"  Total verificados: {total_files}")
    print(f"  OK:                {ok_count}")
    print(f"  Faltantes:         {missing_count}")
    print(f"  Tamaño incorrecto: {size_mismatch_count}")
    print(f"  Errores remotos:   {remote_error_count}")
    if overwrite:
        print(f"  Descargados:       {downloaded_count}")
        print(f"  Fallos descarga:   {download_failed_count}")
    print(f"{'='*70}")
    print(f"\n  Log guardado en: {log_file}")

    if problems:
        print(f"\n  [!] Se encontraron {len(problems)} problemas. Revisa el log para detalles.")
    else:
        print(f"\n  Todos los archivos verificados correctamente.")

    return {
        'ok': ok_count,
        'missing': missing_count,
        'size_mismatch': size_mismatch_count,
        'remote_error': remote_error_count,
        'downloaded': downloaded_count,
        'download_failed': download_failed_count,
        'problems': problems
    }


def main():
    parser = argparse.ArgumentParser(
        description='Verifica integridad de descargas CMIP6 de WorldClim',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos:
  # Verificar todos los archivos en el directorio por defecto
  python check_downloads.py

  # Verificar un directorio específico
  python check_downloads.py --local-dir /path/to/downloads

  # Verificar solo algunos modelos
  python check_downloads.py --gcms GFDL-ESM4 MIROC6

  # Verificar con log personalizado
  python check_downloads.py --log-file mi_verificacion.log

  # Verificar y descargar los que falten o esten incompletos
  python check_downloads.py --overwrite

  # Verificar modelos especificos y descargar los que falten
  python check_downloads.py --gcms GFDL-ESM4 MIROC6 --overwrite
        """
    )

    parser.add_argument(
        '--local-dir',
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help=f'Directorio local con las descargas (default: {DEFAULT_OUTPUT_DIR})'
    )

    parser.add_argument(
        '--gcms',
        nargs='+',
        choices=GCM_MODELS,
        help='Modelos GCM específicos a verificar'
    )

    parser.add_argument(
        '--ssps',
        nargs='+',
        choices=SSP_SCENARIOS,
        help='Escenarios SSP específicos a verificar'
    )

    parser.add_argument(
        '--variables',
        nargs='+',
        choices=VARIABLES,
        help='Variables específicas a verificar'
    )

    parser.add_argument(
        '--periods',
        nargs='+',
        choices=TIME_PERIODS,
        help='Períodos específicos a verificar'
    )

    parser.add_argument(
        '--log-file',
        type=Path,
        help='Archivo de log personalizado'
    )

    parser.add_argument(
        '--overwrite',
        action='store_true',
        help='Descargar archivos faltantes o incompletos (por defecto: solo verificar)'
    )

    args = parser.parse_args()

    # Verificar que el directorio existe
    if not args.local_dir.exists():
        print(f"Error: El directorio {args.local_dir} no existe.")
        sys.exit(1)

    # Ejecutar verificación
    results = check_downloads(
        local_dir=args.local_dir,
        gcms=args.gcms,
        ssps=args.ssps,
        variables=args.variables,
        periods=args.periods,
        log_file=args.log_file,
        overwrite=args.overwrite
    )

    # Código de salida
    if results['missing'] > 0 or results['size_mismatch'] > 0:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
