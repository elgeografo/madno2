#!/usr/bin/env python3
import os
import sys
import glob
import argparse
from contextlib import contextmanager

import subprocess
import socket
import shutil
import time

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
    if port is None:
        conn = psycopg2.connect(host=host, dbname=dbname, user=user, password=password)
    else:
        conn = psycopg2.connect(host=host, dbname=dbname, user=user, password=password, port=port)
    try:
        yield conn
    finally:
        conn.close()

@contextmanager
def open_system_ssh_tunnel(ssh_host: str, ssh_port: int, ssh_user: str,
                            ssh_password: str | None,
                            remote_pg_host: str, remote_pg_port: int):
    """
    Abre un túnel SSH usando el binario del sistema `ssh`. Si `sshpass` está disponible y
    se proporciona `ssh_password`, se usará para evitar prompts interactivos.
    Devuelve (local_host, local_port).
    """
    if not shutil.which("ssh"):
        raise RuntimeError("No se encontró el binario 'ssh' en PATH.")

    # Reserva un puerto local libre
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        _, local_port = s.getsockname()
    local_host = "127.0.0.1"

    base_ssh = [
        "ssh",
        "-N",
        "-L", f"{local_host}:{local_port}:{remote_pg_host}:{remote_pg_port}",
        "-p", str(ssh_port),
        "-o", "ExitOnForwardFailure=yes",
        "-o", "ServerAliveInterval=30",
        "-o", "StrictHostKeyChecking=no",
        f"{ssh_user}@{ssh_host}",
    ]

    # Si hay password y sshpass disponible, úsalo
    if ssh_password and shutil.which("sshpass"):
        cmd = ["sshpass", "-p", ssh_password] + base_ssh
    else:
        cmd = base_ssh

    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    try:
        # Espera hasta que el puerto esté levantado o se agote el tiempo
        deadline = time.time() + 15
        last_err = None
        while time.time() < deadline:
            try:
                with socket.create_connection((local_host, local_port), timeout=0.3):
                    break
            except Exception as e:
                last_err = e
                time.sleep(0.2)
        else:
            stderr = b""
            try:
                stderr = proc.stderr.read(4000) or b""
            except Exception:
                pass
            raise RuntimeError(f"No se pudo establecer el túnel SSH en {local_host}:{local_port}. Detalle: {last_err}\n{stderr.decode(errors='ignore')}")

        yield (local_host, local_port)
    finally:
        if proc and proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()


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

    # Túnel SSH (opcional y simple)
    parser.add_argument("--use-ssh-tunnel", action="store_true", help="Habilita el túnel SSH")
    parser.add_argument("--ssh-host", default="92.168.1.200")
    parser.add_argument("--ssh-port", type=int, default=443)
    parser.add_argument("--ssh-user", default="upm")
    parser.add_argument("--ssh-password", default=None)
    parser.add_argument("--remote-pg-host", default="127.0.0.1")
    parser.add_argument("--remote-pg-port", type=int, default=5432)

    # Puerto directo de Postgres (si no se usa túnel)
    parser.add_argument("--port", type=int, default=5432)

    args = parser.parse_args()

    if args.use_ssh_tunnel:
        print(f"Estableciendo túnel SSH a {args.ssh_user}@{args.ssh_host}:{args.ssh_port} -> {args.remote_pg_host}:{args.remote_pg_port} ...")
        with open_system_ssh_tunnel(args.ssh_host, args.ssh_port, args.ssh_user,
                                    args.ssh_password, args.remote_pg_host, args.remote_pg_port) as (lh, lp):
            with get_conn(lh, args.dbname, args.user, args.password, port=lp) as conn:
                conn.autocommit = False
                with conn.cursor() as cur:
                    ensure_schema_and_table(cur, args.schema, args.table)
                    conn.commit()
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
                        conn.commit()
                        ok += 1
                    except Exception as e:
                        conn.rollback()
                        fail += 1
                        print(f"[FAIL] {csv_path}: {e}", file=sys.stderr)
                print(f"Terminado. OK={ok}, FAIL={fail}")
        return
    else:
        with get_conn(args.host, args.dbname, args.user, args.password, port=args.port) as conn:
            conn.autocommit = False
            with conn.cursor() as cur:
                ensure_schema_and_table(cur, args.schema, args.table)
                conn.commit()
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
                    conn.commit()
                    ok += 1
                except Exception as e:
                    conn.rollback()
                    fail += 1
                    print(f"[FAIL] {csv_path}: {e}", file=sys.stderr)
            print(f"Terminado. OK={ok}, FAIL={fail}")


if __name__ == "__main__":
    main()


    '''
    python3 scripts/06_loadIntoDb.py --input /Volumes/MV/carto/madno/2024 --host db.geoso2.es 138.100.127.190

     python3 scripts/06_loadIntoDb_tunnel.py \
  --use-ssh-tunnel \
  --ssh-host 138.100.127.190 --ssh-port 22 \
  --ssh-user upm --ssh-password 'madrid' \
  --remote-pg-host 127.0.0.1 --remote-pg-port 5432 \
  --dbname gis --user gis --password 'hjJ7_hj76HHjdftGg' \
  --input /Volumes/MV/carto/madno/2024

    '''