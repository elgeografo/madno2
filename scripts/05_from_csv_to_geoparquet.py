import os
import pandas as pd
import geopandas as gpd
from shapely.geometry import Polygon
import h3

# --- CONFIGURACIÓN ---
# Define la ruta a la carpeta donde están tus archivos CSV
# Asegúrate de que esta carpeta exista y contenga los archivos.
input_folder = '/Users/luisizquierdo/repos/upm/madno2/madno2-viewer/public/data/madno2020/' 
# Define la ruta y el nombre del archivo de salida GeoParquet
# Updated output directory based on user request.
output_file = '/Users/luisizquierdo/repos/upm/madno2/madno2-viewer/public/data/geoparquet/datos_completos.geoparquet' 

# --- FUNCIÓN DE CONVERSIÓN ---
def convert_h3_to_polygon(h3_index):
    """
    Convierte un índice H3 (string) a un objeto de geometría Polygon.
    """
    try:
        # La función correcta para la versión 4.x de la librería h3 es cell_to_boundary.
        # Las versiones anteriores utilizaban h3_to_geo_boundary.
        # La librería h3.py devuelve las coordenadas como (lat, lon).
        boundary = h3.cell_to_boundary(h3_index)
        # Shapely requiere que las coordenadas sean (lon, lat).
        # Invertimos las coordenadas para crear el polígono correctamente.
        inverted_boundary = [(lon, lat) for lat, lon in boundary]
        return Polygon(inverted_boundary)
    except Exception as e:
        print(f"Error al procesar el índice H3 '{h3_index}': {e}")
        return None

# --- PROCESO PRINCIPAL ---
def process_csv_to_geoparquet():
    """
    Reads all CSV files from a folder, processes them, and saves them
    as a single GeoParquet file.
    """
    all_dataframes = []
    
    # 1. Traverse all CSV files in the folder
    if not os.path.isdir(input_folder):
        print(f"Error: La carpeta de entrada '{input_folder}' no existe.")
        return

    print(f"Buscando archivos CSV en la carpeta: {input_folder}")
    for filename in os.listdir(input_folder):
        # Filters to process only files with the .csv extension
        if filename.endswith('.csv'):
            file_path = os.path.join(input_folder, filename)
            print(f"Procesando archivo: {filename}")
            
            # 2. Read the CSV file into a Pandas DataFrame
            try:
                df = pd.read_csv(file_path)
                all_dataframes.append(df)
            except Exception as e:
                print(f"Error al leer el archivo {filename}: {e}")
    
    if not all_dataframes:
        print("No se encontraron archivos CSV. ¡Asegúrate de que la ruta y los archivos sean correctos!")
        return

    # 3. Concatenate all DataFrames into one
    print("Concatenando todos los datos...")
    df_combined = pd.concat(all_dataframes, ignore_index=True)
    
    # 4. Create the geometry column from the H3 index
    print("Convirtiendo índices H3 a polígonos...")
    df_combined['geometry'] = df_combined['h3_index'].apply(convert_h3_to_polygon)
    
    # Remove rows that could not be converted (if any)
    df_combined.dropna(subset=['geometry'], inplace=True)
    
    # 5. Convert the Pandas DataFrame to a GeoDataFrame
    print("Creando GeoDataFrame y configurando CRS...")
    # The GeoDataFrame is created and the Coordinate Reference System (CRS) is assigned
    # WGS84 (EPSG:4326) is the standard for latitude/longitude coordinates
    gdf = gpd.GeoDataFrame(df_combined, geometry='geometry', crs="EPSG:4326")
    
    # 6. Save the GeoDataFrame to GeoParquet format
    print(f"Guardando los datos en {output_file}...")
    # Ensures the output directory exists before saving
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    try:
        gdf.to_parquet(output_file, compression='snappy')
        print("¡Proceso completado con éxito!")
        print(f"El archivo GeoParquet ha sido creado en: {os.path.abspath(output_file)}")
    except Exception as e:
        print(f"Error al guardar el archivo GeoParquet: {e}")

# Run the script
if __name__ == "__main__":
    process_csv_to_geoparquet()
