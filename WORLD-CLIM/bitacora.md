
# Gestión de históricos

## Descargar los datos históricos. 

Nos los hemos descargado todos los ficheros usando el script todos en el siguiente directorio.

```bash
/mnt/data/srv/carto_private/01_ORIGINAL/world/climate/historical

# en este directorial tenemoíamos una estructura como esta
luis@leftcape02:/mnt/data/srv/carto_private/01_ORIGINAL/world/climate/hitorical$ ls
wc2.1_30s_bio.zip   wc2.1_30s_prec.zip  wc2.1_30s_tavg.zip  wc2.1_30s_tmin.zip  wc2.1_30s_wind.zip
wc2.1_30s_elev.zip  wc2.1_30s_srad.zip  wc2.1_30s_tmax.zip   wc2.1_30s_vapr.zip

# para descomprimir todos los ficheros hemo aplicado el comando
unzip '*.zip'
# para liberar espacio borramos los zips originales
rm *zip
```
## Procesar los históricos para ponerls en formato COG (para previsualizarlos)

Nos vamos al repo hive-gis
dentro de geotile-manager hacemos las siguientes operaciones

```bash
cd geotile-manager
source venv/bin/activate
python scripts/warp_batch.py \
  --indir  /Volumes/Datos/srv/carto_private/01_ORIGINAL/world/climate/hitorical \
  --outdir /Volumes/Datos/srv/carto_private/02_SUBPROCESS/world/climate/test \
  --t_srs EPSG:4326 \
  --resampling bilinear \
  --pattern wc2.1_30s_tmin_03.tif \
  --mount "/Volumes:/Volumes"
```

## pruebas con hexagonos

En el  mismo repo de hive-gis hemos creado un script para convertir raster a parquet, henos creado dos juegos a nivel del zoom 6 y 3

```bash

python scripts/raster_to_h3.py \
  --input /Volumes/Datos/srv/carto_private/01_ORIGINAL/world/climate/hitorical/wc2.1_30s_tmin_03.tif \
  --output /Volumes/Datos/srv/carto_private/02_SUBPROCESS/world/climate/test/tmin_03_h3_03.parquet \
  --resolution 3 \
  --aggregation mean \
  --verbose



# gestion de futuros

## Descargamos los datos futuros para tres variables
 
```bash
cd WORLD-CLIM

nohup python scripts/download_future_data.py \
  --gcms GFDL-ESM4 MPI-ESM1-2-HR MIROC6 \
  --output-dir /mnt/data/srv/carto_private/01_ORIGINAL/world/climate/future \
  --yes > descarga_futuros.log 2>&1 &

```

Para monitorear el progreso en tiempo real

```bash
tail -f descarga_futuros.log # Para salir del monitoreo (sin detener la descarga)
Ctrl + C # Para salir del monitoreo (sin detener la descarga)
```

para comprobar lo descargado hemos ejecutado el siguiente comando
python scripts/check_downloads.py \
  --local-dir /mnt/data/srv/carto_private/01_ORIGINAL/world/climate/future \
  --gcms GFDL-ESM4 MPI-ESM1-2-HR MIROC6

despues de ejecutarlo obtengo el siguiente informe en el que hay 4 que no se han descargado y otros que no existen en el servidor.
======================================================================
  VERIFICACION DE DESCARGAS CMIP6 - WorldClim
======================================================================
  Directorio local: /mnt/data/srv/carto_private/01_ORIGINAL/world/climate/future
  Modelos GCM: 3
  Escenarios SSP: 4
  Variables: 4
  Periodos: 4
  Total archivos a verificar: 192
  Log de errores: check_downloads_20260122_172517.log
  Modo overwrite: SI
======================================================================

Lo cualevo a correr esta vez con el eoverwrite para que los que no se han terminado de descargar, los descargue

python scripts/check_downloads.py \
  --local-dir /mnt/data/srv/carto_private/01_ORIGINAL/world/climate/future \
  --gcms GFDL-ESM4 MPI-ESM1-2-HR MIROC6 \
  --overwrite


Ahora creamos los PMtiles. Ejemplo

cd /home/luis/repos/upm/madno2/WORLD-CLIM && \
source .venv/bin/activate && \
python scripts/tif_to_h3_pmtiles.py \
    /mnt/data/srv/carto_private/01_ORIGINAL/world/climate/future/GFDL-ESM4/ssp126/wc2.1_30s_tmin_GFDL-ESM4_ssp126_2021-2040.tif \
    /mnt/data/srv/carto_private/02_SUBPROCESS/world/climate/test/hexagons/tmin_GFDL-ESM4_ssp126_2021-2040.pmtiles \
    --parquet