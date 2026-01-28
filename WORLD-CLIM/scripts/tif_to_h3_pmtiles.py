#!/usr/bin/env python3
"""
Script para convertir archivos TIF a PMTiles con hexágonos H3.
Genera múltiples resoluciones H3 para diferentes niveles de zoom.
"""

import argparse
import subprocess
import sys
import tempfile
import json
from pathlib import Path
from typing import List, Dict, Optional
import numpy as np

try:
    import rasterio
    from rasterio.enums import Resampling
except ImportError:
    print("Error: rasterio no está instalado. Ejecuta: pip install rasterio")
    sys.exit(1)

try:
    import h3
except ImportError:
    print("Error: h3 no está instalado. Ejecuta: pip install h3")
    sys.exit(1)

from tqdm import tqdm

# Parquet es opcional
try:
    import pyarrow as pa
    import pyarrow.parquet as pq
    PARQUET_AVAILABLE = True
except ImportError:
    PARQUET_AVAILABLE = False

# Configuración de resoluciones H3 y niveles de zoom
# Para datos globales, limitar a resoluciones bajas para evitar generar
# cientos de millones de celdas (res 7 = ~100M, res 8 = ~700M celdas)
H3_CONFIG = [
    {'h3_res': 1, 'min_zoom': 0, 'max_zoom': 3, 'method': 'mean'},
    {'h3_res': 3, 'min_zoom': 4, 'max_zoom': 6, 'method': 'mean'},
    {'h3_res': 5, 'min_zoom': 7, 'max_zoom': 14, 'method': 'mean'},
]

# Configuración alternativa para áreas pequeñas (incluye resoluciones altas)
H3_CONFIG_DETAILED = [
    {'h3_res': 1, 'min_zoom': 0, 'max_zoom': 3, 'method': 'mean'},
    {'h3_res': 3, 'min_zoom': 4, 'max_zoom': 6, 'method': 'mean'},
    {'h3_res': 5, 'min_zoom': 7, 'max_zoom': 9, 'method': 'mean'},
    {'h3_res': 7, 'min_zoom': 10, 'max_zoom': 11, 'method': 'bilinear'},
    {'h3_res': 8, 'min_zoom': 12, 'max_zoom': 14, 'method': 'bilinear'},
]


def get_raster_bounds(src) -> Dict:
    """Obtiene los límites del raster."""
    bounds = src.bounds
    return {
        'west': bounds.left,
        'south': bounds.bottom,
        'east': bounds.right,
        'north': bounds.top
    }


def sample_bilinear(src, lon: float, lat: float, band: int = 1) -> Optional[float]:
    """
    Obtiene el valor interpolado bilinealmente en una coordenada.
    """
    try:
        # Convertir coordenadas a píxeles
        row, col = src.index(lon, lat)

        # Verificar que está dentro de los límites
        if row < 0 or row >= src.height or col < 0 or col >= src.width:
            return None

        # Leer ventana 2x2 para interpolación
        row_floor = max(0, int(row))
        col_floor = max(0, int(col))
        row_ceil = min(src.height - 1, row_floor + 1)
        col_ceil = min(src.width - 1, col_floor + 1)

        # Leer los 4 píxeles
        window = rasterio.windows.Window(col_floor, row_floor,
                                          col_ceil - col_floor + 1,
                                          row_ceil - row_floor + 1)
        data = src.read(band, window=window)

        # Si es un solo píxel, devolver directamente
        if data.size == 1:
            val = float(data[0, 0])
            return None if val == src.nodata else val

        # Interpolación bilinear
        row_frac = row - row_floor
        col_frac = col - col_floor

        # Manejar bordes
        if data.shape[0] < 2:
            row_frac = 0
        if data.shape[1] < 2:
            col_frac = 0

        # Verificar nodata
        nodata = src.nodata
        if nodata is not None:
            if np.any(data == nodata):
                # Si hay nodata en la ventana, usar el valor más cercano válido
                valid_mask = data != nodata
                if not np.any(valid_mask):
                    return None
                val = float(np.mean(data[valid_mask]))
                return val

        # Interpolación
        if data.shape == (2, 2):
            top = data[0, 0] * (1 - col_frac) + data[0, 1] * col_frac
            bottom = data[1, 0] * (1 - col_frac) + data[1, 1] * col_frac
            val = top * (1 - row_frac) + bottom * row_frac
        else:
            val = float(data[0, 0])

        return float(val)

    except Exception:
        return None


def get_hexagons_for_bounds(bounds: Dict, h3_res: int) -> List[str]:
    """
    Genera todos los hexágonos H3 que cubren un área.
    Para datos globales, usa las celdas base H3 y expande a la resolución deseada.
    """
    # Detectar si es un raster global (cubre casi todo el mundo)
    is_global = (
        bounds['west'] <= -179 and bounds['east'] >= 179 and
        bounds['south'] <= -60 and bounds['north'] >= 60
    )

    if is_global:
        # Para datos globales, obtener todas las celdas expandiendo desde res 0
        print(f"    (Raster global detectado, generando todas las celdas H3...)")
        res0_cells = h3.get_res0_cells()
        hexagons = set()
        for cell in res0_cells:
            if h3_res == 0:
                hexagons.add(cell)
            else:
                children = h3.cell_to_children(cell, h3_res)
                hexagons.update(children)
        return list(hexagons)
    else:
        # Para áreas pequeñas, usar geo_to_cells
        polygon = {
            'type': 'Polygon',
            'coordinates': [[
                [bounds['west'], bounds['south']],
                [bounds['east'], bounds['south']],
                [bounds['east'], bounds['north']],
                [bounds['west'], bounds['north']],
                [bounds['west'], bounds['south']]
            ]]
        }
        hexagons = h3.geo_to_cells(polygon, h3_res)
        return list(hexagons)


def process_h3_resolution_mean(src, h3_res: int, bounds: Dict) -> List[Dict]:
    """
    Procesa una resolución H3 usando agregación por media (para res bajas).
    """
    print(f"  Generando hexágonos H3 res {h3_res}...")
    hexagons = get_hexagons_for_bounds(bounds, h3_res)
    print(f"  Total hexágonos: {len(hexagons)}")

    features = []
    band_data = src.read(1)
    nodata = src.nodata
    transform = src.transform

    for hex_id in tqdm(hexagons, desc=f"  H3 res {h3_res}", leave=False):
        # Obtener límites del hexágono
        hex_boundary = h3.cell_to_boundary(hex_id)

        # Convertir a coordenadas de píxel y obtener bounding box
        rows = []
        cols = []
        for lat, lon in hex_boundary:
            try:
                r, c = src.index(lon, lat)
                rows.append(r)
                cols.append(c)
            except Exception:
                continue

        if not rows or not cols:
            continue

        min_row = max(0, min(rows))
        max_row = min(src.height - 1, max(rows))
        min_col = max(0, min(cols))
        max_col = min(src.width - 1, max(cols))

        # Extraer ventana de datos
        window_data = band_data[min_row:max_row+1, min_col:max_col+1]

        if window_data.size == 0:
            continue

        # Calcular media excluyendo nodata
        if nodata is not None:
            valid_data = window_data[window_data != nodata]
        else:
            valid_data = window_data.flatten()

        if valid_data.size == 0:
            continue

        # Filtrar NaN antes de calcular la media
        valid_data = valid_data[~np.isnan(valid_data)]
        if valid_data.size == 0:
            continue

        value = float(np.mean(valid_data))

        # Verificar que el valor no sea NaN o Inf
        if np.isnan(value) or np.isinf(value):
            continue

        # Crear feature GeoJSON
        # Convertir boundary a formato GeoJSON (lon, lat)
        coords = [[lon, lat] for lat, lon in hex_boundary]
        coords.append(coords[0])  # Cerrar el polígono

        feature = {
            'type': 'Feature',
            'properties': {
                'h3': hex_id,
                'value': round(value, 2)
            },
            'geometry': {
                'type': 'Polygon',
                'coordinates': [coords]
            }
        }
        features.append(feature)

    return features


def process_h3_resolution_bilinear(src, h3_res: int, bounds: Dict) -> List[Dict]:
    """
    Procesa una resolución H3 usando interpolación bilinear en el centroide.
    """
    print(f"  Generando hexágonos H3 res {h3_res}...")
    hexagons = get_hexagons_for_bounds(bounds, h3_res)
    print(f"  Total hexágonos: {len(hexagons)}")

    features = []

    for hex_id in tqdm(hexagons, desc=f"  H3 res {h3_res}", leave=False):
        # Obtener centroide del hexágono
        lat, lon = h3.cell_to_latlng(hex_id)

        # Obtener valor interpolado
        value = sample_bilinear(src, lon, lat)

        if value is None:
            continue

        # Verificar que el valor no sea NaN o Inf
        if np.isnan(value) or np.isinf(value):
            continue

        # Crear feature GeoJSON
        hex_boundary = h3.cell_to_boundary(hex_id)
        coords = [[lon, lat] for lat, lon in hex_boundary]
        coords.append(coords[0])

        feature = {
            'type': 'Feature',
            'properties': {
                'h3': hex_id,
                'value': round(value, 2)
            },
            'geometry': {
                'type': 'Polygon',
                'coordinates': [coords]
            }
        }
        features.append(feature)

    return features


def write_geojson(features: List[Dict], output_path: Path):
    """Escribe features a archivo GeoJSON."""
    geojson = {
        'type': 'FeatureCollection',
        'features': features
    }
    with open(output_path, 'w') as f:
        json.dump(geojson, f)


def write_parquet(all_features: Dict[int, List[Dict]], output_path: Path):
    """
    Escribe todos los features a un archivo Parquet.
    Solo guarda h3_index, value y h3_res (sin geometría).
    """
    if not PARQUET_AVAILABLE:
        print("  Error: pyarrow no está instalado. Ejecuta: pip install pyarrow")
        return False

    h3_indices = []
    values = []
    h3_resolutions = []

    for h3_res, features in all_features.items():
        for feature in features:
            h3_indices.append(feature['properties']['h3'])
            values.append(feature['properties']['value'])
            h3_resolutions.append(h3_res)

    table = pa.table({
        'h3_index': pa.array(h3_indices, type=pa.string()),
        'value': pa.array(values, type=pa.float32()),
        'h3_res': pa.array(h3_resolutions, type=pa.uint8())
    })

    pq.write_table(table, output_path, compression='snappy')
    print(f"  Parquet guardado: {output_path}")
    print(f"  Tamaño: {output_path.stat().st_size / (1024*1024):.2f} MB")
    print(f"  Registros: {len(h3_indices)}")
    return True


def run_tippecanoe(geojson_files: List[Dict], output_pmtiles: Path):
    """
    Ejecuta tippecanoe para generar PMTiles.

    geojson_files: Lista de dicts con 'file', 'min_zoom', 'max_zoom'
    """
    print("\nGenerando PMTiles con tippecanoe...")

    # Construir comando
    cmd = [
        'tippecanoe',
        '-o', str(output_pmtiles),
        '--force',
        '--no-feature-limit',           # Sin límite de features por tile
        '--no-tile-size-limit',         # Sin límite de tamaño de tile
        '--simplification=10',          # Simplificar geometrías
        '--detect-shared-borders',      # Optimizar bordes compartidos
    ]

    for gj in geojson_files:
        layer_config = {
            'file': str(gj['file']),
            'layer': 'climate',
            'minzoom': gj['min_zoom'],
            'maxzoom': gj['max_zoom']
        }
        cmd.extend(['-L', json.dumps(layer_config)])

    print(f"  Comando: {' '.join(cmd[:5])}...")

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        print("  PMTiles generado correctamente")
        return True
    except subprocess.CalledProcessError as e:
        print(f"  Error ejecutando tippecanoe: {e.stderr}")
        return False
    except FileNotFoundError:
        print("  Error: tippecanoe no está instalado.")
        print("  Instálalo con: brew install tippecanoe (macOS) o desde https://github.com/felt/tippecanoe")
        return False


def is_global_raster(bounds: Dict) -> bool:
    """Detecta si un raster cubre todo el mundo."""
    return (
        bounds['west'] <= -179 and bounds['east'] >= 179 and
        bounds['south'] <= -60 and bounds['north'] >= 60
    )


def process_tif_to_pmtiles(
    input_tif: Path,
    output_pmtiles: Path,
    h3_config: List[Dict] = None,
    keep_geojson: bool = False,
    generate_parquet: bool = False,
    force_detailed: bool = False
):
    """
    Procesa un archivo TIF y genera PMTiles con hexágonos H3.

    force_detailed: Forzar uso de resoluciones altas (solo para áreas pequeñas)
    """
    # La configuración se determina después de leer el raster
    config_to_use = h3_config

    # Verificar que existe el archivo
    if not input_tif.exists():
        print(f"Error: El archivo {input_tif} no existe.")
        return False

    # Crear directorio de salida si no existe
    output_pmtiles.parent.mkdir(parents=True, exist_ok=True)

    # Directorio para GeoJSON temporales (en el mismo directorio que la salida)
    temp_dir = output_pmtiles.parent / f".temp_geojson_{output_pmtiles.stem}"
    temp_dir.mkdir(parents=True, exist_ok=True)

    geojson_files = []
    all_features_for_parquet = {}  # Para almacenar features por resolución

    try:
        # Abrir raster
        with rasterio.open(input_tif) as src:
            bounds = get_raster_bounds(src)

            # Detectar si es global y ajustar configuración
            is_global = is_global_raster(bounds)
            if config_to_use is None:
                if is_global and not force_detailed:
                    config_to_use = H3_CONFIG
                    print("NOTA: Raster global detectado. Usando resoluciones H3 1, 3 y 5.")
                    print("      (Resoluciones 7-8 generarían >100M celdas)")
                else:
                    config_to_use = H3_CONFIG_DETAILED

            print(f"\n{'='*70}")
            print(f"  TIF a H3 PMTiles")
            print(f"{'='*70}")
            print(f"  Entrada: {input_tif}")
            print(f"  Salida: {output_pmtiles}")
            print(f"  Tipo: {'GLOBAL' if is_global else 'REGIONAL'}")
            print(f"  Resoluciones H3: {[c['h3_res'] for c in config_to_use]}")
            print(f"  Generar Parquet: {'SI' if generate_parquet else 'NO'}")
            print(f"{'='*70}\n")

            print(f"Bounds: W={bounds['west']:.2f}, S={bounds['south']:.2f}, E={bounds['east']:.2f}, N={bounds['north']:.2f}")
            print(f"Tamaño: {src.width} x {src.height} píxeles")
            print(f"CRS: {src.crs}")
            print()

            # Procesar cada resolución H3
            for config in config_to_use:
                h3_res = config['h3_res']
                method = config['method']
                min_zoom = config['min_zoom']
                max_zoom = config['max_zoom']

                print(f"Procesando H3 res {h3_res} (zoom {min_zoom}-{max_zoom}, método: {method})...")

                if method == 'mean':
                    features = process_h3_resolution_mean(src, h3_res, bounds)
                else:  # bilinear
                    features = process_h3_resolution_bilinear(src, h3_res, bounds)

                if not features:
                    print(f"  Advertencia: No se generaron features para H3 res {h3_res}")
                    continue

                # Guardar features para parquet
                if generate_parquet:
                    all_features_for_parquet[h3_res] = features

                # Guardar GeoJSON
                geojson_path = temp_dir / f"h3_res{h3_res}.geojson"
                write_geojson(features, geojson_path)
                print(f"  Guardado: {geojson_path} ({len(features)} features)")

                geojson_files.append({
                    'file': geojson_path,
                    'min_zoom': min_zoom,
                    'max_zoom': max_zoom,
                    'h3_res': h3_res
                })

        if not geojson_files:
            print("Error: No se generaron archivos GeoJSON.")
            return False

        # Generar PMTiles
        success = run_tippecanoe(geojson_files, output_pmtiles)

        if success:
            print(f"\nPMTiles generado: {output_pmtiles}")
            print(f"Tamaño: {output_pmtiles.stat().st_size / (1024*1024):.2f} MB")

        # Generar Parquet si se solicitó
        if generate_parquet and all_features_for_parquet:
            parquet_path = output_pmtiles.with_suffix('.parquet')
            print(f"\nGenerando Parquet...")
            write_parquet(all_features_for_parquet, parquet_path)

        return success

    finally:
        # Limpiar archivos temporales
        if not keep_geojson:
            print("\nLimpiando archivos temporales...")
            for gj in geojson_files:
                try:
                    gj['file'].unlink()
                except Exception:
                    pass
            try:
                temp_dir.rmdir()
            except Exception:
                pass


def main():
    parser = argparse.ArgumentParser(
        description='Convierte archivos TIF a PMTiles con hexágonos H3',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos:
  # Convertir un TIF a PMTiles
  python tif_to_h3_pmtiles.py input.tif output.pmtiles

  # Generar también Parquet para consultas con DuckDB
  python tif_to_h3_pmtiles.py input.tif output.pmtiles --parquet

  # Mantener los GeoJSON intermedios
  python tif_to_h3_pmtiles.py input.tif output.pmtiles --keep-geojson

Requisitos:
  - Python: rasterio, h3, numpy, tqdm
  - Python (opcional): pyarrow (para --parquet)
  - Sistema: tippecanoe (https://github.com/felt/tippecanoe)

Estructura del Parquet:
  - h3_index (string): Índice H3 del hexágono
  - value (float32): Valor climático
  - h3_res (uint8): Resolución H3 (1, 3, 5, 7, 8)

Configuración H3:
  Para rasters GLOBALES (automático):
  - H3 res 1 (radio ~418km) -> zoom 0-3, método: mean
  - H3 res 3 (radio ~59km)  -> zoom 4-6, método: mean
  - H3 res 5 (radio ~8km)   -> zoom 7-14, método: mean
  (Resoluciones 7-8 generarían >100 millones de celdas)

  Para rasters REGIONALES (automático):
  - H3 res 1 -> zoom 0-3, método: mean
  - H3 res 3 -> zoom 4-6, método: mean
  - H3 res 5 -> zoom 7-9, método: mean
  - H3 res 7 -> zoom 10-11, método: bilinear
  - H3 res 8 -> zoom 12-14, método: bilinear
        """
    )

    parser.add_argument(
        'input',
        type=Path,
        help='Archivo TIF de entrada'
    )

    parser.add_argument(
        'output',
        type=Path,
        help='Archivo PMTiles de salida'
    )

    parser.add_argument(
        '--keep-geojson',
        action='store_true',
        help='Mantener los archivos GeoJSON intermedios'
    )

    parser.add_argument(
        '--parquet',
        action='store_true',
        help='Generar también archivo Parquet para consultas con DuckDB'
    )

    parser.add_argument(
        '--detailed',
        action='store_true',
        help='Forzar uso de resoluciones H3 altas (7-8) incluso para rasters globales (LENTO)'
    )

    args = parser.parse_args()

    # Verificar extensión de salida
    if not args.output.suffix.lower() == '.pmtiles':
        args.output = args.output.with_suffix('.pmtiles')

    # Verificar dependencias para parquet
    if args.parquet and not PARQUET_AVAILABLE:
        print("Error: pyarrow no está instalado. Ejecuta: pip install pyarrow")
        sys.exit(1)

    success = process_tif_to_pmtiles(
        input_tif=args.input,
        output_pmtiles=args.output,
        keep_geojson=args.keep_geojson,
        generate_parquet=args.parquet,
        force_detailed=args.detailed
    )

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
