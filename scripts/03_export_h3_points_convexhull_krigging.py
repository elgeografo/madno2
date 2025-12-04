from functions_03_convexhull import *
import argparse
import os
import geopandas as gpd
from pykrige.ok import OrdinaryKriging
import logging

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

        logging.info(f"Found {len(df)} station values.")

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

        ok = OrdinaryKriging(xs, ys, zs, variogram_model='linear')

        # --- Build H3 cells within convex hull of stations ---
        clip_poly_wgs84 = make_clip_polygon_convex(gdf)
        cells, cell_to_latlng = build_h3_cells_in_polygon(clip_poly_wgs84, args.h3_res)
        logging.info(f"Generated {len(cells)} H3 cells at res {args.h3_res} inside stations convex hull.")

        centers_lat = []
        centers_lon = []
        cells_list = []
        for cell in cells:
            lat, lon = cell_to_latlng(cell)  # (lat, lon)
            centers_lat.append(lat)
            centers_lon.append(lon)
            cells_list.append(cell)

        cx, cy = wgs84_to_3857.transform(np.array(centers_lon), np.array(centers_lat))
        pred = ok(np.column_stack([cx, cy]))

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
        logging.info(f"CSV saved to {os.path.abspath(args.output)} (rows: {len(out_df)})")

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
            logging.info(f"GeoJSON saved to {os.path.abspath(geojson_path)} (features: {len(gdf_out)})")
        except Exception as e:
            logging.warning(f"WARNING: Failed to write GeoJSON: {e}")

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
        logging.error(f"ERROR: File not found. Make sure you are running the script from the project root. {e}")
    except KeyError as e:
        logging.error(f"ERROR: Data not found, likely for the given date/time or variable. {e}")
    except Exception as e:
        logging.error(f"An unexpected error occurred: {e}")

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
