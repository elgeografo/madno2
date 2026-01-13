# Fuentes de Datos Climáticos con Series Temporales

## Introducción

A diferencia de WorldClim, que proporciona **climatologías** (promedios de múltiples años), las fuentes listadas aquí ofrecen **series temporales** con datos año por año, mes por mes, o incluso día por día.

## 📊 Diferencia clave: Climatología vs Series Temporales

### WorldClim (Climatología)
- **Datos**: Promedio de 30 años (1970-2000)
- **Ejemplo**: Temperatura de enero = promedio de todos los eneros 1970-2000
- **Uso**: Clima base, condiciones "normales"
- **No permite**: Análisis de tendencias, variabilidad interanual

### Series Temporales (ERA5, CRU, etc.)
- **Datos**: Año por año, mes por mes
- **Ejemplo**: Temperatura de enero 1970, enero 1971, enero 1972...
- **Uso**: Tendencias climáticas, variabilidad, eventos extremos
- **Permite**: Análisis temporales, detección de cambios

---

## 1. ERA5 ⭐ MÁS RECOMENDADO

### Descripción
ERA5 es el quinto reanálisis atmosférico global del ECMWF (European Centre for Medium-Range Weather Forecasts). Combina observaciones con modelos numéricos para crear un conjunto de datos coherente y completo.

### Características

| Característica | Detalle |
|----------------|---------|
| **Resolución temporal** | Horaria, diaria, mensual |
| **Resolución espacial** | 0.25° × 0.25° (~31 km en el ecuador) |
| **Período disponible** | 1940-presente (actualizado continuamente) |
| **Cobertura** | Global |
| **Formato** | NetCDF, GRIB |
| **Actualización** | Mensual (con ~2 meses de retraso) |

### Variables disponibles

**Temperatura:**
- Temperatura a 2m (media, máxima, mínima)
- Temperatura del punto de rocío
- Temperatura superficial

**Precipitación:**
- Precipitación total
- Precipitación convectiva
- Precipitación de gran escala

**Viento:**
- Componentes U y V a 10m
- Velocidad y dirección del viento

**Presión:**
- Presión a nivel del mar
- Presión superficial

**Humedad:**
- Humedad relativa
- Humedad específica

**Radiación:**
- Radiación solar (onda corta)
- Radiación térmica (onda larga)
- Radiación neta

**Otras:**
- Evapotranspiración
- Nieve
- Cobertura nubosa
- Muchas más...

### Acceso

**Plataforma:** Copernicus Climate Data Store (CDS)
- **Web**: https://cds.climate.copernicus.eu/
- **Registro**: Gratuito, requiere cuenta
- **API**: Python (cdsapi), disponible

### Ventajas
✅ Alta calidad y consistencia temporal
✅ Múltiples variables atmosféricas
✅ Alta resolución temporal (hasta horaria)
✅ Cobertura global completa
✅ Bien documentado
✅ API programática disponible

### Desventajas
❌ Archivos muy grandes (especialmente datos horarios)
❌ Requiere registro en CDS
❌ Puede ser lento descargar grandes volúmenes
❌ Resolución espacial moderada (~31 km)

### Casos de uso ideales
- Análisis meteorológicos detallados
- Estudios de eventos extremos
- Forzamiento de modelos hidrológicos
- Análisis de tendencias climáticas
- Validación de modelos climáticos

---

## 2. CRU TS (Climate Research Unit Time Series)

### Descripción
Conjunto de datos de series temporales mensuales de variables climáticas terrestres, producido por la Universidad de East Anglia.

### Características

| Característica | Detalle |
|----------------|---------|
| **Resolución temporal** | Mensual |
| **Resolución espacial** | 0.5° × 0.5° (~55 km) |
| **Período disponible** | 1901-presente |
| **Cobertura** | Solo zonas terrestres |
| **Formato** | NetCDF |
| **Actualización** | Anual |

### Variables disponibles

- **tmp**: Temperatura media (°C)
- **tmn**: Temperatura mínima (°C)
- **tmx**: Temperatura máxima (°C)
- **pre**: Precipitación (mm)
- **vap**: Presión de vapor (hPa)
- **cld**: Cobertura nubosa (%)
- **dtr**: Rango de temperatura diurna (°C)
- **frs**: Días de helada (días)
- **pet**: Evapotranspiración potencial (mm)
- **wet**: Días húmedos (días)

### Acceso

**Fuente:** Centre for Environmental Data Analysis (CEDA)
- **Web**: https://crudata.uea.ac.uk/cru/data/hrg/
- **Descarga**: Directa (FTP/HTTP)
- **Registro**: No requerido para descarga básica

### Ventajas
✅ Serie temporal muy larga (desde 1901)
✅ Fácil descarga directa
✅ Formato NetCDF estándar
✅ Ampliamente usado en investigación
✅ Archivos relativamente pequeños

### Desventajas
❌ Solo datos mensuales (no diarios)
❌ Resolución espacial moderada
❌ Solo zonas terrestres
❌ Actualización anual (no en tiempo real)
❌ Interpolación en áreas con pocas estaciones

### Casos de uso ideales
- Análisis de tendencias de largo plazo
- Estudios climáticos históricos
- Contexto climático del siglo XX
- Climatología regional

---

## 3. CHIRPS (Climate Hazards Group InfraRed Precipitation with Station data)

### Descripción
Conjunto de datos de precipitación que incorpora imágenes satelitales y datos de estaciones terrestres.

### Características

| Característica | Detalle |
|----------------|---------|
| **Resolución temporal** | Diaria, pentadal (5 días), dekadal (10 días), mensual |
| **Resolución espacial** | 0.05° × 0.05° (~5.5 km) |
| **Período disponible** | 1981-presente |
| **Cobertura** | 50°N - 50°S (principalmente zonas tropicales) |
| **Formato** | GeoTiff, NetCDF, BIL |
| **Actualización** | Diaria (con ~3 semanas de retraso) |

### Variables disponibles

- **Precipitación** (mm/día o mm/período)

### Acceso

**Fuente:** Climate Hazards Center, UC Santa Barbara
- **Web**: https://www.chc.ucsb.edu/data/chirps
- **Descarga**: Directa (FTP/HTTP)
- **Formato**: GeoTiff, NetCDF

### Ventajas
✅ Alta resolución espacial (~5 km)
✅ Datos diarios disponibles
✅ Buena cobertura en regiones tropicales
✅ Combina satélite + estaciones
✅ Descarga directa y sencilla
✅ Varios formatos disponibles (GeoTiff muy útil)

### Desventajas
❌ Solo precipitación (no temperatura u otras variables)
❌ Cobertura limitada a 50°N - 50°S
❌ Menor precisión en zonas montañosas
❌ Serie temporal relativamente corta (desde 1981)

### Casos de uso ideales
- Monitoreo de sequías
- Análisis de precipitación en zonas tropicales
- Estudios agrícolas
- Modelado hidrológico

---

## 4. TerraClimate

### Descripción
Conjunto de datos climáticos mensuales de alta resolución para zonas terrestres.

### Características

| Característica | Detalle |
|----------------|---------|
| **Resolución temporal** | Mensual |
| **Resolución espacial** | 1/24° (~4 km) |
| **Período disponible** | 1958-presente |
| **Cobertura** | Global (solo zonas terrestres) |
| **Formato** | NetCDF |
| **Actualización** | Mensual |

### Variables disponibles

- Temperatura máxima (tmax)
- Temperatura mínima (tmin)
- Precipitación (ppt)
- Evapotranspiración real (aet)
- Deficit climático de agua (def)
- Presión de vapor (vap)
- Velocidad del viento (ws)
- Radiación solar descendente (srad)
- Escorrentía (ro)
- Contenido de agua en el suelo (soil)
- Índice de sequía de Palmer (PDSI)
- Índice de Severidad de Sequía de Palmer (PDSI)

### Acceso

**Fuente:** University of Idaho
- **Web**: https://www.climatologylab.org/terraclimate.html
- **Descarga**: HTTP directo, Google Earth Engine
- **Registro**: No requerido

### Ventajas
✅ Alta resolución espacial (~4 km)
✅ Múltiples variables climáticas
✅ Variables hidrológicas derivadas
✅ Disponible en Google Earth Engine
✅ Serie temporal moderadamente larga (desde 1958)

### Desventajas
❌ Solo datos mensuales
❌ Solo zonas terrestres
❌ Requiere conocimientos de NetCDF o GEE

### Casos de uso ideales
- Estudios ecoregionales
- Análisis de sequías
- Modelado de vegetación
- Hidrología de cuencas

---

## 5. GPCC (Global Precipitation Climatology Centre)

### Descripción
Datos de precipitación global basados en estaciones terrestres.

### Características

| Característica | Detalle |
|----------------|---------|
| **Resolución temporal** | Mensual |
| **Resolución espacial** | 0.25°, 0.5°, 1.0°, 2.5° |
| **Período disponible** | 1891-presente (según producto) |
| **Cobertura** | Global (solo precipitación terrestre) |
| **Formato** | NetCDF |

### Variables disponibles

- Precipitación mensual (mm)
- Número de estaciones utilizadas

### Acceso

**Fuente:** Deutscher Wetterdienst (DWD)
- **Web**: https://www.dwd.de/EN/ourservices/gpcc/gpcc.html
- **Descarga**: FTP directo

### Ventajas
✅ Serie muy larga (desde 1891 en algunos productos)
✅ Basado en estaciones (alta calidad)
✅ Varias resoluciones disponibles

### Desventajas
❌ Solo precipitación
❌ Cobertura variable según región y época
❌ Solo datos mensuales

---

## 6. MERRA-2 (Modern-Era Retrospective analysis for Research and Applications, Version 2)

### Descripción
Reanálisis atmosférico de la NASA que incluye interacciones con aerosoles.

### Características

| Característica | Detalle |
|----------------|---------|
| **Resolución temporal** | Horaria, diaria, mensual |
| **Resolución espacial** | 0.5° × 0.625° |
| **Período disponible** | 1980-presente |
| **Cobertura** | Global |
| **Formato** | NetCDF (HDF5) |

### Variables disponibles

Similar a ERA5, con énfasis en:
- Aerosoles
- Radiación
- Variables meteorológicas estándar

### Acceso

**Fuente:** NASA GES DISC
- **Web**: https://gmao.gsfc.nasa.gov/reanalysis/MERRA-2/
- **Registro**: Requiere cuenta Earthdata

### Ventajas
✅ Incluye datos de aerosoles
✅ Alta calidad para estudios de radiación
✅ Datos horarios disponibles

### Desventajas
❌ Serie temporal más corta que ERA5
❌ Interfaz de descarga compleja

---

## 📊 Comparación rápida

| Fuente | Temporal | Espacial | Período | Variables | Ideal para |
|--------|----------|----------|---------|-----------|------------|
| **ERA5** | Horaria | 31 km | 1940-hoy | Muchas | Análisis detallados, eventos extremos |
| **CRU TS** | Mensual | 55 km | 1901-hoy | 10 principales | Tendencias de largo plazo |
| **CHIRPS** | Diaria | 5.5 km | 1981-hoy | Solo precipitación | Monitoreo de lluvia tropical |
| **TerraClimate** | Mensual | 4 km | 1958-hoy | 14 variables | Estudios hidrológicos |
| **GPCC** | Mensual | 25-250 km | 1891-hoy | Solo precipitación | Series largas de lluvia |
| **MERRA-2** | Horaria | 50 km | 1980-hoy | Muchas + aerosoles | Estudios de radiación |

---

## 🎯 Recomendaciones por caso de uso

### Análisis de tendencias de temperatura (1900-presente)
→ **CRU TS** (más largo) o **ERA5** (más variables)

### Eventos de precipitación extrema (diarios)
→ **CHIRPS** (regiones tropicales) o **ERA5** (global)

### Modelado hidrológico con balance de agua
→ **TerraClimate** (incluye variables hidrológicas)

### Análisis meteorológico detallado
→ **ERA5** (datos horarios, muchas variables)

### Series muy largas (desde 1900)
→ **CRU TS** o **GPCC** (solo precipitación)

### Alta resolución espacial
→ **CHIRPS** (5 km, solo precipitación) o **TerraClimate** (4 km, múltiples variables)

---

## 💾 Consideraciones de almacenamiento

### Tamaños aproximados (datos mensuales, global, 1 año)

| Fuente | Variable | Tamaño/año |
|--------|----------|------------|
| ERA5 | Temperatura 2m | ~500 MB |
| CRU TS | Temperatura | ~100 MB |
| CHIRPS | Precipitación | ~200 MB |
| TerraClimate | Todas las variables | ~2 GB |

**Datos diarios ocupan ~30 veces más que datos mensuales**
**Datos horarios ocupan ~720 veces más que datos mensuales**

---

## 🔗 Enlaces útiles

### Tutoriales y guías
- **ERA5**: https://confluence.ecmwf.int/display/CKB/ERA5
- **CRU TS**: https://crudata.uea.ac.uk/cru/data/hrg/cru_ts_4.07/
- **CHIRPS**: https://www.chc.ucsb.edu/data/chirps
- **TerraClimate**: https://github.com/climatology-lab/terraclimate

### Herramientas de análisis
- **CDO (Climate Data Operators)**: https://code.mpimet.mpg.de/projects/cdo
- **NCO (NetCDF Operators)**: http://nco.sourceforge.net/
- **xarray (Python)**: https://xarray.dev/
- **raster (R)**: https://rspatial.org/

---

## 📝 Próximos pasos

Si necesitas descargar alguna de estas fuentes, se pueden crear scripts automáticos similares a los de WorldClim para:

1. **ERA5** - Descarga vía API de Copernicus CDS
2. **CRU TS** - Descarga directa HTTP/FTP
3. **CHIRPS** - Descarga directa de GeoTiff
4. **TerraClimate** - Descarga HTTP o Google Earth Engine

¿Cuál te interesa más para tu proyecto?
