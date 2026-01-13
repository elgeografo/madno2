# Guía de Descarga de Series Temporales Mensuales (1950-2024)

## Descripción

Script de Python para descargar series temporales mensuales históricas de WorldClim con datos **año por año, mes por mes** desde 1950 hasta 2024.

## Datos que se descargan

- **Tipo**: Series temporales (no climatologías)
- **Resolución temporal**: Mensual (12 meses × 74 años = 888 meses)
- **Resolución espacial máxima**: 2.5 minutos (~21 km²)
- **Período**: 1950-2024
- **Fuente**: CRU TS 4.09 downscaled con WorldClim v2.1
- **Formato**: ZIP con GeoTiff (.tif)

### ⚠️ Diferencia importante

| WorldClim v2.1 (Climatología) | Monthly Timeseries (Este script) |
|-------------------------------|-----------------------------------|
| Promedio 1970-2000 | Datos mes por mes 1950-2024 |
| 12 archivos (1 por mes promedio) | 888 archivos (74 años × 12 meses) |
| Resolución: 30s (~1 km) | Resolución: 2.5m (~21 km) |
| No permite análisis temporal | ✅ Permite análisis temporal |

## Resoluciones espaciales disponibles

| Resolución | Aprox. km² | Aprox. km lineales | Uso recomendado |
|------------|------------|-------------------|------------------|
| **2.5m** (minutos) | ~21 km² | ~4.6 km | Análisis detallados (por defecto) |
| **5m** | ~85 km² | ~9.2 km | Balance espacio/detalle |
| **10m** | ~340 km² | ~18.5 km | Estudios continentales/globales |

## Variables disponibles

| Código | Variable | Unidad | Archivos por década |
|--------|----------|--------|---------------------|
| `tmin` | Temperatura mínima | °C | 120 GeoTiffs (10 años × 12 meses) |
| `tmax` | Temperatura máxima | °C | 120 GeoTiffs |
| `prec` | Precipitación | mm | 120 GeoTiffs |

## Décadas disponibles

- 1950-1959 (120 archivos)
- 1960-1969 (120 archivos)
- 1970-1979 (120 archivos)
- 1980-1989 (120 archivos)
- 1990-1999 (120 archivos)
- 2000-2009 (120 archivos)
- 2010-2019 (120 archivos)
- 2020-2024 (60 archivos - solo 5 años)

## Instalación

Las dependencias son las mismas que para los otros scripts:

```bash
# Activar entorno virtual
source venv/bin/activate

# Las dependencias ya están instaladas si seguiste la guía anterior
```

## Uso

### Descargar TODO a máxima resolución

```bash
# 3 variables × 8 décadas = 24 archivos ZIP (~10-15 GB)
python scripts/download_monthly_timeseries.py
```

### Descargar por variables

```bash
# Solo temperatura (2 variables × 8 décadas = 16 archivos, ~7-10 GB)
python scripts/download_monthly_timeseries.py --variables tmin tmax

# Solo precipitación (1 variable × 8 décadas = 8 archivos, ~4-6 GB)
python scripts/download_monthly_timeseries.py --variables prec
```

### Descargar por décadas

```bash
# Últimas 3 décadas (3 variables × 3 décadas = 9 archivos, ~4-5 GB)
python scripts/download_monthly_timeseries.py --decades 2000-2009 2010-2019 2020-2024

# Solo década de 2010 (3 variables × 1 década = 3 archivos, ~1.5 GB)
python scripts/download_monthly_timeseries.py --decades 2010-2019

# Décadas específicas
python scripts/download_monthly_timeseries.py --decades 1980-1989 1990-1999
```

### Combinaciones específicas

```bash
# Temperatura últimos 20 años (2 variables × 2 décadas = 4 archivos, ~2 GB)
python scripts/download_monthly_timeseries.py \
  --variables tmin tmax \
  --decades 2010-2019 2020-2024

# Precipitación desde 1990 (1 variable × 4 décadas = 4 archivos, ~2 GB)
python scripts/download_monthly_timeseries.py \
  --variables prec \
  --decades 1990-1999 2000-2009 2010-2019 2020-2024
```

### Cambiar resolución espacial

```bash
# Resolución 5 minutos (más rápido, archivos más pequeños)
python scripts/download_monthly_timeseries.py --resolution 5m

# Resolución 10 minutos (muy rápido, archivos pequeños)
python scripts/download_monthly_timeseries.py --resolution 10m
```

### Otras opciones

```bash
# Forzar re-descarga de archivos existentes
python scripts/download_monthly_timeseries.py --force

# Directorio de salida personalizado
python scripts/download_monthly_timeseries.py --output-dir /ruta/personalizada

# Ver ayuda completa
python scripts/download_monthly_timeseries.py --help
```

## Descargas masivas con nohup

Para descargas largas, usa `nohup` para que continúe aunque cierres la terminal:

```bash
# Ejecutar en segundo plano con confirmación automática
nohup python scripts/download_monthly_timeseries.py --yes > descarga_monthly.log 2>&1 &

# Ver el ID del proceso
echo $!

# Monitorear el progreso en tiempo real
tail -f descarga_monthly.log

# Para salir del monitoreo (sin detener la descarga)
Ctrl + C
```

**Verificar si sigue corriendo:**

```bash
ps aux | grep download_monthly_timeseries.py
```

**Detener si es necesario:**

```bash
kill <PID>
```

## Estructura de archivos descargados

```
monthly_timeseries/
└── 2.5m/                                    # Resolución
    ├── wc2.1_cruts4.09_2.5m_tmin_1950-1959.zip
    ├── wc2.1_cruts4.09_2.5m_tmin_1960-1969.zip
    ├── wc2.1_cruts4.09_2.5m_tmin_1970-1979.zip
    ├── ...
    ├── wc2.1_cruts4.09_2.5m_tmax_1950-1959.zip
    ├── ...
    └── wc2.1_cruts4.09_2.5m_prec_2020-2024.zip
```

## Contenido de los archivos ZIP

Cada archivo ZIP contiene GeoTiffs mensuales:

### Décadas completas (1950-1959, ..., 2010-2019)
- **120 archivos .tif** (10 años × 12 meses)
- Ejemplo: `wc2.1_2.5m_tmin_1950-01.tif` hasta `wc2.1_2.5m_tmin_1959-12.tif`

### Década parcial (2020-2024)
- **60 archivos .tif** (5 años × 12 meses)
- Ejemplo: `wc2.1_2.5m_tmin_2020-01.tif` hasta `wc2.1_2.5m_tmin_2024-12.tif`

## Tamaños estimados

### Por resolución (todo: 3 variables × 8 décadas)

| Resolución | Tamaño total | Tamaño por archivo ZIP |
|------------|--------------|------------------------|
| 2.5m | ~10-15 GB | ~400-600 MB |
| 5m | ~3-5 GB | ~120-200 MB |
| 10m | ~1-2 GB | ~40-80 MB |

### Por variable (todas las décadas)

| Variable | Archivos | Tamaño aprox. (2.5m) |
|----------|----------|----------------------|
| tmin | 8 ZIPs | ~3-5 GB |
| tmax | 8 ZIPs | ~3-5 GB |
| prec | 8 ZIPs | ~4-6 GB |

## Uso de los datos descargados

### Extraer archivos

```bash
# Extraer un ZIP específico
cd monthly_timeseries/2.5m
unzip wc2.1_cruts4.09_2.5m_tmin_2010-2019.zip

# Extraer todos los ZIPs de una variable
unzip "wc2.1_cruts4.09_2.5m_tmin_*.zip"
```

### Con Python (rasterio)

```python
import rasterio
import matplotlib.pyplot as plt

# Leer temperatura mínima de enero 2020
with rasterio.open('wc2.1_2.5m_tmin_2020-01.tif') as src:
    tmin_2020_01 = src.read(1)

    # Visualizar
    plt.imshow(tmin_2020_01, cmap='coolwarm')
    plt.colorbar(label='°C')
    plt.title('Temperatura Mínima - Enero 2020')
    plt.show()

# Comparar enero de diferentes años
import numpy as np

years = [1980, 1990, 2000, 2010, 2020]
tmin_enero = []

for year in years:
    with rasterio.open(f'wc2.1_2.5m_tmin_{year}-01.tif') as src:
        tmin_enero.append(src.read(1))

# Calcular tendencia
tmin_enero = np.array(tmin_enero)
tendencia = np.mean(tmin_enero, axis=(1,2))  # Promedio global por año
print(f"Tendencia temperatura mínima enero: {tendencia}")
```

### Con R (terra)

```r
library(terra)

# Leer un mes específico
tmin_2020_01 <- rast("wc2.1_2.5m_tmin_2020-01.tif")
plot(tmin_2020_01, main="Temperatura Mínima - Enero 2020")

# Leer todos los eneros de una década
archivos <- list.files(pattern="tmin_.*-01\\.tif")
eneros <- rast(archivos)

# Calcular promedio de todos los eneros
promedio_enero <- mean(eneros)
plot(promedio_enero, main="Promedio Temperatura Enero")
```

### Con QGIS

1. Extraer el ZIP deseado
2. Arrastrar los archivos .tif a QGIS
3. Crear animaciones temporales usando el panel "Temporal Controller"
4. Analizar tendencias con "Raster Calculator"

## Ejemplos de análisis

### Análisis de tendencias

```python
import rasterio
import numpy as np
from scipy import stats

# Cargar todos los eneros desde 1950
eneros = []
years = range(1950, 2025)

for year in years:
    try:
        with rasterio.open(f'wc2.1_2.5m_tmin_{year}-01.tif') as src:
            eneros.append(src.read(1))
    except FileNotFoundError:
        continue

# Convertir a array numpy
eneros = np.array(eneros)

# Calcular tendencia por píxel
def calc_trend(pixel_series):
    years_array = np.arange(len(pixel_series))
    slope, intercept, r_value, p_value, std_err = stats.linregress(years_array, pixel_series)
    return slope

# Aplicar a cada píxel
tendencia_espacial = np.apply_along_axis(calc_trend, 0, eneros)

# Guardar resultado
with rasterio.open('wc2.1_2.5m_tmin_2020-01.tif') as src:
    profile = src.profile

with rasterio.open('tendencia_tmin_enero_1950-2024.tif', 'w', **profile) as dst:
    dst.write(tendencia_espacial, 1)
```

### Detección de anomalías

```python
# Calcular climatología (promedio 1970-2000)
climatologia = []
for year in range(1970, 2001):
    with rasterio.open(f'wc2.1_2.5m_tmin_{year}-01.tif') as src:
        climatologia.append(src.read(1))

climatologia_media = np.mean(climatologia, axis=0)
climatologia_std = np.std(climatologia, axis=0)

# Calcular anomalía para enero 2024
with rasterio.open('wc2.1_2.5m_tmin_2024-01.tif') as src:
    tmin_2024 = src.read(1)

anomalia = (tmin_2024 - climatologia_media) / climatologia_std

# Visualizar anomalía
import matplotlib.pyplot as plt
plt.imshow(anomalia, cmap='RdBu_r', vmin=-3, vmax=3)
plt.colorbar(label='Desviaciones estándar')
plt.title('Anomalía Temperatura Enero 2024')
plt.show()
```

## Características del script

- ✓ Descarga selectiva por resolución, variable y década
- ✓ Barra de progreso para cada descarga
- ✓ Detección automática de archivos ya descargados
- ✓ Organización por resolución espacial
- ✓ Confirmación antes de descargas masivas
- ✓ Soporte para nohup (ejecución en segundo plano)
- ✓ Resumen detallado al finalizar

## Solución de problemas

### Error al descargar

Si alguna descarga falla, el script continúa con los siguientes archivos. Puedes volver a ejecutarlo y solo descargará los que faltaron.

### Archivos ZIP corruptos

Si sospechas que un archivo está corrupto:

```bash
# Verificar integridad del ZIP
unzip -t wc2.1_cruts4.09_2.5m_tmin_2010-2019.zip

# Si está corrupto, eliminar y re-descargar
rm wc2.1_cruts4.09_2.5m_tmin_2010-2019.zip
python scripts/download_monthly_timeseries.py --variables tmin --decades 2010-2019
```

### Espacio en disco

Antes de descargar todo, verifica el espacio disponible:

```bash
df -h /Volumes/Datos
```

## Comparación con otras fuentes

| Fuente | Resolución | Período | Temporal | Espacial |
|--------|------------|---------|----------|----------|
| **WorldClim Monthly** | 2.5 min | 1950-2024 | Mensual | ~21 km |
| CRU TS | 0.5° | 1901-hoy | Mensual | ~55 km |
| ERA5 | 0.25° | 1940-hoy | Horaria | ~31 km |
| TerraClimate | 4 km | 1958-hoy | Mensual | ~4 km |

WorldClim Monthly es ideal si necesitas:
- ✅ Balance entre resolución espacial y temporal
- ✅ Series largas desde 1950
- ✅ Datos corregidos con climatología de referencia
- ✅ Formato GeoTiff fácil de usar

## Fuente de datos

**WorldClim Historical Monthly Weather Data**
- Base: CRU TS 4.09 (Climate Research Unit Time Series)
- Método: Downscaling estadístico
- Corrección: WorldClim v2.1
- URL: https://www.worldclim.org/data/monthlywth.html

## Citación

Si utilizas estos datos en investigación, cita:

> Fick, S.E. and R.J. Hijmans, 2017. WorldClim 2: new 1km spatial resolution climate surfaces for global land areas. International Journal of Climatology 37 (12): 4302-4315.

Y también:

> Harris, I., Osborn, T.J., Jones, P. et al. Version 4 of the CRU TS monthly high-resolution gridded multivariate climate dataset. Sci Data 7, 109 (2020).

---

**Última actualización**: Enero 2026
