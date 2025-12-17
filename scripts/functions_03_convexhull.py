import pandas as pd
import numpy as np
from shapely.geometry import Polygon, Point, MultiPoint
from datetime import datetime, timedelta
from pyproj import Transformer
import logging

# -----------------------------------------------------------
# Helper dictionary from read_atmospheric_var.py
month_num = {1:'ene', 2:'feb', 3:'mar', 4:'abr', 5:'may', 6:'jun', 7:'jul', 8:'ago', 9:'sep', 10:'oct', 11:'nov', 12:'dic'}


def get_points_df(year, month, day, hour, var, airquality_hdf, estaciones_xls):
    """Reads station coordinates and hourly variable for a given timestamp."""
    logging.info(f"Loading station data from {estaciones_xls}...")

    if hour==0:
        # Madrid database format is broken
        dt = datetime(year, month, day, hour)
        new_dt = dt - timedelta(days=1)
        year = new_dt.year
        month = new_dt.month
        day = new_dt.day
        hour = 24

    estaciones = pd.read_excel(estaciones_xls, sheet_name='Hoja1')
    estaciones_dict = {n.CODIGO_CORTO: [n.LONGITUD, n.LATITUD] for _, n in estaciones.iterrows()}

    timestamp = datetime(year=year, month=month, day=day).isoformat()
    df_label = f'/y{year}/{month_num[month]}_mo{str(year)[-2:]}'

    logging.info(f"Reading atmospheric data from {airquality_hdf} for key: {df_label}...")
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

    logging.info(f"[H3] Grid sampling ({used_v}). Points: {len(xs_grid)*len(ys_grid)}, Cells: {len(cells_set)}")
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

    logging.info(f"[H3] Grid sampling (poly {used_v}). Cells: {len(cells_set)}")
    return list(cells_set), cell_to_latlng
