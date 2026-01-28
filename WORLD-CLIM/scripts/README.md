# Scripts de procesamiento de datos climáticos CMIP6

Este directorio contiene scripts para descargar, verificar y procesar datos de proyecciones climáticas futuras de WorldClim (CMIP6).

## Requisitos

### Dependencias Python

```bash
cd WORLD-CLIM
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Tippecanoe (para generación de PMTiles)

Tippecanoe debe compilarse desde el código fuente:

```bash
git clone https://github.com/felt/tippecanoe.git
cd tippecanoe
make -j
sudo make install
```

---

## Scripts disponibles

### 1. `download_future_data.py`

Descarga proyecciones climáticas futuras de CMIP6 desde WorldClim.

**Fuente de datos:** https://geodata.ucdavis.edu/cmip6/30s

**Características:**
- Resolución: 30 segundos (~1 km²)
- 14 modelos GCM disponibles
- 4 escenarios SSP (ssp126, ssp245, ssp370, ssp585)
- 4 períodos temporales (2021-2040, 2041-2060, 2061-2080, 2081-2100)
- 4 variables climáticas (tmin, tmax, prec, bioc)

**Uso básico:**

```bash
# Descargar todos los datos (¡miles de archivos!)
python download_future_data.py --yes

# Descargar un modelo específico
python download_future_data.py --gcms ACCESS-CM2

# Descargar varios modelos y un escenario
python download_future_data.py --gcms ACCESS-CM2 GFDL-ESM4 --ssps ssp126

# Solo temperatura, escenarios extremos, primer período
python download_future_data.py --variables tmin tmax --ssps ssp126 ssp585 --periods 2021-2040

# Forzar re-descarga de archivos existentes
python download_future_data.py --force

# Especificar directorio de salida
python download_future_data.py --output-dir /ruta/personalizada
```

**Parámetros:**

| Parámetro | Descripción |
|-----------|-------------|
| `--gcms` | Modelos GCM a descargar (por defecto: todos) |
| `--ssps` | Escenarios SSP a descargar (por defecto: todos) |
| `--variables` | Variables climáticas a descargar (por defecto: todas) |
| `--periods` | Períodos temporales a descargar (por defecto: todos) |
| `--force` | Forzar re-descarga incluso si existen |
| `--output-dir` | Directorio de salida personalizado |
| `--yes` | Omitir confirmación (útil para nohup) |

**Modelos GCM disponibles:**
ACCESS-CM2, BCC-CSM2-MR, CMCC-ESM2, EC-Earth3-Veg, FIO-ESM-2-0, GFDL-ESM4, GISS-E2-1-G, HadGEM3-GC31-LL, INM-CM5-0, IPSL-CM6A-LR, MIROC6, MPI-ESM1-2-HR, MRI-ESM2-0, UKESM1-0-LL

**Escenarios SSP:**
- `ssp126` - SSP1-2.6 (bajo - optimista)
- `ssp245` - SSP2-4.5 (intermedio-bajo)
- `ssp370` - SSP3-7.0 (intermedio-alto)
- `ssp585` - SSP5-8.5 (alto - pesimista)

---

### 2. `check_downloads.py`

Verifica la integridad de las descargas comparando tamaños de archivos locales vs remotos.

**Características:**
- Compara tamaños de archivos locales con remotos
- Genera log detallado de discrepancias
- Opción para descargar automáticamente archivos faltantes o incompletos

**Uso básico:**

```bash
# Verificar todos los archivos
python check_downloads.py

# Verificar un directorio específico
python check_downloads.py --local-dir /ruta/a/descargas

# Verificar solo algunos modelos
python check_downloads.py --gcms GFDL-ESM4 MIROC6

# Verificar y descargar los que falten o estén incompletos
python check_downloads.py --overwrite

# Guardar log en archivo personalizado
python check_downloads.py --log-file mi_verificacion.log
```

**Parámetros:**

| Parámetro | Descripción |
|-----------|-------------|
| `--local-dir` | Directorio local con las descargas |
| `--gcms` | Modelos GCM a verificar |
| `--ssps` | Escenarios SSP a verificar |
| `--variables` | Variables a verificar |
| `--periods` | Períodos a verificar |
| `--log-file` | Archivo de log personalizado |
| `--overwrite` | Descargar archivos faltantes o incompletos |

**Tipos de problemas detectados:**
- `MISSING` - Archivo no existe localmente
- `SIZE_MISMATCH` - Tamaño local menor que remoto (descarga incompleta)
- `REMOTE_ERROR` - No se puede acceder al archivo remoto (puede que no exista en el servidor)

---

### 3. `tif_to_h3_pmtiles.py`

Convierte archivos TIF de raster a hexágonos H3 y genera archivos PMTiles para visualización web.

**Características:**
- Convierte datos raster a índice espacial hexagonal H3
- Genera PMTiles con múltiples niveles de zoom
- Opción para exportar también a Parquet (consultas con DuckDB)
- Configuración de resoluciones H3 por nivel de zoom

**Configuración de resoluciones H3:**

| Resolución H3 | Zoom min | Zoom max | Método | Uso |
|---------------|----------|----------|--------|-----|
| 1 | 0 | 3 | mean | Vista global |
| 3 | 4 | 6 | mean | Vista continental |
| 5 | 7 | 9 | mean | Vista regional |
| 7 | 10 | 11 | bilinear | Vista local |
| 8 | 12 | 14 | bilinear | Vista detallada |

**Uso básico:**

```bash
# Convertir un archivo TIF a PMTiles
python tif_to_h3_pmtiles.py input.tif output.pmtiles

# Convertir y generar también archivo Parquet
python tif_to_h3_pmtiles.py input.tif output.pmtiles --parquet

# Especificar banda del TIF (por defecto: 1)
python tif_to_h3_pmtiles.py input.tif output.pmtiles --band 2
```

**Parámetros:**

| Parámetro | Descripción |
|-----------|-------------|
| `input_tif` | Archivo TIF de entrada (posicional) |
| `output_pmtiles` | Archivo PMTiles de salida (posicional) |
| `--band` | Banda del TIF a procesar (por defecto: 1) |
| `--parquet` | Generar también archivo Parquet |

**Archivos generados:**
- `output.pmtiles` - Vector tiles para visualización web
- `output.parquet` - (opcional) Datos en formato Parquet para consultas SQL

**Métodos de agregación:**
- `mean` - Promedio de valores del raster dentro de cada hexágono (resoluciones bajas)
- `bilinear` - Interpolación bilineal del valor central del hexágono (resoluciones altas)

---

## Flujo de trabajo típico

```bash
# 1. Activar entorno virtual
source .venv/bin/activate

# 2. Descargar datos de un modelo específico
python scripts/download_future_data.py --gcms GFDL-ESM4 --ssps ssp245 --yes

# 3. Verificar integridad de las descargas
python scripts/check_downloads.py --gcms GFDL-ESM4 --ssps ssp245

# 4. Si hay archivos incompletos, re-descargar
python scripts/check_downloads.py --gcms GFDL-ESM4 --ssps ssp245 --overwrite

# 5. Convertir TIF a PMTiles para visualización
python scripts/tif_to_h3_pmtiles.py \
    /mnt/data/srv/carto_private/01_ORIGINAL/world/climate/future/GFDL-ESM4/ssp245/wc2.1_30s_tmin_GFDL-ESM4_ssp245_2041-2060.tif \
    output/tmin_GFDL-ESM4_ssp245_2041-2060.pmtiles \
    --parquet
```

## Estructura de archivos descargados

Los archivos TIF se descargan en:

```
/mnt/data/srv/carto_private/01_ORIGINAL/world/climate/future/
├── ACCESS-CM2/
│   ├── ssp126/
│   │   ├── wc2.1_30s_bioc_ACCESS-CM2_ssp126_2021-2040.tif
│   │   ├── wc2.1_30s_prec_ACCESS-CM2_ssp126_2021-2040.tif
│   │   ├── wc2.1_30s_tmax_ACCESS-CM2_ssp126_2021-2040.tif
│   │   ├── wc2.1_30s_tmin_ACCESS-CM2_ssp126_2021-2040.tif
│   │   └── ...
│   ├── ssp245/
│   ├── ssp370/
│   └── ssp585/
├── GFDL-ESM4/
│   └── ...
└── ...
```

**Nomenclatura de archivos:**
```
wc2.1_30s_{variable}_{GCM}_{SSP}_{periodo}.tif
```

- `wc2.1` - Versión de WorldClim
- `30s` - Resolución (30 arc-seconds ≈ 1 km²)
- `variable` - tmin, tmax, prec, bioc
- `GCM` - Modelo climático (ej: GFDL-ESM4)
- `SSP` - Escenario (ej: ssp245)
- `periodo` - Rango temporal (ej: 2041-2060)

---

## Notas importantes

1. **Espacio en disco:** Los datos completos de CMIP6 ocupan varios cientos de GB.

2. **Errores remotos:** No todas las combinaciones GCM/SSP existen en el servidor de WorldClim. Los "errores remotos" en el script de verificación suelen indicar archivos que no están disponibles.

3. **Tippecanoe:** Es necesario para generar PMTiles. Debe compilarse desde el código fuente ya que no está disponible en los repositorios de apt.

4. **PMTiles vs Parquet:**
   - PMTiles: Optimizado para visualización web con DeckGL/MapLibre
   - Parquet: Optimizado para consultas analíticas con DuckDB/Pandas
