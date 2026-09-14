# MadNO2

[![Licencia: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

*Read this in [English](README.md).*

MadNO2 es una plataforma web serverless para explorar, analizar y visualizar la
contaminación por dióxido de nitrógeno (NO₂) en Madrid. Cubre 24 años de datos
horarios (2001–2024) sobre una malla hexagonal y funciona íntegramente en el
navegador: no hay backend, ni API, ni servidor de base de datos.

El visor consulta directamente ficheros Parquet particionados mediante
peticiones HTTP de rango usando DuckDB-WASM, y dibuja los resultados con
deck.gl y D3.

## Datos

Las observaciones primarias son las mediciones horarias de calidad del aire
publicadas por el Ayuntamiento de Madrid en su portal de datos abiertos
([datos.madrid.es](https://datos.madrid.es)), junto con el inventario de la red
municipal de vigilancia. Solo se utiliza el NO₂ (código de magnitud 8).

Esas mediciones puntuales se interpolan mediante kriging ordinario sobre celdas
H3 de resolución 9 (unos 400 m de diámetro), generando una superficie por hora:
en total unos 210.000 pasos temporales y 325 millones de registros.

El conjunto de datos derivado se publica aparte en Zenodo bajo CC BY 4.0. El
visor lo espera en `public/data/parquet`, particionado como
`year=YYYY/month=MM/data.parquet`.

## Características

- **Mapa 3D de hexágonos.** Celdas H3 dibujadas con deck.gl, con radio,
  elevación y opacidad ajustables.
- **Animación temporal.** Reproducción de secuencias por año, mes, día y hora.
- **Panel de análisis** con cinco familias de consultas sobre los Parquet:
  patrones temporales, hotspots y umbrales espaciales, eventos extremos,
  comparaciones entre años, y estadísticas descriptivas con comprobación del
  cumplimiento normativo de la UE.
- **Acceso SQL.** Cada análisis muestra la consulta DuckDB que lo genera, y
  puedes editarla, reejecutarla y exportar el resultado a CSV.
- **Interfaz bilingüe.** Inglés y español, seleccionados automáticamente según
  el idioma del navegador y conmutables desde el menú de banderas situado
  arriba a la derecha.

## Requisitos

- Node.js 18 o superior
- npm

## Puesta en marcha

```bash
git clone https://github.com/elgeografo/madno2.git
cd madno2/madno2-viewer
npm install
npm run dev
```

La aplicación queda disponible en `http://localhost:5173`.

## Compilación para producción

```bash
npm run build
```

El resultado en `dist/` es completamente estático. Sirve cualquier servidor
HTTP, con dos requisitos: debe admitir **peticiones HTTP de rango** (DuckDB-WASM
lee los Parquet por fragmentos) y conviene que sirva los datos desde el mismo
origen que la aplicación, o bien que envíe las cabeceras CORS adecuadas.

La ruta base se define en `vite.config.js`; cámbiala si despliegas bajo otro
subdirectorio.

## Estructura del repositorio

```
madno2/
├── madno2-viewer/          Aplicación web (React + Vite)
│   ├── src/components/     Componentes de interfaz, incl. panel de análisis
│   ├── src/i18n/           Catálogo de traducciones y contexto de idioma
│   ├── src/utils/          Capa de acceso a DuckDB y renderizadores D3
│   └── src/config/         Configuración de mapas, estilos y fuentes de datos
├── scripts/                Pipeline de datos (descarga, interpolación, export)
└── dockers/                Configuración opcional de PostGIS
```

El pipeline de procesado está en `scripts/`, numerado por orden de ejecución:
parsea los archivos anuales, interpola cada hora sobre la malla H3 y escribe el
conjunto Parquet particionado.

## Internacionalización

Todo el texto visible está en `src/i18n/translations.js`, y los textos de ayuda
más largos en `src/i18n/helpContent.js`. El inglés es el idioma por defecto y
el de respaldo para cualquier clave que falte. Para añadir un idioma, añade su
entrada en ambos ficheros e incluye su código en `SUPPORTED_LANGUAGES`.

## Cita

Si utilizas este software o el conjunto de datos, cita el registro de Zenodo y
reconoce al Ayuntamiento de Madrid como fuente de las mediciones originales.

## Licencia

Código fuente publicado bajo la [licencia MIT](LICENSE). El conjunto de datos
derivado se distribuye en Zenodo bajo CC BY 4.0. Las mediciones originales son
© Ayuntamiento de Madrid.
