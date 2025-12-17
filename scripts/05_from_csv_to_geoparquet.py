import os
import pandas as pd
from pathlib import Path
from datetime import datetime
from collections import defaultdict

# --- CONFIGURACIÓN ---
# Carpeta con los CSV organizados por año
#input_folder = '/Users/luisizquierdo/repos/upm/madno2/madno2-viewer/public/data/series'
input_folder = '/Volumes/MV/carto/madno2'
# Carpeta de salida para los Parquet particionados
#output_folder = '/Users/luisizquierdo/repos/upm/madno2/madno2-viewer/public/data/parquet'
output_folder = '/Volumes/MV/carto/madno2Parquet'

# --- PROCESO PRINCIPAL ---
def process_csv_to_partitioned_parquet():
    """
    Lee CSVs organizados por año y genera Parquet particionados por año/mes.
    Estructura de salida: parquet/year=YYYY/month=MM/data.parquet

    Ventajas:
    - Procesa en batches para no saturar memoria
    - Particionado eficiente para queries temporales
    - Compatible con DuckDB, Polars, Arrow, etc.
    """

    if not os.path.isdir(input_folder):
        print(f"Error: La carpeta de entrada '{input_folder}' no existe.")
        return

    # Obtener todos los años disponibles
    year_folders = sorted([d for d in os.listdir(input_folder)
                          if os.path.isdir(os.path.join(input_folder, d))
                          and d.isdigit()])

    # Para pruebas, procesar solo el primer año
    # Comentar esta línea para procesar todos los años
    # year_folders = year_folders[:1]

    if not year_folders:
        print(f"No se encontraron carpetas de años en {input_folder}")
        return

    print(f"Años encontrados: {', '.join(year_folders)}")
    print(f"Procesando datos y generando particiones en {output_folder}\n")

    # Procesar cada año
    for year in year_folders:
        year_path = os.path.join(input_folder, year)
        print(f"\n{'='*60}")
        print(f"Procesando año {year}...")
        print(f"{'='*60}")

        # Agrupar archivos CSV por mes
        monthly_files = defaultdict(list)

        for filename in os.listdir(year_path):
            if filename.endswith('.csv') and 'points_' in filename:
                # Extraer fecha del nombre: points_YYYYMMDD_HH_res9.csv
                try:
                    parts = filename.split('_')
                    date_str = parts[1]  # YYYYMMDD
                    year_from_file = date_str[:4]
                    month = date_str[4:6]

                    file_path = os.path.join(year_path, filename)
                    monthly_files[f"{year_from_file}-{month}"].append(file_path)
                except Exception as e:
                    print(f"Warning: No se pudo procesar el nombre del archivo {filename}: {e}")
                    continue

        # Procesar cada mes
        for year_month, csv_files in sorted(monthly_files.items()):
            year_part, month_part = year_month.split('-')

            print(f"\n  Procesando {year_month} ({len(csv_files)} archivos)...")

            # Leer todos los CSVs del mes en batches
            month_dfs = []
            for i, csv_file in enumerate(csv_files, 1):
                try:
                    df = pd.read_csv(csv_file)

                    # Validar estructura
                    if 'h3_index' not in df.columns or 'datetime' not in df.columns or 'value' not in df.columns:
                        print(f"    Warning: Archivo {os.path.basename(csv_file)} no tiene las columnas esperadas. Saltando...")
                        continue

                    # Corregir formato de hora 24 (debería ser 00 del día siguiente)
                    # Reemplazar hora 24 con 00 antes de parsear
                    df['datetime'] = df['datetime'].str.replace(' 24:', ' 00:', regex=False)

                    # Convertir datetime a tipo datetime
                    df['datetime'] = pd.to_datetime(df['datetime'])

                    # Añadir columnas de partición
                    df['year'] = df['datetime'].dt.year
                    df['month'] = df['datetime'].dt.month

                    month_dfs.append(df)

                    if i % 100 == 0:
                        print(f"    Procesados {i}/{len(csv_files)} archivos...")

                except Exception as e:
                    print(f"    Error al leer {os.path.basename(csv_file)}: {e}")
                    continue

            if not month_dfs:
                print(f"    No se encontraron datos válidos para {year_month}")
                continue

            # Concatenar todos los DataFrames del mes
            print(f"    Concatenando {len(month_dfs)} DataFrames...")
            month_combined = pd.concat(month_dfs, ignore_index=True)

            # Crear directorio de partición
            partition_path = os.path.join(output_folder, f"year={year_part}", f"month={month_part}")
            os.makedirs(partition_path, exist_ok=True)

            # Guardar como Parquet con compresión
            output_file = os.path.join(partition_path, "data.parquet")

            print(f"    Guardando {len(month_combined):,} registros en {output_file}...")
            month_combined.to_parquet(
                output_file,
                engine='pyarrow',
                compression='snappy',
                index=False
            )

            # Mostrar estadísticas
            file_size_mb = os.path.getsize(output_file) / (1024 * 1024)
            print(f"    ✓ Guardado: {len(month_combined):,} registros ({file_size_mb:.2f} MB)")
            print(f"    Rango temporal: {month_combined['datetime'].min()} - {month_combined['datetime'].max()}")
            print(f"    H3 cells únicos: {month_combined['h3_index'].nunique():,}")

            # Liberar memoria
            del month_combined
            del month_dfs

    print(f"\n{'='*60}")
    print("¡Proceso completado con éxito!")
    print(f"{'='*60}")
    print(f"\nParticiones creadas en: {output_folder}")

    # Mostrar estructura final
    print("\nEstructura de particiones generada:")
    for root, dirs, files in os.walk(output_folder):
        level = root.replace(output_folder, '').count(os.sep)
        indent = ' ' * 2 * level
        print(f"{indent}{os.path.basename(root)}/")
        sub_indent = ' ' * 2 * (level + 1)
        for file in files:
            if file.endswith('.parquet'):
                file_path = os.path.join(root, file)
                size_mb = os.path.getsize(file_path) / (1024 * 1024)
                print(f"{sub_indent}{file} ({size_mb:.2f} MB)")

# Run the script
if __name__ == "__main__":
    process_csv_to_partitioned_parquet()
