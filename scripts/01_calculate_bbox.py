import pandas as pd
import geopandas as gpd
from shapely.geometry import Point, Polygon
import matplotlib.pyplot as plt
from pyproj import Transformer
import os
import contextily as ctx

def main():
    """
    This script reads station information, calculates a bounding box, and generates a map
    with an OpenStreetMap background, showing the stations and the calculated box.
    """
    try:
        # --- Configuration ---
        margin = 1000  # Margin in meters
        xls_path = 'informacion_estaciones_red_calidad_aire.xls'
        output_image_path = 'bbox_map.png'
        map_zoom_level = 12

        # --- Column Names ---
        col_station_name = 'ESTACION'
        col_date = 'Fecha alta'
        col_x = 'COORDENADA_X_ETRS89'
        col_y = 'COORDENADA_Y_ETRS89'

        # --- Load Data ---
        print(f"Reading data from {xls_path}...")
        stations_df = pd.read_excel(
            xls_path, 
            sheet_name='Hoja1', 
            header=0,
            usecols=[col_station_name, col_date, col_x, col_y]
        )

        # --- Data Cleaning and Preparation ---
        stations_df.rename(columns={
            col_station_name: 'nombre',
            col_date: 'fecha_alta',
            col_x: 'x_etrs89',
            col_y: 'y_etrs89'
        }, inplace=True)
        stations_df.dropna(subset=['x_etrs89', 'y_etrs89'], inplace=True)
        stations_df['fecha_alta'] = pd.to_datetime(stations_df['fecha_alta'], errors='coerce')

        # --- Coordinate Transformation (ETRS89 to WGS84) ---
        print("Transforming coordinates to WGS84...")
        etrs89_to_wgs84 = Transformer.from_crs("epsg:25830", "epsg:4326", always_xy=True)
        stations_df['lon_wgs84'], stations_df['lat_wgs84'] = etrs89_to_wgs84.transform(
            stations_df['x_etrs89'].values, stations_df['y_etrs89'].values
        )

        # --- Bounding Box Calculation ---
        min_x_etrs = stations_df['x_etrs89'].min() - margin
        max_x_etrs = stations_df['x_etrs89'].max() + margin
        min_y_etrs = stations_df['y_etrs89'].min() - margin
        max_y_etrs = stations_df['y_etrs89'].max() + margin
        
        bbox_etrs_corners = [
            (min_x_etrs, min_y_etrs), (min_x_etrs, max_y_etrs), 
            (max_x_etrs, max_y_etrs), (max_x_etrs, min_y_etrs)
        ]
        # --- Output bounding box coordinates in ETRS89/UTM 30N ---
        labels = ['SW', 'NW', 'NE', 'SE']  # mismo orden que bbox_etrs_corners
        print("\nBounding box ETRS89 / UTM 30N (x, y, EPSG:25830):")
        for lab, (x, y) in zip(labels, bbox_etrs_corners):
            print(f"  {lab}: {x:.3f}, {y:.3f}")
        print(f"  extent: minx={min_x_etrs:.3f}, miny={min_y_etrs:.3f}, maxx={max_x_etrs:.3f}, maxy={max_y_etrs:.3f}")
        
        bbox_lons, bbox_lats = etrs89_to_wgs84.transform([c[0] for c in bbox_etrs_corners], [c[1] for c in bbox_etrs_corners])
        
        # --- Output bounding box coordinates in WGS84 ---
        bbox_wgs84 = list(zip(bbox_lons, bbox_lats))
        labels = ['SW', 'NW', 'NE', 'SE']  # Correspondiente al orden en bbox_etrs_corners
        print("\nBounding box WGS84 (lon, lat):")
        for lab, (lon, lat) in zip(labels, bbox_wgs84):
            print(f"  {lab}: {lon:.6f}, {lat:.6f}")
        print(f"  extent: minlon={min(bbox_lons):.6f}, minlat={min(bbox_lats):.6f}, maxlon={max(bbox_lons):.6f}, maxlat={max(bbox_lats):.6f}")

        # --- Plotting Setup (sin Cartopy) ---
        print("Generando mapa con contextily (sin Cartopy)...")

        # Crear GeoDataFrame de estaciones en WGS84 y convertir a Web Mercator (EPSG:3857)
        stations_gdf = gpd.GeoDataFrame(
            stations_df.copy(),
            geometry=gpd.points_from_xy(stations_df['lon_wgs84'], stations_df['lat_wgs84']),
            crs="EPSG:4326",
        )
        stations_3857 = stations_gdf.to_crs(epsg=3857)

        # Polígono del bounding box en ETRS89 -> 3857
        bbox_poly_etrs = Polygon(bbox_etrs_corners)
        bbox_gdf = gpd.GeoDataFrame(geometry=[bbox_poly_etrs], crs="EPSG:25830").to_crs(epsg=3857)

        fig, ax = plt.subplots(figsize=(15, 15))

        # Ajustar la extensión del mapa con un pequeño padding
        minx, miny, maxx, maxy = bbox_gdf.total_bounds
        pad_x = (maxx - minx) * 0.05
        pad_y = (maxy - miny) * 0.05
        ax.set_xlim(minx - pad_x, maxx + pad_x)
        ax.set_ylim(miny - pad_y, maxy + pad_y)

        # Añadir mapa base OSM
        ctx.add_basemap(ax, zoom=map_zoom_level, source=ctx.providers.OpenStreetMap.Mapnik)

        # Dibujar bounding box
        bbox_gdf.boundary.plot(ax=ax, color='red', linewidth=2, label='Bounding Box')

        # Dibujar estaciones
        ax.scatter(
            stations_3857.geometry.x,
            stations_3857.geometry.y,
            marker='o', s=50, label='Stations'
        )

        # Etiquetas
        for _, row in stations_3857.iterrows():
            date_str = row['fecha_alta'].strftime('%Y-%m-%d') if pd.notna(row['fecha_alta']) else 'N/A'
            ax.annotate(
                f"{row['nombre']}\n({date_str})",
                xy=(row.geometry.x, row.geometry.y),
                xytext=(3, 3),
                textcoords="offset points",
                fontsize=8,
                color='black',
                bbox=dict(facecolor=(1, 1, 1, 0.6), edgecolor='none', pad=1)
            )

        ax.set_title('Stations and Bounding Box')
        ax.legend()
        ax.grid(True)

        # --- Save Output ---
        plt.savefig(output_image_path, dpi=300)
        print(f"Map successfully saved to {os.path.abspath(output_image_path)}")

    except FileNotFoundError:
        print(f"ERROR: The file '{xls_path}' was not found.")
    except KeyError as e:
        print(f"ERROR: A column name was not found: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == '__main__':
    main()