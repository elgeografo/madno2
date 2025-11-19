#!/usr/bin/env python3
import os
import sys
import glob
import argparse
from contextlib import contextmanager

try:
    from tqdm import tqdm
except Exception:
    tqdm = lambda x, **k: x  # fallback si no está instalado

import psycopg2


DDL_SCHEMA_AND_TABLE = """
CREATE SCHEMA IF NOT EXISTS {schema};

CREATE TABLE IF NOT EXISTS {schema}.{table} (
  h3_index TEXT NOT NULL,
  dt       TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  value    DOUBLE PRECISION NOT NULL,
  PRIMARY KEY (h3_index, dt)
);

CREATE INDEX IF NOT EXISTS {table}_dt_idx ON {schema}.{table} (dt);
"""

# Nota: los CSV deben tener cabecera con columnas: h3_index, datetime, value
#       Si tus CSV usan otro nombre (p.ej. 'timestamp'), ajusta el COPY y el INSERT.


@contextmanager
def get_conn(host, dbname, user, password, port=None):
    # if port is None:
    #     conn = psycopg2.connect(host=host, dbname=dbname, user=user, password=password)
    # else:
    #     conn = psycopg2.connect(host=host, dbname=dbname, user=user, password=password, port=port)
    conn = psycopg2.connect(host=host, dbname=dbname, user=user, password=password, port=443)
    try:
        yield conn
    finally:
        conn.close()


def ensure_schema_and_table(cur, schema: str, table: str):
    cur.execute(DDL_SCHEMA_AND_TABLE.format(schema=schema, table=table))


def copy_into_temp(cur, csv_path: str):
    """
    Crea una tabla temporal 'tmp_h3_points' y hace COPY del CSV.
    Columnas esperadas en CSV: h3_index, datetime, value
    """
    cur.execute("""
        DROP TABLE IF EXISTS tmp_h3_points;
        CREATE TEMP TABLE tmp_h3_points(
          h3_index TEXT,
          datetime TIMESTAMP,
          value DOUBLE PRECISION
        ) ON COMMIT DROP;
    """)
    with open(csv_path, "r", encoding="utf-8") as f:
        cur.copy_expert(
            "COPY tmp_h3_points (h3_index, datetime, value) FROM STDIN CSV HEADER",
            f
        )


def upsert_from_temp(cur, schema: str, table: str):
    cur.execute(f"""
        INSERT INTO {schema}.{table} AS t (h3_index, dt, value)
        SELECT h3_index, datetime, value
        FROM tmp_h3_points
        ON CONFLICT (h3_index, dt) DO UPDATE
        SET value = EXCLUDED.value;
    """)


def iter_csv_paths(input_path: str, glob_pattern: str | None):
    if glob_pattern:
        for p in sorted(glob.glob(glob_pattern)):
            if os.path.isfile(p):
                yield p
        return
    if os.path.isdir(input_path):
        for p in sorted(glob.glob(os.path.join(input_path, "*.csv"))):
            if os.path.isfile(p):
                yield p
    elif os.path.isfile(input_path):
        yield input_path
    else:
        raise FileNotFoundError(f"No existe la ruta: {input_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Carga CSV (h3_index,datetime,value) a Postgres mediante COPY + UPSERT."
    )
    # Conexión
    parser.add_argument("--host", default="db.geoso2.es")
    parser.add_argument("--dbname", default="gis")
    parser.add_argument("--user", default="gis")
    parser.add_argument("--password", default="hjJ7_hj76HHjdftGg")

    # Destino
    parser.add_argument("--schema", default="madno")
    parser.add_argument("--table", default="h3_points")

    # Entrada
    parser.add_argument("--input",default="/Volumes/MV/carto/madno/2024",
                        help="Carpeta con CSV, un CSV concreto, o base path. Si usas --glob, este argumento puede ser la carpeta base.")
    parser.add_argument("--glob", dest="glob_pattern", default=None,
                        help="Patrón glob (ej: '/ruta/points_2024*.csv'). Si se usa, tiene prioridad.")

    args = parser.parse_args()

    with get_conn(args.host, args.dbname, args.user, args.password, getattr(args, "port", None)) as conn:
        conn.autocommit = False
        with conn.cursor() as cur:
            # Crear esquema/tabla si no existen
            ensure_schema_and_table(cur, args.schema, args.table)
            conn.commit()

        # Procesar ficheros
        files = list(iter_csv_paths(args.input, args.glob_pattern))
        if not files:
            print("No se encontraron CSV para cargar.", file=sys.stderr)
            sys.exit(1)

        print(f"Cargando {len(files)} ficheros en {args.schema}.{args.table} ...")
        ok, fail = 0, 0

        for csv_path in tqdm(files, desc="Importando"):
            try:
                with conn.cursor() as cur:
                    copy_into_temp(cur, csv_path)
                    upsert_from_temp(cur, args.schema, args.table)
                conn.commit()  # una transacción por fichero
                ok += 1
            except Exception as e:
                conn.rollback()
                fail += 1
                print(f"[FAIL] {csv_path}: {e}", file=sys.stderr)

        print(f"Terminado. OK={ok}, FAIL={fail}")


if __name__ == "__main__":
    main()


    '''
    python3 scripts/06_loadIntoDb.py --input /Volumes/MV/carto/madno/2024 --host db.geoso2.es
    '''