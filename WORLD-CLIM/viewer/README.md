# WorldClim CMIP6 Viewer

Visor web para visualizar datos climáticos CMIP6 de WorldClim en formato H3 hexagonal usando MapLibre GL JS y PMTiles.

## Características

- Visualización de hexágonos H3 con datos climáticos
- Carga de PMTiles desde servidor remoto
- Selector de variable, modelo GCM, escenario SSP y periodo
- Escala de colores interpolada según variable
- Información al pasar el mouse (índice H3 y valor)
- Control de opacidad
- Mapa base OpenStreetMap

## Uso

Abrir `index.html` en un navegador web. El visor cargará automáticamente los datos según la configuración seleccionada.

### URL de datos

Los PMTiles se cargan desde:
```
https://webserver02.leftcape.com/02_SUBPROCESS/world/climate/test/hexagons/
```

### Nomenclatura de archivos

```
{variable}_{GCM}_{SSP}_{periodo}.pmtiles
```

Ejemplo:
```
tmin_GFDL-ESM4_ssp126_2021-2040.pmtiles
```

## Configuración disponible

### Variables
| Código | Descripción |
|--------|-------------|
| `tmin` | Temperatura mínima mensual (°C) |
| `tmax` | Temperatura máxima mensual (°C) |
| `prec` | Precipitación mensual (mm) |
| `bioc` | Variables bioclimáticas |

### Modelos GCM
- GFDL-ESM4
- MIROC6
- MPI-ESM1-2-HR
- ACCESS-CM2

### Escenarios SSP
| Código | Descripción |
|--------|-------------|
| `ssp126` | SSP1-2.6 - Escenario bajo (optimista) |
| `ssp245` | SSP2-4.5 - Escenario medio-bajo |
| `ssp370` | SSP3-7.0 - Escenario medio-alto |
| `ssp585` | SSP5-8.5 - Escenario alto (pesimista) |

### Periodos
- 2021-2040
- 2041-2060
- 2061-2080
- 2081-2100

## Ejemplo de prueba

El primer archivo generado para probar el visor es:

```
tmin_GFDL-ESM4_ssp126_2021-2040.pmtiles
```

Generado con:
```bash
cd /home/luis/repos/upm/madno2/WORLD-CLIM
source .venv/bin/activate

python scripts/tif_to_h3_pmtiles.py \
    /mnt/data/srv/carto_private/01_ORIGINAL/world/climate/future/GFDL-ESM4/ssp126/wc2.1_30s_tmin_GFDL-ESM4_ssp126_2021-2040.tif \
    /mnt/data/srv/carto_private/02_SUBPROCESS/world/climate/test/hexagons/tmin_GFDL-ESM4_ssp126_2021-2040.pmtiles \
    --parquet
```

## Escalas de colores

### Temperatura (tmin, tmax, bioc)
Escala divergente azul-rojo:
- Azul oscuro: -30°C
- Azul claro: -10°C
- Blanco/Amarillo: 10-15°C
- Naranja: 25°C
- Rojo oscuro: 40°C

### Precipitación (prec)
Escala secuencial amarillo-azul:
- Amarillo: 0 mm
- Verde: 100 mm
- Azul claro: 400 mm
- Azul oscuro: 1500+ mm

## Resoluciones H3

Los PMTiles contienen hexágonos H3 a diferentes resoluciones según el nivel de zoom:

| Zoom | H3 Res | Radio aprox | Celdas globales |
|------|--------|-------------|-----------------|
| 0-3  | 1      | 418 km      | 842             |
| 4-6  | 3      | 59 km       | 41,162          |
| 7-14 | 5      | 8 km        | 2,016,842       |

## Tecnologías

- [MapLibre GL JS](https://maplibre.org/) - Motor de mapas
- [PMTiles](https://protomaps.com/docs/pmtiles) - Formato de tiles vectoriales
- [H3](https://h3geo.org/) - Sistema de indexación hexagonal
- OpenStreetMap - Mapa base

## Requisitos

- Navegador web moderno con soporte ES6
- Conexión a internet para cargar dependencias y datos
