# Guía de Descarga de Datos Históricos WorldClim

## Descripción

Script de Python para descargar automáticamente todos los datos climáticos históricos de WorldClim v2.1 a máxima resolución.

## Datos que se descargan

- **Resolución**: 30 segundos (~1 km²)
- **Período**: 1970-2000
- **Formato**: Archivos ZIP con GeoTiff (.tif)

### Variables disponibles

| Código | Variable | Descripción | Archivos |
|--------|----------|-------------|----------|
| `tmin` | Temperatura mínima | °C | 12 (mensual) |
| `tmax` | Temperatura máxima | °C | 12 (mensual) |
| `tavg` | Temperatura media | °C | 12 (mensual) |
| `prec` | Precipitación | mm | 12 (mensual) |
| `srad` | Radiación solar | kJ m⁻² day⁻¹ | 12 (mensual) |
| `wind` | Velocidad del viento | m s⁻¹ | 12 (mensual) |
| `vapr` | Presión de vapor | kPa | 12 (mensual) |
| `bio` | Variables bioclimáticas | Varios | 19 (anuales) |
| `elev` | Elevación | metros | 1 |

## Instalación

### 1. Instalar dependencias

```bash
pip install -r requirements.txt
```

### 2. Verificar instalación

```bash
python scripts/download_historical_data.py --help
```

## Uso

### Descargar todas las variables

```bash
python scripts/download_historical_data.py
```

Esto descargará las 9 variables (tmin, tmax, tavg, prec, srad, wind, vapr, bio, elev) en la carpeta `data/historical/`.

### Descargar variables específicas

```bash
# Solo temperatura y precipitación
python scripts/download_historical_data.py --variables tmin tmax prec

# Solo variables bioclimáticas
python scripts/download_historical_data.py --variables bio
```

### Forzar re-descarga

Por defecto, el script omite archivos ya descargados. Para forzar la re-descarga:

```bash
python scripts/download_historical_data.py --force
```

### Directorio de salida personalizado

```bash
python scripts/download_historical_data.py --output-dir /ruta/personalizada
```

## Estructura de archivos descargados

```
data/
└── historical/
    ├── wc2.1_30s_tmin.zip    # ~150 MB
    ├── wc2.1_30s_tmax.zip    # ~150 MB
    ├── wc2.1_30s_tavg.zip    # ~150 MB
    ├── wc2.1_30s_prec.zip    # ~200 MB
    ├── wc2.1_30s_srad.zip    # ~180 MB
    ├── wc2.1_30s_wind.zip    # ~130 MB
    ├── wc2.1_30s_vapr.zip    # ~140 MB
    ├── wc2.1_30s_bio.zip     # ~250 MB
    └── wc2.1_30s_elev.zip    # ~80 MB
```

**Tamaño total aproximado**: ~1.4 GB

## Contenido de los archivos ZIP

Cada archivo ZIP contiene archivos GeoTiff:

### Variables mensuales (tmin, tmax, tavg, prec, srad, wind, vapr)
- 12 archivos .tif (uno por mes)
- Ejemplo: `wc2.1_30s_tmin_01.tif` a `wc2.1_30s_tmin_12.tif`

### Variables bioclimáticas (bio)
- 19 archivos .tif
- Ejemplo: `wc2.1_30s_bio_01.tif` a `wc2.1_30s_bio_19.tif`

### Elevación (elev)
- 1 archivo .tif: `wc2.1_30s_elev.tif`

## Variables Bioclimáticas

Las 19 variables bioclimáticas incluidas:

1. BIO1 = Temperatura media anual
2. BIO2 = Rango diurno medio
3. BIO3 = Isotermalidad (BIO2/BIO7) × 100
4. BIO4 = Estacionalidad de temperatura
5. BIO5 = Temperatura máxima del mes más cálido
6. BIO6 = Temperatura mínima del mes más frío
7. BIO7 = Rango de temperatura anual (BIO5-BIO6)
8. BIO8 = Temperatura media del trimestre más húmedo
9. BIO9 = Temperatura media del trimestre más seco
10. BIO10 = Temperatura media del trimestre más cálido
11. BIO11 = Temperatura media del trimestre más frío
12. BIO12 = Precipitación anual
13. BIO13 = Precipitación del mes más húmedo
14. BIO14 = Precipitación del mes más seco
15. BIO15 = Estacionalidad de precipitación
16. BIO16 = Precipitación del trimestre más húmedo
17. BIO17 = Precipitación del trimestre más seco
18. BIO18 = Precipitación del trimestre más cálido
19. BIO19 = Precipitación del trimestre más frío

## Características del script

- ✓ Barra de progreso para cada descarga
- ✓ Detección automática de archivos ya descargados
- ✓ Manejo de errores y reintentos
- ✓ Resumen al finalizar
- ✓ Pausa entre descargas para no saturar el servidor

## Solución de problemas

### Error de conexión

Si la descarga falla, el script mostrará un error. Puedes:
1. Verificar tu conexión a internet
2. Intentar de nuevo (el script omitirá archivos ya descargados)
3. Descargar solo las variables que faltaron

### Espacio en disco

Asegúrate de tener al menos 2 GB de espacio libre antes de descargar todas las variables.

### Archivos corruptos

Si sospechas que un archivo está corrupto, elimínalo y vuelve a ejecutar el script:

```bash
rm data/historical/wc2.1_30s_tmin.zip
python scripts/download_historical_data.py --variables tmin
```

## Siguiente paso: Extracción

Una vez descargados los archivos, necesitarás extraer los ZIP para acceder a los GeoTiff:

```bash
# Linux/Mac
cd data/historical
unzip "*.zip"

# Python
import zipfile
from pathlib import Path

for zip_file in Path('data/historical').glob('*.zip'):
    with zipfile.ZipFile(zip_file, 'r') as zip_ref:
        zip_ref.extractall('data/historical/extracted')
```

## Fuente de datos

**WorldClim v2.1**: https://www.worldclim.org/data/worldclim21.html

**Citación recomendada**:
> Fick, S.E. and R.J. Hijmans, 2017. WorldClim 2: new 1km spatial resolution climate surfaces for global land areas. International Journal of Climatology 37 (12): 4302-4315.
