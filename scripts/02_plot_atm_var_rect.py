import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import geopandas as gpd
import contextily as ctx
from scipy.interpolate import RBFInterpolator
from datetime import datetime
import argparse
import os

from shapely.geometry import Polygon
from matplotlib.path import Path

# --- Parámetros de configuración (ajústalos desde aquí) ---
# Interpolación RBF (extrapola y rellena todo el BBOX)
RBF_KERNEL = 'thin_plate_spline'   # opciones: 'multiquadric', 'gaussian', 'linear', 'cubic', 'quintic'
RBF_SMOOTHING = 0.0                # aumenta (p.ej. 0.3–1.0) si el campo es ruidoso
RBF_NEIGHBORS = None               # p.ej. 25 para acelerar con muchos puntos (aprox. local)

# Resolución de la rejilla de interpolación dentro del BBOX
GRID_NX = 220   # número de columnas
GRID_NY = 220   # número de filas

# Visualización
CONTOUR_LEVELS = 12  # número de niveles en el contourf
BASEMAP_ZOOM   = 12  # zoom del mapa base OSM

# Tratamiento de puntos en el borde del BBOX
INCLUDE_EDGE_POINTS = True  # True: incluye estaciones justo en el borde del BBOX

# BBOX en WGS84 (lon, lat). Orden: SW, NW, NE, SE y cierre
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
    """Reads data for a specific variable and time, returning a DataFrame with coordinates."""
    print(f"Loading station data from {estaciones_xls}...")
    estaciones = pd.read_excel(estaciones_xls, sheet_name='Hoja1')
    estaciones_dict = {n.CODIGO_CORTO: [n.LONGITUD, n.LATITUD] for i, n in estaciones.iterrows()}
    
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
    points_df['lon'] = points_df.apply(lambda row: estaciones_dict.get(row.sta, [None, None])[0], axis=1)
    points_df['lat'] = points_df.apply(lambda row: estaciones_dict.get(row.sta, [None, None])[1], axis=1)
    
    return points_df.dropna(subset=['lon', 'lat', 'z'])

def main(args):
    """Main function to generate and plot the interpolated atmospheric data map."""
    try:
        # --- File Paths ---
        # Assumes the script is run from the project root directory
        estaciones_xls = 'informacion_estaciones_red_calidad_aire.xls'
        air_data_h5 = 'madno2-viewer/public/data/air_quality.h5'

        # --- Get Data ---
        df = get_points_df(args.year, args.month, args.day, args.hour, args.variable, air_data_h5, estaciones_xls)
        if df.empty:
            print("No data found for the specified parameters. Exiting.")
            return

        print(f"Found {len(df)} data points for interpolation.")

        # --- Interpolation (in Web Mercator EPSG:3857) with user BBOX ---
        print("Performing interpolation in EPSG:3857 within provided BBOX...")
        gdf = gpd.GeoDataFrame(df.copy(), geometry=gpd.points_from_xy(df.lon, df.lat), crs="EPSG:4326")

        # BBOX definido en la sección de configuración (WGS84)
        bbox_poly_wgs84 = Polygon(BBOX_WGS84_COORDS)

        # Filtrar estaciones según el BBOX (incluyendo opcionalmente las que caen en el borde)
        if INCLUDE_EDGE_POINTS:
            mask_pts = gdf.geometry.within(bbox_poly_wgs84) | gdf.geometry.touches(bbox_poly_wgs84)
        else:
            mask_pts = gdf.geometry.within(bbox_poly_wgs84)
        gdf = gdf[mask_pts]
        if gdf.empty:
            raise ValueError("No hay estaciones dentro del BBOX proporcionado.")

        # Project to Web Mercator
        gdf3857 = gdf.to_crs(epsg=3857)
        xs = gdf3857.geometry.x.values
        ys = gdf3857.geometry.y.values
        zs = gdf3857['z'].values

        # BBOX in 3857 for grid
        bbox3857_geom = gpd.GeoDataFrame(geometry=[bbox_poly_wgs84], crs="EPSG:4326").to_crs(epsg=3857).geometry.iloc[0]
        minx, miny, maxx, maxy = bbox3857_geom.bounds

        # Interpolador RBF que extrapola y rellena todo el BBOX
        Xv = np.linspace(minx, maxx, GRID_NX)
        Yv = np.linspace(miny, maxy, GRID_NY)
        X, Y = np.meshgrid(Xv, Yv)

        rbf = RBFInterpolator(
            np.column_stack([xs, ys]),
            zs,
            kernel=RBF_KERNEL,
            smoothing=RBF_SMOOTHING,
            neighbors=RBF_NEIGHBORS,
        )
        Z = rbf(np.column_stack([X.ravel(), Y.ravel()])).reshape(X.shape)

        # Mask outside polygon so we only show inside the BBOX
        path = Path(np.asarray(bbox3857_geom.exterior.coords))
        mask = path.contains_points(np.vstack([X.ravel(), Y.ravel()]).T).reshape(X.shape)
        Z = np.where(mask, Z, np.nan)

        # Save for plotting
        bbox_poly_3857 = gpd.GeoDataFrame(geometry=[bbox3857_geom], crs="EPSG:3857")

        # --- Plotting (sin Cartopy) ---
        print("Generating map (contextily)...")
        fig, ax = plt.subplots(figsize=(12, 12))

        # Ajustar extensión con padding
        padx = (maxx - minx) * 0.05
        pady = (maxy - miny) * 0.05
        ax.set_xlim(minx - padx, maxx + padx)
        ax.set_ylim(miny - pady, maxy + pady)

        # Mapa base OSM
        ctx.add_basemap(ax, zoom=BASEMAP_ZOOM, source=ctx.providers.OpenStreetMap.Mapnik)
        bbox_poly_3857.boundary.plot(ax=ax, color='red', linewidth=2, label='Bounding Box')

        # Contornos interpolados
        contour = ax.contourf(X, Y, Z, levels=CONTOUR_LEVELS, alpha=0.6, cmap='viridis')
        fig.colorbar(contour, ax=ax, orientation='vertical', label=f'Variable {args.variable} Concentration')

        # Estaciones
        ax.scatter(xs, ys, marker='s', s=40, edgecolor='black', label='Stations')

        ax.set_title(f'Atmospheric Variable {args.variable} on {args.day}/{args.month}/{args.year} at {args.hour}:00')
        ax.legend()
        ax.grid(True)

        # --- Save Output ---
        plt.savefig(args.output, dpi=300, bbox_inches='tight')
        print(f"Map successfully saved to {os.path.abspath(args.output)}")

    except FileNotFoundError as e:
        print(f"ERROR: File not found. Make sure you are running the script from the project root. {e}")
    except KeyError as e:
        print(f"ERROR: Data not found, likely for the given date/time or variable. {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Generate and plot an interpolated map of atmospheric data.')
    parser.add_argument('--year', type=int, default=2024, help='Year of the data to plot.')
    parser.add_argument('--month', type=int, default=8, help='Month of the data to plot.')
    parser.add_argument('--day', type=int, default=7, help='Day of the data to plot.')
    parser.add_argument('--hour', type=int, default=9, help='Hour of the data to plot (0-23).')
    parser.add_argument('--variable', type=int, default=12, help='Atmospheric variable code to plot.')
    parser.add_argument('-o', '--output', type=str, default='interpolated_map.png', help='Output image file name.')
    
    parsed_args = parser.parse_args()
    main(parsed_args)
