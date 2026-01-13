# Guía de Descarga de Proyecciones Futuras CMIP6

## Descripción

Script de Python para descargar automáticamente proyecciones climáticas futuras de WorldClim CMIP6 a máxima resolución.

## Datos que se descargan

- **Resolución**: 30 segundos (~1 km²)
- **Períodos**: 2021-2040, 2041-2060, 2061-2080, 2081-2100
- **Formato**: Archivos GeoTiff (.tif)

### Modelos Climáticos Globales (GCMs) - 14 disponibles

1. ACCESS-CM2
2. BCC-CSM2-MR
3. CMCC-ESM2
4. EC-Earth3-Veg
5. FIO-ESM-2-0
6. GFDL-ESM4
7. GISS-E2-1-G
8. HadGEM3-GC31-LL
9. INM-CM5-0
10. IPSL-CM6A-LR
11. MIROC6
12. MPI-ESM1-2-HR
13. MRI-ESM2-0
14. UKESM1-0-LL

### Escenarios SSP (Shared Socio-economic Pathways)

| Código | Descripción | Nivel de emisiones |
|--------|-------------|-------------------|
| `ssp126` | SSP1-2.6 | Bajo (optimista) - Desarrollo sostenible |
| `ssp245` | SSP2-4.5 | Intermedio-bajo - Camino medio |
| `ssp370` | SSP3-7.0 | Intermedio-alto - Rivalidad regional |
| `ssp585` | SSP5-8.5 | Alto (pesimista) - Desarrollo intensivo en combustibles fósiles |

### Variables climáticas

| Código | Variable | Descripción | Unidad |
|--------|----------|-------------|--------|
| `tmin` | Temperatura mínima | Promedio mensual | °C |
| `tmax` | Temperatura máxima | Promedio mensual | °C |
| `prec` | Precipitación | Total mensual | mm |
| `bioc` | Variables bioclimáticas | 19 variables derivadas | Varios |

### Períodos temporales

- **2021-2040**: Futuro cercano
- **2041-2060**: Futuro medio
- **2061-2080**: Futuro lejano
- **2081-2100**: Futuro muy lejano

## Instalación

Las dependencias son las mismas que para los datos históricos:

```bash
# Activar entorno virtual
source venv/bin/activate

# Las dependencias ya están instaladas si seguiste la guía anterior
# Si no, ejecuta:
pip install -r requirements.txt
```

## Uso

### ⚠️ IMPORTANTE - Verificar tamaño antes de descargar

Antes de descargar, es **muy recomendable** verificar el tamaño total de los datos que vas a descargar.

#### Script de verificación de tamaño

Puedes usar el script `check_future_data_size.py` para consultar el tamaño de los archivos **sin descargarlos**:

```bash
# Verificar tamaño de TODO (896 archivos)
python scripts/check_future_data_size.py --quiet

# Verificar tamaño de un modelo específico
python scripts/check_future_data_size.py --gcms ACCESS-CM2 --quiet

# Verificar tamaño de escenarios extremos
python scripts/check_future_data_size.py --ssps ssp126 ssp585 --quiet

# Verificar tamaño de una combinación específica
python scripts/check_future_data_size.py \
  --gcms ACCESS-CM2 GFDL-ESM4 \
  --ssps ssp126 ssp585 \
  --variables tmin tmax \
  --periods 2021-2040 \
  --quiet
```

**El script mostrará:**
- 💾 Tamaño total en GB/TB
- 📊 Estadísticas por variable, modelo, escenario y período
- ⏱️ Estimación de tiempo según velocidad de conexión
- ✅ Archivos disponibles/no disponibles

**Nota:** El script tarda ~5-10 minutos en consultar todos los archivos (896 archivos).

### Consideraciones antes de descargar

**Descargar TODOS los datos significa:**
- 14 modelos × 4 escenarios × 4 variables × 4 períodos = **896 archivos**
- Tamaño real: **Consultar con el script de verificación primero**
- Tiempo estimado: **varias horas o días** (dependiendo de tu conexión)

**Recomendación**:
1. Ejecuta primero `check_future_data_size.py` para conocer el tamaño exacto
2. Empieza descargando un subconjunto específico

### Ejemplos de uso recomendados

#### 1. Descargar un modelo específico (recomendado para empezar)

```bash
# Un modelo, todos los escenarios, todas las variables y períodos
python scripts/download_future_data.py --gcms ACCESS-CM2
# Resultado: 4 escenarios × 4 variables × 4 períodos = 64 archivos
```

#### 2. Descargar escenarios extremos (optimista y pesimista)

```bash
# Todos los modelos, solo escenarios extremos
python scripts/download_future_data.py --ssps ssp126 ssp585
# Resultado: 14 modelos × 2 escenarios × 4 variables × 4 períodos = 448 archivos
```

#### 3. Solo temperatura y precipitación

```bash
# Todos los modelos y escenarios, solo temp y precipitación
python scripts/download_future_data.py --variables tmin tmax prec
# Resultado: 14 modelos × 4 escenarios × 3 variables × 4 períodos = 672 archivos
```

#### 4. Futuro cercano solamente (2021-2040)

```bash
# Solo el primer período
python scripts/download_future_data.py --periods 2021-2040
# Resultado: 14 modelos × 4 escenarios × 4 variables × 1 período = 224 archivos
```

#### 5. Combinación específica (MUY recomendado)

```bash
# Modelos específicos, escenarios extremos, solo temperatura, futuro cercano
python scripts/download_future_data.py \
  --gcms ACCESS-CM2 GFDL-ESM4 MPI-ESM1-2-HR \
  --ssps ssp126 ssp585 \
  --variables tmin tmax \
  --periods 2021-2040

# Resultado: 3 modelos × 2 escenarios × 2 variables × 1 período = 12 archivos
```

### Descargar TODO (¡USAR CON PRECAUCIÓN!)

```bash
# El script pedirá confirmación
python scripts/download_future_data.py
```

#### Descargas masivas con nohup (recomendado)

Si vas a descargar todos los datos o una gran cantidad, es **muy recomendable** usar `nohup` para que la descarga continúe aunque cierres la terminal o pierdas la conexión SSH.

**En Linux/Mac:**

```bash
# Ejecutar en segundo plano con nohup (con confirmación automática)
nohup python scripts/download_future_data.py --yes > descarga_futuros.log 2>&1 &

# Ver el ID del proceso
echo $!

# Monitorear el progreso en tiempo real
tail -f descarga_futuros.log

# Para salir del monitoreo (sin detener la descarga)
Ctrl + C
```

**IMPORTANTE**: El parámetro `--yes` es **necesario** cuando usas `nohup`, ya que omite la confirmación interactiva que no puede responderse en segundo plano.

**Explicación:**
- `--yes`: Omite la confirmación interactiva (necesario para nohup)
- `nohup`: El proceso continúa aunque cierres la terminal
- `> descarga_futuros.log`: Guarda toda la salida en un archivo de log
- `2>&1`: Redirige errores también al archivo de log
- `&`: Ejecuta en segundo plano
- `tail -f`: Muestra las últimas líneas del log en tiempo real

**Verificar si el proceso sigue corriendo:**

```bash
# Ver procesos de Python
ps aux | grep download_future_data.py

# O si guardaste el PID
ps -p <PID>
```

**Detener la descarga si es necesario:**

```bash
# Buscar el PID del proceso
ps aux | grep download_future_data.py

# Detener el proceso (usa el PID de la segunda columna)
kill <PID>
```

**Continuar una descarga interrumpida:**

Si la descarga se detiene por cualquier razón, simplemente vuelve a ejecutar el mismo comando. El script detectará automáticamente los archivos ya descargados y continuará desde donde se quedó:

```bash
# Ejecutar de nuevo (en segundo plano con nohup)
nohup python scripts/download_future_data.py --yes > descarga_futuros.log 2>&1 &
```

### Otras opciones

```bash
# Forzar re-descarga de archivos existentes
python scripts/download_future_data.py --gcms ACCESS-CM2 --force

# Directorio de salida personalizado
python scripts/download_future_data.py --output-dir /ruta/personalizada

# Ver todas las opciones
python scripts/download_future_data.py --help
```

## Estructura de archivos descargados

```
data/
└── future/
    ├── ACCESS-CM2/
    │   ├── ssp126/
    │   │   ├── wc2.1_30s_tmin_ACCESS-CM2_ssp126_2021-2040.tif
    │   │   ├── wc2.1_30s_tmax_ACCESS-CM2_ssp126_2021-2040.tif
    │   │   ├── wc2.1_30s_prec_ACCESS-CM2_ssp126_2021-2040.tif
    │   │   ├── wc2.1_30s_bioc_ACCESS-CM2_ssp126_2021-2040.tif
    │   │   └── ... (otros períodos)
    │   ├── ssp245/
    │   ├── ssp370/
    │   └── ssp585/
    ├── BCC-CSM2-MR/
    │   └── ...
    └── ... (otros modelos)
```

## Tamaños estimados

| Tipo de descarga | Archivos | Tamaño aprox. |
|------------------|----------|---------------|
| 1 modelo completo | 64 | ~2-3 GB |
| 1 escenario completo | 224 | ~7-10 GB |
| 1 variable completa | 224 | ~5-8 GB |
| 1 período completo | 224 | ~7-10 GB |
| TODO | 896 | ~30-50 GB |

## Características del script

- ✓ Descarga selectiva por modelo, escenario, variable y período
- ✓ Barra de progreso para cada descarga
- ✓ Detección automática de archivos ya descargados
- ✓ Organización automática en directorios por modelo y escenario
- ✓ Contador de progreso (archivo X de Y)
- ✓ Confirmación antes de descargas masivas
- ✓ Resumen detallado al finalizar
- ✓ Manejo de errores y reintentos

## Estrategias de descarga recomendadas

### Para análisis exploratorio
```bash
# Usa pocos modelos representativos
python scripts/download_future_data.py \
  --gcms ACCESS-CM2 GFDL-ESM4 \
  --periods 2021-2040
```

### Para análisis de incertidumbre
```bash
# Descarga varios modelos con escenarios extremos
python scripts/download_future_data.py \
  --ssps ssp126 ssp585 \
  --periods 2021-2040 2081-2100
```

### Para estudio de impacto climático
```bash
# Todos los escenarios, variables específicas
python scripts/download_future_data.py \
  --variables tmin tmax prec \
  --periods 2041-2060
```

### Descarga por fases
```bash
# Fase 1: Futuro cercano, todos los modelos
python scripts/download_future_data.py --periods 2021-2040

# Fase 2: Si necesitas más, añade el siguiente período
python scripts/download_future_data.py --periods 2041-2060

# Y así sucesivamente...
```

## Comparación con datos históricos

Para comparar proyecciones futuras con datos históricos:

1. Descarga datos históricos (1970-2000):
   ```bash
   python scripts/download_historical_data.py
   ```

2. Descarga proyecciones futuras específicas:
   ```bash
   python scripts/download_future_data.py \
     --gcms ACCESS-CM2 \
     --ssps ssp245 \
     --periods 2021-2040
   ```

3. Los datos históricos sirven como línea base para comparar los cambios proyectados.

## Solución de problemas

### Error 404 (archivo no encontrado)

Algunos modelos o combinaciones pueden no estar disponibles. El script continuará con los siguientes archivos.

### Descarga muy lenta

- Reduce el número de archivos a descargar
- Descarga por lotes (un modelo a la vez)
- Verifica tu conexión a internet

### Espacio en disco insuficiente

Usa las opciones de filtrado para descargar solo lo necesario:
```bash
python scripts/download_future_data.py \
  --gcms ACCESS-CM2 \
  --periods 2021-2040
```

### Interrupción de descarga

El script omite automáticamente archivos ya descargados. Simplemente vuelve a ejecutar el mismo comando.

### Verificar archivos descargados

```bash
# Contar archivos descargados
find data/future -name "*.tif" | wc -l

# Ver tamaño total
du -sh data/future

# Listar archivos de un modelo específico
ls -lh data/future/ACCESS-CM2/ssp126/
```

## Procesamiento posterior

Una vez descargados los archivos GeoTiff, puedes:

### Con Python (rasterio, geopandas)
```python
import rasterio

# Leer un archivo
with rasterio.open('data/future/ACCESS-CM2/ssp126/wc2.1_30s_tmin_ACCESS-CM2_ssp126_2021-2040.tif') as src:
    data = src.read(1)
    print(f"Shape: {data.shape}")
    print(f"Min: {data.min()}, Max: {data.max()}")
```

### Con QGIS
- Arrastra y suelta los archivos .tif en QGIS
- Compara diferentes modelos y escenarios visualmente

### Con R (terra, raster)
```r
library(terra)

# Leer archivo
r <- rast("data/future/ACCESS-CM2/ssp126/wc2.1_30s_tmin_ACCESS-CM2_ssp126_2021-2040.tif")
plot(r)
```

## Interpretación de escenarios SSP

### SSP1-2.6 (ssp126) - Sostenibilidad
- Camino hacia la sostenibilidad
- Emisiones muy bajas
- Calentamiento limitado a ~1.5-2°C
- Mejor caso realista

### SSP2-4.5 (ssp245) - Camino medio
- Tendencias sociales y económicas actuales continúan
- Emisiones moderadas
- Calentamiento ~2-3°C
- Escenario "business as usual moderado"

### SSP3-7.0 (ssp370) - Rivalidad regional
- Competencia entre regiones
- Emisiones altas
- Calentamiento ~3-4°C
- Fragmentación y conflictos

### SSP5-8.5 (ssp585) - Desarrollo intensivo
- Crecimiento económico basado en combustibles fósiles
- Emisiones muy altas
- Calentamiento >4°C
- Peor caso (menos probable)

## Herramientas adicionales

### Script de verificación de tamaño

El script `check_future_data_size.py` te permite conocer el tamaño exacto de los datos antes de descargarlos.

**Características:**
- Consulta solo los headers HTTP (no descarga datos)
- Muestra tamaño total y por categoría
- Estima tiempo de descarga
- Detecta archivos no disponibles
- Tarda ~5-10 minutos para consultar los 896 archivos

**Salida del script:**

```
📊 RESUMEN
   Archivos disponibles: 890/896
   Archivos no disponibles: 6

💾 TAMAÑO TOTAL
   [X] TB ([X] GB)

📈 ESTADÍSTICAS POR ARCHIVO
   Promedio: [X] GB
   Mínimo: [X] GB
   Máximo: [X] GB

📦 TAMAÑO POR VARIABLE
   tmin:    [X] GB (224 archivos)
   tmax:    [X] GB (224 archivos)
   prec:    [X] GB (224 archivos)
   bioc:    [X] GB (224 archivos)

🌍 TAMAÑO POR MODELO GCM (Top 5)
   [modelo]:  [X] GB (64 archivos)
   ...

🔮 TAMAÑO POR ESCENARIO SSP
   ssp126:  [X] GB (224 archivos)
   ssp245:  [X] GB (224 archivos)
   ssp370:  [X] GB (224 archivos)
   ssp585:  [X] GB (224 archivos)

📅 TAMAÑO POR PERÍODO
   2021-2040: [X] GB (224 archivos)
   2041-2060: [X] GB (224 archivos)
   2061-2080: [X] GB (224 archivos)
   2081-2100: [X] GB (224 archivos)

⏱️ ESTIMACIÓN DE TIEMPO DE DESCARGA
   10 Mbps:   [X] días
   100 Mbps:  [X] horas
   1 Gbps:    [X] horas
```

**Uso recomendado:**

Siempre ejecuta este script antes de iniciar una descarga masiva para:
1. Verificar espacio en disco disponible
2. Planificar el tiempo de descarga
3. Decidir si descargar todo o un subconjunto

## Referencias

**WorldClim CMIP6**: https://www.worldclim.org/data/cmip6/cmip6climate.html

**Documentación CMIP6**: https://www.worldclim.org/data/cmip6/cmip6_clim30s.html

**Citación recomendada para proyecciones CMIP6**:
> Fick, S.E. and R.J. Hijmans, 2017. WorldClim 2: new 1km spatial resolution climate surfaces for global land areas. International Journal of Climatology 37 (12): 4302-4315.

**Sobre SSPs**:
> O'Neill, B.C., et al., 2016. The Scenario Model Intercomparison Project (ScenarioMIP) for CMIP6. Geoscientific Model Development 9: 3461-3482.
