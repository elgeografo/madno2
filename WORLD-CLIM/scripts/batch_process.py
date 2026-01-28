#!/usr/bin/env python3
"""
Script para procesar en lote todos los archivos TIF a PMTiles.
Procesa uno a uno, saltando los que ya existen.
"""

import subprocess
import sys
from pathlib import Path
from datetime import datetime

# Configuración de directorios
INPUT_DIR = Path("/mnt/data/srv/carto_private/01_ORIGINAL/world/climate/future")
OUTPUT_DIR = Path("/mnt/data/srv/carto_private/02_SUBPROCESS/world/climate/test/hexagons")

# Script de conversión
SCRIPT_PATH = Path(__file__).parent / "tif_to_h3_pmtiles.py"

# Filtros opcionales (dejar vacío para procesar todo)
GCMS = []  # ej: ['GFDL-ESM4', 'MIROC6']
SSPS = []  # ej: ['ssp126', 'ssp245']
VARIABLES = []  # ej: ['tmin', 'tmax']
PERIODS = []  # ej: ['2021-2040', '2041-2060']


def get_output_filename(tif_path: Path) -> str:
    """
    Convierte nombre de TIF a nombre de PMTiles.
    wc2.1_30s_tmin_GFDL-ESM4_ssp126_2021-2040.tif -> tmin_GFDL-ESM4_ssp126_2021-2040.pmtiles
    """
    name = tif_path.stem  # wc2.1_30s_tmin_GFDL-ESM4_ssp126_2021-2040
    parts = name.split('_')
    # Saltar wc2.1 y 30s
    if len(parts) >= 6:
        variable = parts[2]
        gcm = parts[3]
        ssp = parts[4]
        period = parts[5]
        return f"{variable}_{gcm}_{ssp}_{period}.pmtiles"
    return name + ".pmtiles"


def should_process(tif_path: Path) -> bool:
    """Verifica si el archivo debe procesarse según los filtros."""
    name = tif_path.stem
    parts = name.split('_')

    if len(parts) < 6:
        return False

    variable = parts[2]
    gcm = parts[3]
    ssp = parts[4]
    period = parts[5]

    if GCMS and gcm not in GCMS:
        return False
    if SSPS and ssp not in SSPS:
        return False
    if VARIABLES and variable not in VARIABLES:
        return False
    if PERIODS and period not in PERIODS:
        return False

    return True


def find_tif_files() -> list:
    """Encuentra todos los archivos TIF en el directorio de entrada."""
    tif_files = []

    for gcm_dir in sorted(INPUT_DIR.iterdir()):
        if not gcm_dir.is_dir():
            continue

        for ssp_dir in sorted(gcm_dir.iterdir()):
            if not ssp_dir.is_dir():
                continue

            for tif_file in sorted(ssp_dir.glob("*.tif")):
                if should_process(tif_file):
                    tif_files.append(tif_file)

    return tif_files


def process_file(tif_path: Path, output_path: Path, index: int, total: int) -> bool:
    """Procesa un archivo TIF."""
    print(f"\n{'='*70}")
    print(f"[{index}/{total}] Procesando: {tif_path.name}")
    print(f"{'='*70}")

    cmd = [
        sys.executable,
        str(SCRIPT_PATH),
        str(tif_path),
        str(output_path),
        '--parquet'
    ]

    try:
        result = subprocess.run(cmd, check=True)
        return result.returncode == 0
    except subprocess.CalledProcessError as e:
        print(f"Error procesando {tif_path.name}: {e}")
        return False
    except KeyboardInterrupt:
        print("\nProceso interrumpido por el usuario.")
        sys.exit(1)


def main():
    print(f"\n{'='*70}")
    print("  Procesamiento en lote de TIF a PMTiles")
    print(f"{'='*70}")
    print(f"  Input:  {INPUT_DIR}")
    print(f"  Output: {OUTPUT_DIR}")
    print(f"  Filtros:")
    print(f"    GCMs:      {GCMS if GCMS else 'todos'}")
    print(f"    SSPs:      {SSPS if SSPS else 'todos'}")
    print(f"    Variables: {VARIABLES if VARIABLES else 'todas'}")
    print(f"    Periodos:  {PERIODS if PERIODS else 'todos'}")
    print(f"{'='*70}\n")

    # Crear directorio de salida
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Encontrar archivos TIF
    tif_files = find_tif_files()
    print(f"Archivos TIF encontrados: {len(tif_files)}")

    # Filtrar los que ya tienen PMTiles
    to_process = []
    skipped = 0

    for tif_path in tif_files:
        output_name = get_output_filename(tif_path)
        output_path = OUTPUT_DIR / output_name

        if output_path.exists():
            skipped += 1
        else:
            to_process.append((tif_path, output_path))

    print(f"Ya procesados (saltados): {skipped}")
    print(f"Pendientes de procesar: {len(to_process)}")

    if not to_process:
        print("\nNo hay archivos nuevos que procesar.")
        return

    # Procesar
    start_time = datetime.now()
    successful = 0
    failed = 0

    for i, (tif_path, output_path) in enumerate(to_process, 1):
        if process_file(tif_path, output_path, i, len(to_process)):
            successful += 1
        else:
            failed += 1

    # Resumen
    elapsed = datetime.now() - start_time
    print(f"\n{'='*70}")
    print("  RESUMEN")
    print(f"{'='*70}")
    print(f"  Procesados correctamente: {successful}")
    print(f"  Fallidos: {failed}")
    print(f"  Tiempo total: {elapsed}")
    print(f"{'='*70}\n")


if __name__ == "__main__":
    main()
