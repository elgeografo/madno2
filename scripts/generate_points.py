#!/usr/bin/env python3
import argparse
import pandas as pd
import h3
import logging
from datetime import datetime

logging.basicConfig(level=logging.WARNING, format='%(levelname)s:%(message)s')

def parse_args():
    parser = argparse.ArgumentParser(description="Genera points.csv con índices H3 para NO₂ horario.")
    parser.add_argument('--stations-file', required=True, help='Ruta al CSV de estaciones')
    parser.add_argument('--data-file', required=True, help='Ruta al CSV de datos horario')
    parser.add_argument('--date', required=True, help='Fecha a filtrar (YYYY-MM-DD)')
    parser.add_argument('--hour', type=int, required=True, help='Hora a filtrar (0-23)')
    parser.add_argument('--h3-res', type=int, default=7, help='Resolución H3')
    parser.add_argument('--output-file', default='points.csv', help='Archivo de salida')
    return parser.parse_args()

def main():
    args = parse_args()
    # Cargar estaciones
    stations = pd.read_csv(args.stations_file, sep=';', encoding='latin1')
    stations = stations[['CODIGO_CORTO','LATITUD','LONGITUD']]
    stations['CODIGO_CORTO'] = stations['CODIGO_CORTO'].astype(int)
    # Cargar y filtrar datos NO2
    data = pd.read_csv(args.data_file, sep=';', encoding='latin1')
    data = data[data['MAGNITUD'] == 1]
    # Crear columna de fecha para filtrar
    data['date_str'] = (data['ANO'].astype(str) + '-' +
                        data['MES'].astype(str).str.zfill(2) + '-' +
                        data['DIA'].astype(str).str.zfill(2))
    df = data[data['date_str'] == args.date]
    # Extraer la hora especificada
    hh = str(args.hour + 1).zfill(2)
    val_col = f'H{hh}'
    v_col = f'V{hh}'
    df = df[df[v_col] == 'V']
    df = df[['ESTACION', val_col]].rename(columns={'ESTACION': 'station', val_col: 'no2'})
    df['no2'] = pd.to_numeric(df['no2'], errors='coerce')
    df['datetime'] = pd.to_datetime(args.date + ' ' + str(args.hour).zfill(2) + ':00:00')
    # Unir con coordenadas
    df = df.merge(stations, left_on='station', right_on='CODIGO_CORTO', how='left')
    # Asignar índice H3
    df['h3_index'] = df.apply(
        lambda row: h3.latlng_to_cell(row['LATITUD'], row['LONGITUD'], args.h3_res),
        axis=1
    )
    # Detectar solapamientos
    dup_mask = df.duplicated(subset=['h3_index', 'datetime'], keep=False)
    for _, row in df[dup_mask].iterrows():
        logging.warning(f"Solapamiento en celda H3 {row['h3_index']} para {row['datetime']}")
    # Mantener solo el último de cada celda/hora
    df = df.drop_duplicates(subset=['h3_index', 'datetime'], keep='last')
    # Generar CSV de salida
    df_out = df[['h3_index', 'datetime', 'no2']]
    df_out.to_csv(args.output_file, index=False)
    print(f"Salida guardada en {args.output_file}")

if __name__ == '__main__':
    main()


'''
python generate_points.py \
  --stations-file informacion_estaciones_red_calidad_aire.csv \
  --data-file ene_mo01.csv \
  --date 2001-01-05 \
  --hour 8 \
  --h3-res 7 \
  --output-file points.csv

python generate_points.py \
  --stations-file /Users/luisizquierdo/repos/upm/paper2025/informacion_estaciones_red_calidad_aire.csv \
  --data-file /Users/luisizquierdo/repos/upm/paper2025/201200-29-calidad-aire-horario/ene_mo01.csv\
  --date 2001-01-05 \
  --hour 8 \
  --h3-res 8 \
  --output-file points-2001-01-05_08_L08.csv  
  
'''
