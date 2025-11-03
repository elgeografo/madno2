# MADNO2 Viewer - Visualización de NO₂ en Madrid

Aplicación web para la visualización y análisis de datos de contaminación por NO₂ (dióxido de nitrógeno) en Madrid, utilizando datos desde 2001 hasta la actualidad en formato Parquet.

## Características

- **Visualización 3D**: Hexágonos H3 con datos de contaminación en deck.gl
- **Animación temporal**: Reproducción de secuencias por año, mes, día y hora
- **Panel de análisis avanzado**: 5 tipos de análisis sobre datos Parquet:
  1. Análisis Temporal (variación diaria, horaria, días de la semana, meses)
  2. Análisis Espacial (ranking de zonas, superar umbrales)
  3. Eventos Extremos (días pico, episodios consecutivos, percentiles, duración)
  4. Análisis Comparativos (comparación entre años)
  5. Estadísticas (resumen estadístico, cumplimiento normativo)
- **Consultas SQL**: DuckDB-WASM para consultas eficientes sobre archivos Parquet
- **Visualizaciones D3**: Gráficos de línea, barras y tablas estadísticas

## Tecnologías

- **Frontend**: React 18 + Vite
- **Mapas**: deck.gl + Mapbox GL
- **Datos**: Parquet + DuckDB-WASM
- **Gráficos**: D3.js
- **Geometría espacial**: H3 (Uber)

## Requisitos de desarrollo

- Node.js 18+
- npm o yarn

## Instalación y desarrollo

```bash
# Clonar el repositorio
git clone <repository-url>
cd madno2/madno2-viewer

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## Compilación para producción

```bash
# Generar build de producción
npm run build

# El resultado estará en el directorio dist/
```

## Despliegue

### Estructura del build

Después de ejecutar `npm run build`, el directorio `dist/` contendrá:

```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js    (JavaScript compilado y minificado)
│   ├── index-[hash].css   (CSS compilado y minificado)
│   └── ...
└── vite.svg              (favicon)
```

### Requisitos del servidor

**La aplicación es completamente estática** y solo requiere un servidor HTTP básico. **NO necesita Node.js, npm ni ningún backend en producción.**

### Opciones de despliegue

#### 1. Servidor web tradicional (Apache, Nginx, IIS)

Copiar el contenido de `dist/` al directorio raíz del servidor web:

```bash
# Ejemplo con Apache
cp -r dist/* /var/www/html/madno2/

# Ejemplo con Nginx
cp -r dist/* /usr/share/nginx/html/madno2/
```

#### 2. Servicios de hosting estático (recomendado)

**GitHub Pages:**
```bash
npm run build
# Subir contenido de dist/ a rama gh-pages
```

**Netlify:**
```bash
# Netlify CLI
netlify deploy --dir=dist --prod

# O arrastrar carpeta dist/ en la interfaz web
```

**Vercel:**
```bash
# Vercel CLI
vercel --prod

# O conectar repositorio Git desde la interfaz web
```

**Cloudflare Pages:**
- Build command: `npm run build`
- Build output directory: `dist`

#### 3. Servidor simple para pruebas locales

```bash
# Python
cd dist
python -m http.server 8000

# Node.js (npx)
npx serve dist

# PHP
cd dist
php -S localhost:8000
```

### Configuración de rutas (SPA)

Si despliegas en un subdirectorio (ej: `https://ejemplo.com/madno2/`), actualiza `vite.config.js`:

```javascript
export default defineConfig({
  plugins: [react()],
  base: '/madno2/', // Ruta base
  publicDir: 'public-prod',
})
```

Para servidores que requieren configuración de SPA:

**Nginx:**
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

**Apache (.htaccess):**
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

### Dependencias externas en runtime

La aplicación necesita acceso a internet para:

1. **Datos Parquet de Madrid NO₂**:
   - URL: `https://datos1.geoso2.es/spain/madno/parquet`
   - Estructura: `year=YYYY/month=MM/data.parquet`
   - Periodo: 2001-2025

2. **Datos GeoJSON y CSV de Alcarria** (opcional, solo para mapa de Alcarria):
   - GeoJSON: `https://datos1.geoso2.es/spain/alcarria/poblacion/alcarria_municpios.geojson`
   - CSV: `https://datos1.geoso2.es/spain/alcarria/poblacion/ALCARRIA%20Pob.csv`

3. **Bibliotecas CDN**:
   - Mapbox GL (estilos de mapa)
   - DuckDB-WASM (motor de consultas)

**Nota:** Los datos Parquet NO están incluidos en el bundle. La aplicación los descarga dinámicamente según las consultas del usuario.

### Tamaño del bundle

- **Build completo**: ~2-5 MB (JavaScript + CSS compilados)
- **Assets estáticos**: ~1 KB (solo favicon)
- **Total en servidor**: ~2-5 MB

El directorio `public/data/` (con archivos CSV legacy) está **excluido del build de producción** mediante la configuración `publicDir: 'public-prod'` en `vite.config.js`.

### Variables de entorno

La aplicación **NO requiere variables de entorno** en producción. Todas las configuraciones están en:
- `src/config/mapsConfig.js` - Configuración de mapas y fuentes de datos
- `src/config/constants.js` - Constantes globales

Para cambiar la URL de los datos Parquet, edita `mapsConfig.js` antes de compilar:

```javascript
dataSource: {
  type: 'parquet',
  parquetBase: 'https://tu-servidor.com/ruta/parquet',
}
```

### Verificación del despliegue

1. Abre la URL en el navegador
2. Verifica que el mapa se carga correctamente
3. Abre el Panel de Análisis (botón izquierdo)
4. Ejecuta una consulta de análisis temporal
5. Verifica que se generan gráficos correctamente

Si hay errores:
- Abre la consola del navegador (F12)
- Verifica la conectividad a las URLs de datos Parquet
- Comprueba que las rutas de la SPA están configuradas correctamente

## Estructura del proyecto

```
madno2-viewer/
├── public-prod/          # Archivos públicos para producción
│   └── vite.svg         # Favicon
├── public/              # Archivos solo para desarrollo (excluidos del build)
│   └── data/           # Datos CSV legacy
├── src/
│   ├── components/     # Componentes React
│   ├── config/         # Configuración de mapas y constantes
│   ├── hooks/          # React hooks personalizados
│   ├── layers/         # Capas de deck.gl
│   ├── pages/          # Páginas principales
│   └── utils/          # Utilidades (ParquetDataManager, etc.)
├── index.html
├── vite.config.js      # Configuración de Vite
└── package.json
```

## Licencia

[Especificar licencia]

## Autores

[Especificar autores]

## Contacto

[Información de contacto]
