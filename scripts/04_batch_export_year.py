"""
Batch export anual: recorre todas las horas de un año y llama al script 03_export_h3_points_convexhull.py
para generar CSV + GeoJSON por cada hora.

Uso:
    python scripts/04_batch_export_year.py \
        --year 2001,2002,2003,2004,2005 \
        --outdir /Volumes/MV/carto/madno \
        --h3-res 9 \
        --variable 8

    python scripts/04_batch_export_year.py \
        --year 2000,2001,2002,2003,2004,2005,2006,2007,2008,2009,2010,2011,2012,2013,2014,2015,2016,2017,2018,2019,2020,2021,2022,2023,2024 \
        --outdir /Volumes/MV/carto/madno2 \
        --h3-res 9 \
        --variable 8

Notas:
- No crea el directorio de salida: debe existir previamente.
- Nombres de salida: points_YYYYMMDD_HH_res{res}.csv y .geojson dentro de --outdir
- Progreso: usa tqdm si está instalado; si no, logs por hora.
"""

import argparse
import logging
import os
import subprocess
import sys
from datetime import date, timedelta


def iter_days(year: int):
    """Generador de días del año (incluye bisiesto)."""
    d = date(year, 1, 1)
    end = date(year + 1, 1, 1)
    while d < end:
        yield d
        d += timedelta(days=1)


def ensure_outdir_exists(path: str):
    if not os.path.isdir(path):
        raise FileNotFoundError(
            f"El directorio de salida no existe: {path}. Créalo antes de ejecutar el script.")


def run_export_03(py_exe: str, script_03: str, year: int, month: int, day: int, hour: int,
                  variable: int, h3_res: int, out_csv: str, out_geojson: str) -> subprocess.CompletedProcess:
    """Lanza el script 03_export_h3_points_convexhull.py con los parámetros adecuados."""
    cmd = [
        py_exe,
        script_03,
        "--year", str(year),
        "--month", str(month),
        "--day", str(day),
        "--hour", str(hour),
        "--variable", str(variable),
        "--h3-res", str(h3_res),
        "-o", out_csv,
        "--output-geojson", out_geojson,
    ]
    # stdout/stderr capturados para logging
    return subprocess.run(cmd, capture_output=True, text=True)


def main():
    parser = argparse.ArgumentParser(description="Batch export año completo -> llama al 03 por cada hora del año")
    parser.add_argument("--year", type=str, required=True, help="Año(s) a procesar separados por coma (e.g., 2024 o 2001,2002,2005)")
    parser.add_argument("--outdir", type=str, required=True, help="Directorio de salida (debe existir)")
    parser.add_argument("--h3-res", type=int, default=9, help="Resolución H3 (defecto=9)")
    parser.add_argument("--variable", type=int, default=12, help="Código de variable atmosférica (defecto=12)")
    parser.add_argument("--log", type=str, default="", help="Ruta del fichero log (por defecto: en outdir)")
    args = parser.parse_args()

    ensure_outdir_exists(args.outdir)

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout),
        ],
    )
    logging.info("Inicio de exportación anual")
    logging.info("Parámetros: year=%s, outdir=%s, h3_res=%s, variable=%s", args.year, args.outdir, args.h3_res, args.variable)

    # Resolver ruta al script 03 (en el mismo directorio que este 04)
    here = os.path.dirname(os.path.abspath(__file__))
    script_03 = os.path.join(here, "03_export_h3_points_convexhull_krigging.py")
    if not os.path.isfile(script_03):
        logging.error("No se encuentra el script 03 en %s", script_03)
        sys.exit(1)

    # Parsear lista de años (coma-separados)
    try:
        years = [int(y.strip()) for y in str(args.year).split(',') if y.strip()]
    except ValueError:
        logging.error("--year debe contener enteros separados por coma, p.ej.: 2024 o 2001,2002,2005")
        sys.exit(2)
    if not years:
        logging.error("No se proporcionó ningún año válido en --year")
        sys.exit(2)

    # Preparar barra de progreso (opcional)
    try:
        from tqdm import tqdm  # type: ignore
        have_tqdm = True
    except Exception:
        tqdm = None
        have_tqdm = False

    # Procesa cada año por separado, creando su subcarpeta y su log
    for year in years:
        # Crea subcarpeta por año
        year_dir = os.path.join(args.outdir, str(year))
        os.makedirs(year_dir, exist_ok=True)

        # Fichero de log por año (si no se pasó --log, se crea dentro del directorio del año)
        log_path = args.log or os.path.join(year_dir, f"export_{year}_res{args.h3_res}.log")
        file_handler = logging.FileHandler(log_path, encoding="utf-8")
        file_handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
        logging.getLogger().addHandler(file_handler)

        logging.info("Inicio de exportación anual")
        logging.info("Parámetros: year=%s, outdir=%s, h3_res=%s, variable=%s", year, year_dir, args.h3_res, args.variable)

        total_hours = sum(24 for _ in iter_days(year))
        pbar = tqdm(total=total_hours, desc=f"Export {year}") if have_tqdm else None

        ok_count = skip_count = fail_count = 0

        for d in iter_days(year):
            for h in range(1, 25):
                base = f"points_{d.strftime('%Y%m%d')}_{h:02d}_res{args.h3_res}"
                out_csv = os.path.join(year_dir, base + ".csv")
                out_geojson = os.path.join(year_dir, base + ".geojson")

                # Ejecutar 03
                res = run_export_03(sys.executable, script_03, d.year, d.month, d.day, h,
                                    args.variable, args.h3_res, out_csv, out_geojson)

                # Comprobación de resultado (y ficheros creados)
                csv_exists = os.path.isfile(out_csv)
                gj_exists = os.path.isfile(out_geojson)

                if res.returncode == 0 and csv_exists and gj_exists:
                    ok_count += 1
                    logging.info("OK %s %02d: %s", d.isoformat(), h, base)
                else:
                    # Si ya existían, marcamos skip
                    if csv_exists and gj_exists:
                        skip_count += 1
                        logging.warning("SKIP (ya existían) %s %02d: %s", d.isoformat(), h, base)
                    else:
                        fail_count += 1
                        logging.error(
                            "FAIL %s %02d: %s | return=%s | stdout=%s | stderr=%s",
                            d.isoformat(), h, base, res.returncode,
                            (res.stdout or "").strip(), (res.stderr or "").strip(),
                        )

                if pbar is not None:
                    pbar.update(1)

        if pbar is not None:
            pbar.close()

        logging.info("Fin de exportación %s: OK=%s, SKIP=%s, FAIL=%s, total_hours=%s",
                     year, ok_count, skip_count, fail_count, total_hours)

        # Quita el file handler de este año antes de pasar al siguiente
        logging.getLogger().removeHandler(file_handler)
        file_handler.close()


if __name__ == "__main__":
    main()
