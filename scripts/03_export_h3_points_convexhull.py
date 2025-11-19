import pandas as pd
import numpy as np
import geopandas as gpd
from shapely.geometry import Polygon, Point, MultiPoint
from datetime import datetime
from pyproj import Transformer
from scipy.interpolate import RBFInterpolator
import argparse
import os

# --- Parámetros de configuración (ajústalos desde aquí) ---
# Interpolación RBF (extrapola y rellena todo el BBOX)
RBF_KERNEL = 'thin_plate_spline'   # opciones: 'multiquadric', 'gaussian', 'linear', 'cubic', 'quintic'
RBF_SMOOTHING = 0.0                # aumenta (p.ej. 0.3–1.0) si el campo es ruidoso
RBF_NEIGHBORS = None               # p.ej. 25 para acelerar con muchos puntos (aprox. local)

# Tratamiento de puntos en el borde del BBOX
INCLUDE_EDGE_POINTS = True  # True: incluye estaciones justo en el borde del BBOX

# BBOX en WGS84 (lon, lat). Orden: SW, NW, NE, SE y cierre (mismo que en 02)
BBOX_WGS84_COORDS = [
    (-3.784316, 40.337678),  # SW
    (-3.786519, 40.526999),  # NW
    (-3.568662, 40.528276),  # NE
    (-3.567069, 40.338947),  # SE
    (-3.784316, 40.337678),  # cierre
]
# -----------------------------------------------------------

# Helper dictionary from read_atmospheric_var.py
month_num = {1:'ene', 2:'feb', 3:'mar', 4:'abr', 5:'may', 6:'jun', 7:'jul', 8:'ago', 9:'sep', 10:'oct', 11:'nov', 12:'dic'}


def get_points_df(year, month, day, hour, var, airquality_hdf, estaciones_xls):
    """Reads station coordinates and hourly variable for a given timestamp."""
    print(f"Loading station data from {estaciones_xls}...")
    estaciones = pd.read_excel(estaciones_xls, sheet_name='Hoja1')
    estaciones_dict = {n.CODIGO_CORTO: [n.LONGITUD, n.LATITUD] for _, n in estaciones.iterrows()}

    timestamp = datetime(year=year, month=month, day=day).isoformat()
    df_label = f'/y{year}/{month_num[month]}_mo{str(year)[-2:]}'

    print(f"Reading atmospheric data from {airquality_hdf} for key: {df_label}...")
    with pd.HDFStore(airquality_hdf, mode='r') as store:
        if df_label not in store.keys():
            raise KeyError(f"Data key '{df_label}' not found in HDF5 file.")
        df = store.get(df_label)

    hour_col = f'H{hour:02d}'
    df_f = df[(df['timestamp'] == timestamp) & (df['MAGNITUD'] == var)].copy()
    df_f = df_f[['ESTACION', hour_col]].dropna()

    points_df = pd.DataFrame()
    points_df['sta'] = df_f['ESTACION']
    points_df['z'] = df_f[hour_col]
    points_df['lon'] = points_df['sta'].map(lambda s: estaciones_dict.get(s, [None, None])[0])
    points_df['lat'] = points_df['sta'].map(lambda s: estaciones_dict.get(s, [None, None])[1])

    return points_df.dropna(subset=['lon', 'lat', 'z'])


def build_h3_cells_in_bbox(bbox_lonlat, h3_res):
    """Genera celdas H3 dentro del BBOX mediante muestreo en rejilla + latlng_to_cell.
    Compatible con h3 v4 (preferido) y fallback a v3.
    """
    # Polígono del BBOX en WGS84
    bbox_poly_wgs84 = Polygon(bbox_lonlat)

    # Transformadores
    to3857 = Transformer.from_crs("EPSG:4326", "EPSG:3857", always_xy=True)
    to4326 = Transformer.from_crs("EPSG:3857", "EPSG:4326", always_xy=True)

    # Bounds en 3857 para generar la rejilla en metros
    xs_ll, ys_ll = zip(*bbox_lonlat)
    xs_3857, ys_3857 = to3857.transform(np.array(xs_ll), np.array(ys_ll))
    minx, miny, maxx, maxy = min(xs_3857), min(ys_3857), max(xs_3857), max(ys_3857)

    # Calcular paso de rejilla en metros a partir de una celda H3 de referencia
    step_m = None
    used_v = "v4"
    try:
        import h3 as h3v4
        # Centro del bbox en WGS84
        cx_ll = np.mean(xs_ll)
        cy_ll = np.mean(ys_ll)
        # Ojo: lat, lon para h3
        cell = h3v4.latlng_to_cell(cy_ll, cx_ll, h3_res)
        boundary = h3v4.cell_to_boundary(cell)
        bxs, bys = to3857.transform(np.array([lng for (lat, lng) in boundary]),
                                    np.array([lat for (lat, lng) in boundary]))
        width = (max(bxs) - min(bxs))
        height = (max(bys) - min(bys))
        step_m = max(min(width, height) / 2.5, 5.0)  # denso para no saltar celdas
    except Exception:
        used_v = "v3"
        # Fallback: tabla aproximada para edge length (m)
        approx_edge_m = {
            0: 1107000, 1: 418000, 2: 158000, 3: 59500, 4: 22400,
            5: 8450, 6: 3200, 7: 1200, 8: 460, 9: 174,
            10: 66, 11: 25, 12: 9, 13: 3.5, 14: 1.3, 15: 0.5,
        }
        e = approx_edge_m.get(h3_res, 500)
        step_m = max(e * 0.6, 5.0)

    # Construir rejilla
    xs_grid = np.arange(minx, maxx + step_m, step_m)
    ys_grid = np.arange(miny, maxy + step_m, step_m)

    cells_set = set()

    # Intentar v4, luego v3 para asignar celdas
    h3_v4 = None
    h3_v3 = None
    try:
        import h3 as h3_v4
    except Exception:
        try:
            from h3 import h3 as h3_v3
        except Exception:
            raise ImportError("No se pudo importar h3 (ni v4 ni v3) para latlng_to_cell/geo_to_h3.")

    for x in xs_grid:
        # vectorizar Y por filas podría hacerse, pero lo dejamos simple y legible
        for y in ys_grid:
            lon, lat = to4326.transform(x, y)
            if not bbox_poly_wgs84.contains(Point(lon, lat)):
                continue
            try:
                if h3_v4 is not None and hasattr(h3_v4, "latlng_to_cell"):
                    idx = h3_v4.latlng_to_cell(lat, lon, h3_res)
                else:
                    from h3 import h3 as h3v3_local
                    idx = h3v3_local.geo_to_h3(lat, lon, h3_res)
                cells_set.add(idx)
            except Exception:
                # Intentar v3 si v4 falla puntualmente
                try:
                    from h3 import h3 as h3v3_local
                    idx = h3v3_local.geo_to_h3(lat, lon, h3_res)
                    cells_set.add(idx)
                except Exception:
                    continue

    # Función para recuperar centro lat/lon de la celda
    def cell_to_latlng(cell):
        try:
            if h3_v4 is not None and hasattr(h3_v4, "cell_to_latlng"):
                lat, lng = h3_v4.cell_to_latlng(cell)
                return lat, lng
        except Exception:
            pass
        try:
            from h3 import h3 as h3v3_local
            lat, lng = h3v3_local.h3_to_geo(cell)
            return lat, lng
        except Exception:
            raise

    print(f"[H3] Grid sampling ({used_v}). Points: {len(xs_grid)*len(ys_grid)}, Cells: {len(cells_set)}")
    return list(cells_set), cell_to_latlng


# --- Convex hull helpers ---

def make_clip_polygon_convex(gdf_points):
    """Return convex hull polygon (EPSG:4326) built from station points in gdf_points.
    Raises if fewer than 3 non-collinear points are present.
    """
    pts = [Point(xy) for xy in zip(gdf_points['lon'], gdf_points['lat'])]
    hull = MultiPoint(pts).convex_hull
    if hull.geom_type != 'Polygon':
        # If there are <3 non-collinear points the hull is not a polygon
        raise ValueError("Convex hull requires at least 3 non-collinear stations.")
    return hull


def build_h3_cells_in_polygon(clip_poly_wgs84, h3_res):
    """Generate H3 cells whose centers fall inside a WGS84 polygon at the given resolution.
    Compatible with h3 v4 (preferred) and fallback to v3.
    """
    # Transformadores
    to3857 = Transformer.from_crs("EPSG:4326", "EPSG:3857", always_xy=True)
    to4326 = Transformer.from_crs("EPSG:3857", "EPSG:4326", always_xy=True)

    # Bounds en 3857 del polígono (usamos su bbox solo para muestreo de rejilla)
    xs_ll, ys_ll = clip_poly_wgs84.exterior.coords.xy
    xs_3857, ys_3857 = to3857.transform(np.array(xs_ll), np.array(ys_ll))
    minx, miny, maxx, maxy = min(xs_3857), min(ys_3857), max(xs_3857), max(ys_3857)

    # Calcular paso de rejilla en metros a partir de una celda H3 de referencia
    step_m = None
    used_v = "v4"
    try:
        import h3 as h3v4
        # Centro del polígono en WGS84
        cx_ll, cy_ll = clip_poly_wgs84.centroid.x, clip_poly_wgs84.centroid.y
        # Ojo: lat, lon para h3
        cell = h3v4.latlng_to_cell(cy_ll, cx_ll, h3_res)
        boundary = h3v4.cell_to_boundary(cell)
        bxs, bys = to3857.transform(np.array([lng for (lat, lng) in boundary]),
                                    np.array([lat for (lat, lng) in boundary]))
        width = (max(bxs) - min(bxs))
        height = (max(bys) - min(bys))
        step_m = max(min(width, height) / 2.5, 5.0)  # denso para no saltar celdas
    except Exception:
        used_v = "v3"
        approx_edge_m = {
            0: 1107000, 1: 418000, 2: 158000, 3: 59500, 4: 22400,
            5: 8450, 6: 3200, 7: 1200, 8: 460, 9: 174,
            10: 66, 11: 25, 12: 9, 13: 3.5, 14: 1.3, 15: 0.5,
        }
        e = approx_edge_m.get(h3_res, 500)
        step_m = max(e * 0.6, 5.0)

    xs_grid = np.arange(minx, maxx + step_m, step_m)
    ys_grid = np.arange(miny, maxy + step_m, step_m)

    cells_set = set()

    # Intentar v4, luego v3
    h3_v4 = None
    h3_v3 = None
    try:
        import h3 as h3_v4
    except Exception:
        try:
            from h3 import h3 as h3_v3
        except Exception:
            raise ImportError("No se pudo importar h3 (ni v4 ni v3) para latlng_to_cell/geo_to_h3.")

    for x in xs_grid:
        for y in ys_grid:
            lon, lat = to4326.transform(x, y)
            if not clip_poly_wgs84.contains(Point(lon, lat)):
                continue
            try:
                if h3_v4 is not None and hasattr(h3_v4, "latlng_to_cell"):
                    idx = h3_v4.latlng_to_cell(lat, lon, h3_res)
                else:
                    from h3 import h3 as h3v3_local
                    idx = h3v3_local.geo_to_h3(lat, lon, h3_res)
                cells_set.add(idx)
            except Exception:
                try:
                    from h3 import h3 as h3v3_local
                    idx = h3v3_local.geo_to_h3(lat, lon, h3_res)
                    cells_set.add(idx)
                except Exception:
                    continue

    def cell_to_latlng(cell):
        try:
            if h3_v4 is not None and hasattr(h3_v4, "cell_to_latlng"):
                lat, lng = h3_v4.cell_to_latlng(cell)
                return lat, lng
        except Exception:
            pass
        try:
            from h3 import h3 as h3v3_local
            lat, lng = h3v3_local.h3_to_geo(cell)
            return lat, lng
        except Exception:
            raise

    print(f"[H3] Grid sampling (poly {used_v}). Cells: {len(cells_set)}")
    return list(cells_set), cell_to_latlng


def main(args):
    try:
        # --- Paths ---
        estaciones_xls = 'informacion_estaciones_red_calidad_aire.xls'
        air_data_h5 = 'madno2-viewer/public/data/air_quality.h5'

        # --- Get station points ---
        df = get_points_df(args.year, args.month, args.day, args.hour, args.variable, air_data_h5, estaciones_xls)
        if df.empty:
            print("No data found for the specified parameters. Exiting.")
            return

        print(f"Found {len(df)} station values.")

        # --- Filter by BBOX ---
        bbox_poly_wgs84 = Polygon(BBOX_WGS84_COORDS)
        gdf = gpd.GeoDataFrame(df.copy(), geometry=gpd.points_from_xy(df.lon, df.lat), crs="EPSG:4326")
        if INCLUDE_EDGE_POINTS:
            mask_pts = gdf.geometry.within(bbox_poly_wgs84) | gdf.geometry.touches(bbox_poly_wgs84)
        else:
            mask_pts = gdf.geometry.within(bbox_poly_wgs84)
        gdf = gdf[mask_pts]
        if len(gdf) < 3:
            raise ValueError("Hay menos de 3 estaciones dentro del BBOX: la interpolación RBF sería inestable.")

        # --- Interpolator (in EPSG:3857) ---
        wgs84_to_3857 = Transformer.from_crs("EPSG:4326", "EPSG:3857", always_xy=True)
        xs, ys = wgs84_to_3857.transform(gdf['lon'].values, gdf['lat'].values)
        zs = gdf['z'].values

        rbf = RBFInterpolator(
            np.column_stack([xs, ys]),
            zs,
            kernel=RBF_KERNEL,
            smoothing=RBF_SMOOTHING,
            neighbors=RBF_NEIGHBORS,
        )

        # --- Build H3 cells within convex hull of stations ---
        clip_poly_wgs84 = make_clip_polygon_convex(gdf)
        cells, cell_to_latlng = build_h3_cells_in_polygon(clip_poly_wgs84, args.h3_res)
        print(f"Generated {len(cells)} H3 cells at res {args.h3_res} inside stations convex hull.")

        centers_lat = []
        centers_lon = []
        cells_list = []
        for cell in cells:
            lat, lon = cell_to_latlng(cell)  # (lat, lon)
            centers_lat.append(lat)
            centers_lon.append(lon)
            cells_list.append(cell)

        cx, cy = wgs84_to_3857.transform(np.array(centers_lon), np.array(centers_lat))
        pred = rbf(np.column_stack([cx, cy]))

        # Clip valores negativos (no deberían existir)
        pred = np.clip(pred, 0, None)

        # --- Build output DataFrame ---
        dt_str = f"{args.year:04d}-{args.month:02d}-{args.day:02d} {args.hour:02d}:00:00"
        out_df = pd.DataFrame({
            'h3_index': cells_list,
            'datetime': dt_str,
            'value': np.round(pred, 3)
        })

        # --- Save CSV ---
        os.makedirs(os.path.dirname(args.output), exist_ok=True) if os.path.dirname(args.output) else None
        out_df.to_csv(args.output, index=False)
        print(f"CSV saved to {os.path.abspath(args.output)} (rows: {len(out_df)})")

        # --- Save GeoJSON with hexagon polygons ---
        try:
            # Derive GeoJSON path if not provided
            if args.output_geojson:
                geojson_path = args.output_geojson
            else:
                base, _ = os.path.splitext(args.output)
                geojson_path = base + '.geojson'

            # Build polygon geometries for each H3 cell
            polys = []
            try:
                import h3 as h3v4
                for cell in cells_list:
                    boundary = h3v4.cell_to_boundary(cell)  # list of (lat, lng)
                    ring = [(lng, lat) for (lat, lng) in boundary]  # (lon, lat)
                    # cerrar anillo si es necesario
                    if ring[0] != ring[-1]:
                        ring.append(ring[0])
                    polys.append(Polygon(ring))
            except Exception:
                from h3 import h3 as h3v3
                for cell in cells_list:
                    boundary = h3v3.h3_to_geo_boundary(cell)  # list of (lat, lng)
                    ring = [(lng, lat) for (lat, lng) in boundary]
                    if ring[0] != ring[-1]:
                        ring.append(ring[0])
                    polys.append(Polygon(ring))

            gdf_out = gpd.GeoDataFrame(out_df.copy(), geometry=polys, crs='EPSG:4326')
            # Ensure parent folder exists
            if os.path.dirname(geojson_path):
                os.makedirs(os.path.dirname(geojson_path), exist_ok=True)
            gdf_out.to_file(geojson_path, driver='GeoJSON')
            print(f"GeoJSON saved to {os.path.abspath(geojson_path)} (features: {len(gdf_out)})")
        except Exception as e:
            print(f"WARNING: Failed to write GeoJSON: {e}")

        # --- (Opcional) Export a GeoParquet con geometría del hex ---
        # from shapely.geometry import Polygon as ShpPolygon
        # import h3
        # polys = []
        # for cell in cells_list:
        #     try:
        #         # v4
        #         boundary = h3.cell_to_boundary(cell)
        #         poly_coords = [(lng, lat) for lat, lng in boundary]  # lon,lat
        #     except Exception:
        #         # v3
        #         from h3 import h3 as h3v3
        #         boundary = h3v3.h3_to_geo_boundary(cell)
        #         poly_coords = [(lng, lat) for lat, lng in boundary]
        #     polys.append(ShpPolygon(poly_coords))
        # gdf_out = gpd.GeoDataFrame(out_df, geometry=polys, crs="EPSG:4326")
        # gdf_out.to_parquet("h3_points.parquet")

    except FileNotFoundError as e:
        print(f"ERROR: File not found. Make sure you are running the script from the project root. {e}")
    except KeyError as e:
        print(f"ERROR: Data not found, likely for the given date/time or variable. {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Export interpolated values on H3 cells within a BBOX to CSV.')
    parser.add_argument('--year', type=int, default=2024, help='Year of the data to export.')
    parser.add_argument('--month', type=int, default=8, help='Month of the data to export.')
    parser.add_argument('--day', type=int, default=7, help='Day of the data to export.')
    parser.add_argument('--hour', type=int, default=9, help='Hour of the data to export (0-23).')
    parser.add_argument('--variable', type=int, default=12, help='Atmospheric variable code to export.')
    parser.add_argument('--h3-res', type=int, default=8, help='H3 resolution (0-15).')
    parser.add_argument('-o', '--output', type=str, default='madno2-viewer/public/data/points_8.csv', help='Output CSV path.')
    parser.add_argument('--output-geojson', type=str, default='', help='Output GeoJSON path (optional). If empty, will derive from CSV path.')
    args = parser.parse_args()
    main(args)
