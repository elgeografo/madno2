# WorldClim - Datos Climáticos CMIP6

## Resumen General

WorldClim es un recurso de datos climáticos globales que proporciona tanto datos históricos como proyecciones futuras de alta resolución espacial. Los datos son especialmente útiles para modelado climático, análisis de impacto ambiental, y estudios de biodiversidad.

---

## Datos Futuros (Proyecciones CMIP6)

### ¿Qué es CMIP6?

CMIP6 (Coupled Model Intercomparison Project Phase 6) es el Proyecto de Intercomparación de Modelos Climáticos Acoplados en su sexta fase. WorldClim proporciona proyecciones climáticas futuras que han sido:
- **Downscaled**: Escaladas a mayor resolución espacial
- **Corregidas**: Usando WorldClim v2.1 como línea base para corrección de sesgos

### Períodos Temporales Disponibles

Las proyecciones cubren aproximadamente los próximos 80 años en cuatro períodos de 20 años:

- **2021-2040**
- **2041-2060**
- **2061-2080**
- **2081-2100**

Cada período representa promedios climáticos de 20 años.

### Resoluciones Espaciales

Cuatro niveles de resolución disponibles:

| Resolución | Aproximación |
|------------|--------------|
| 30 segundos | ~1 km² |
| 2.5 minutos | ~21 km² |
| 5 minutos | ~86 km² |
| 10 minutos | ~340 km² |

### Modelos Climáticos y Escenarios

**Modelos disponibles:**
- 23 modelos climáticos globales (GCMs)

**Escenarios SSP (Shared Socio-economic Pathways):**
- **SSP126**: Escenario optimista (bajas emisiones)
- **SSP245**: Escenario intermedio-bajo
- **SSP370**: Escenario intermedio-alto
- **SSP585**: Escenario pesimista (altas emisiones)

> **Nota:** Números más bajos = menos emisiones/calentamiento; Números más altos = más emisiones/calentamiento

### Variables Climáticas (Datos Futuros)

- Temperatura mínima mensual (°C)
- Temperatura máxima mensual (°C)
- Precipitación mensual (mm)

---

## Datos Históricos (WorldClim v2.1)

### Período Cubierto

**1970-2000** (30 años de datos históricos)

Versión 2.1 lanzada en enero de 2020.

### Resoluciones Espaciales

Mismas cuatro resoluciones que los datos futuros (~1 km² hasta ~340 km²).

### Variables Climáticas (Datos Históricos)

**Variables mensuales:**
- Temperatura mínima (°C)
- Temperatura media (°C)
- Temperatura máxima (°C)
- Precipitación (mm)
- Radiación solar (kJ m⁻² day⁻¹)
- Velocidad del viento (m s⁻¹)
- Presión de vapor de agua (kPa)

**Datos adicionales:**
- 19 variables bioclimáticas derivadas
- Datos de elevación (derivados de SRTM)

### Formato de Datos

- **Formato:** Archivos GeoTiff
- **Organización:** 12 archivos mensuales por variable, o 19 archivos para variables bioclimáticas
- **Distribución:** Archivos comprimidos en formato ZIP

---

## Aplicaciones

Este recurso es ideal para:

- **Modelado de cambio climático**: Análisis de tendencias y proyecciones
- **Análisis de impacto ambiental**: Evaluación de efectos del clima en ecosistemas
- **Planificación agrícola**: Estrategias a largo plazo basadas en proyecciones climáticas
- **Estudios de biodiversidad**: Distribución de especies y modelos de nicho ecológico
- **Evaluación de riesgos climáticos**: Identificación de zonas vulnerables
- **Modelado hidrológico**: Estudios de precipitación y escorrentía
- **Análisis espacial**: Integración con GIS y otras herramientas geoespaciales

---

## Acceso a los Datos

### Enlaces Principales

- **Datos CMIP6 (Futuros)**: https://www.worldclim.org/data/cmip6/cmip6climate.html
- **Datos Históricos v2.1**: https://www.worldclim.org/data/worldclim21.html

### Notas Importantes

- Consultar los **términos de uso y citación oficial de CMIP6** para atribución adecuada
- Los datos CMIP5 (versión anterior) permanecen disponibles por separado
- Mapas de anomalías climáticas pueden visualizarse separadamente en el sitio

---

## Información Técnica

### Metodología

Los datos CMIP6 han sido procesados mediante:
1. Downscaling estadístico a alta resolución
2. Corrección de sesgos usando WorldClim v2.1 como referencia
3. Validación con datos observacionales

### Limitaciones

- Las proyecciones futuras contienen incertidumbre inherente a los modelos climáticos
- La resolución espacial, aunque alta, puede no capturar microclimas locales
- Los datos históricos cubren 1970-2000, no períodos más recientes

---

## Referencias

**Fuente principal:** WorldClim - Global Climate and Weather Data
**Versión:** WorldClim v2.1 (históricos) y CMIP6 downscaled (proyecciones)
**Proyecto:** CMIP6 (Coupled Model Intercomparison Project Phase 6)

Para citar estos datos, consultar las guías de citación específicas en el sitio web de WorldClim.
