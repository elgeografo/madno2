# WORLD-CLIM

Proyecto para descargar y analizar datos climáticos históricos y proyecciones futuras de WorldClim.

## 📋 Tabla de Contenidos

- [Descripción](#descripción)
- [Instalación](#instalación)
- [Uso](#uso)
- [Datos Disponibles](#datos-disponibles)
- [Documentación](#documentación)
- [Estructura del Proyecto](#estructura-del-proyecto)

## 🌍 Descripción

Este proyecto proporciona herramientas para:
- Descargar datos climáticos históricos de WorldClim v2.1 (1970-2000)
- Descargar proyecciones climáticas futuras CMIP6 (2021-2100)
- Analizar datos climáticos a alta resolución espacial (~1 km²)

## 🚀 Instalación

### Requisitos Previos

- Python 3.8 o superior
- pip (gestor de paquetes de Python)
- ~2 GB de espacio libre en disco (para datos históricos)

### Paso 1: Clonar o descargar el repositorio

```bash
cd /ruta/donde/quieras/el/proyecto
# Si ya estás en el directorio del proyecto, omite este paso
```

### Paso 2: Crear entorno virtual

Es recomendable usar un entorno virtual para aislar las dependencias del proyecto.

#### En Linux/Mac:

```bash
# Crear entorno virtual
python3 -m venv venv

# Activar entorno virtual
source venv/bin/activate
```

#### En Windows:

```bash
# Crear entorno virtual
python -m venv venv

# Activar entorno virtual
venv\Scripts\activate
```

Una vez activado, verás `(venv)` al principio de tu línea de comandos:

```
(venv) user@computer:~/WORLD-CLIM$
```

### Paso 3: Instalar dependencias

Con el entorno virtual activado:

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Paso 4: Verificar instalación

```bash
python scripts/download_historical_data.py --help
```

Si ves el mensaje de ayuda del script, ¡la instalación fue exitosa! ✓

### Desactivar el entorno virtual

Cuando termines de trabajar:

```bash
deactivate
```

## 📥 Uso

**IMPORTANTE**: Asegúrate de tener el entorno virtual activado antes de ejecutar los scripts.

```bash
# Activar entorno virtual (si no está activado)
source venv/bin/activate  # Linux/Mac
# o
venv\Scripts\activate  # Windows
```

### Descargar Datos Históricos

#### Descargar todas las variables climáticas

```bash
# Descargar todos los datos históricos (1970-2000)
python scripts/download_historical_data.py
```

Esto descargará:
- Temperatura mínima, máxima y media
- Precipitación
- Radiación solar
- Velocidad del viento
- Presión de vapor de agua
- 19 variables bioclimáticas
- Elevación

**Tamaño total**: ~1.4 GB

Ver [Guía completa de descarga de datos históricos](docs/guia_descarga_historicos.md)

### Descargar Proyecciones Futuras (CMIP6)

⚠️ **CUIDADO**: Descargar todos los datos significa **896 archivos**.

#### Primero: Verificar el tamaño

Antes de descargar, verifica el tamaño real de los datos:

```bash
# Ver tamaño total de todos los datos
python scripts/check_future_data_size.py --quiet

# Ver tamaño de un modelo específico
python scripts/check_future_data_size.py --gcms ACCESS-CM2 --quiet
```

#### Recomendación: Empieza con un subconjunto

```bash
# Descargar un modelo específico (64 archivos, ~2-3 GB)
python scripts/download_future_data.py --gcms ACCESS-CM2

# Descargar escenarios extremos (448 archivos, ~15-20 GB)
python scripts/download_future_data.py --ssps ssp126 ssp585

# Descargar solo futuro cercano (224 archivos, ~7-10 GB)
python scripts/download_future_data.py --periods 2021-2040

# Combinación específica (12 archivos, ~500 MB)
python scripts/download_future_data.py \
  --gcms ACCESS-CM2 GFDL-ESM4 \
  --ssps ssp126 ssp585 \
  --variables tmin tmax \
  --periods 2021-2040
```

Ver [Guía completa de descarga de proyecciones futuras](docs/guia_descarga_futuros.md)


## 📊 Datos Disponibles

### Datos Históricos (WorldClim v2.1)

- **Período**: 1970-2000
- **Resolución**: 30 segundos (~1 km²)
- **Formato**: GeoTiff (.tif) en archivos ZIP

| Variable | Código | Unidad | Archivos |
|----------|--------|--------|----------|
| Temperatura mínima | `tmin` | °C | 12 mensuales |
| Temperatura máxima | `tmax` | °C | 12 mensuales |
| Temperatura media | `tavg` | °C | 12 mensuales |
| Precipitación | `prec` | mm | 12 mensuales |
| Radiación solar | `srad` | kJ m⁻² day⁻¹ | 12 mensuales |
| Velocidad del viento | `wind` | m s⁻¹ | 12 mensuales |
| Presión de vapor | `vapr` | kPa | 12 mensuales |
| Variables bioclimáticas | `bio` | Varios | 19 anuales |
| Elevación | `elev` | metros | 1 |

### Proyecciones Futuras (CMIP6)

- **Períodos**: 2021-2040, 2041-2060, 2061-2080, 2081-2100
- **Modelos**: 14 GCMs disponibles (ACCESS-CM2, GFDL-ESM4, etc.)
- **Escenarios**: SSP126 (bajo), SSP245, SSP370, SSP585 (alto)
- **Resolución**: 30 segundos (~1 km²)
- **Variables**: tmin, tmax, prec, bioc
- **Formato**: GeoTiff (.tif)

| Escenario | Descripción | Emisiones |
|-----------|-------------|-----------|
| SSP126 | Sostenibilidad | Bajas (optimista) |
| SSP245 | Camino medio | Intermedias |
| SSP370 | Rivalidad regional | Altas |
| SSP585 | Desarrollo intensivo | Muy altas (pesimista) |

## 📚 Documentación

- [Resumen completo de WorldClim](docs/worldclim_resumen.md) - Información detallada sobre datos disponibles
- [Guía de descarga de históricos](docs/guia_descarga_historicos.md) - Instrucciones detalladas del script de históricos
- [Guía de descarga de futuros](docs/guia_descarga_futuros.md) - Instrucciones detalladas del script de CMIP6

## 📁 Estructura del Proyecto

```
WORLD-CLIM/
├── README.md                          # Este archivo
├── requirements.txt                    # Dependencias de Python
├── venv/                              # Entorno virtual (creado por ti)
├── data/                              # Datos descargados
│   ├── historical/                    # Datos históricos WorldClim (ZIP)
│   │   ├── wc2.1_30s_tmin.zip
│   │   ├── wc2.1_30s_tmax.zip
│   │   └── ...
│   └── future/                        # Proyecciones futuras CMIP6 (GeoTiff)
│       ├── ACCESS-CM2/
│       │   ├── ssp126/
│       │   ├── ssp245/
│       │   └── ...
│       └── ...
├── scripts/                           # Scripts de descarga y análisis
│   ├── download_historical_data.py    # Descarga datos históricos
│   ├── download_future_data.py        # Descarga proyecciones futuras
│   ├── download_monthly_timeseries.py # Descarga series temporales mensuales
│   └── check_future_data_size.py      # Verifica tamaño de datos futuros
└── docs/                              # Documentación
    ├── worldclim_resumen.md           # Resumen completo de WorldClim
    ├── guia_descarga_historicos.md    # Guía descarga históricos
    ├── guia_descarga_futuros.md       # Guía descarga futuros
    └── links&docs.py                  # Enlaces útiles
```

## 🔧 Solución de Problemas

### El comando `python` no funciona

Intenta con `python3`:

```bash
python3 -m venv venv
python3 scripts/download_historical_data.py
```

### Error al crear el entorno virtual

Asegúrate de tener instalado el paquete `python3-venv`:

```bash
# Ubuntu/Debian
sudo apt-get install python3-venv

# macOS (con Homebrew)
brew install python3
```

### Error de permisos al instalar paquetes

Asegúrate de tener el entorno virtual activado. NUNCA uses `sudo pip install`.

### Descargas lentas o interrumpidas

El script automáticamente omite archivos ya descargados. Si una descarga se interrumpe, simplemente vuelve a ejecutar el script:

```bash
python scripts/download_historical_data.py
```

### Verificar que el entorno virtual está activado

Deberías ver `(venv)` al inicio de tu terminal:

```bash
(venv) user@computer:~/WORLD-CLIM$
```

Si no lo ves, actívalo de nuevo:

```bash
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
```

## 📖 Recursos Adicionales

- **WorldClim Official**: https://www.worldclim.org/
- **WorldClim v2.1**: https://www.worldclim.org/data/worldclim21.html
- **CMIP6 Data**: https://www.worldclim.org/data/cmip6/cmip6climate.html

## 📝 Citación

Si utilizas datos de WorldClim en tu investigación, por favor cita:

> Fick, S.E. and R.J. Hijmans, 2017. WorldClim 2: new 1km spatial resolution climate surfaces for global land areas. International Journal of Climatology 37 (12): 4302-4315.

## 📧 Contacto y Contribuciones

Para reportar problemas o sugerir mejoras, por favor abre un issue en el repositorio.

---

**Última actualización**: Enero 2026
