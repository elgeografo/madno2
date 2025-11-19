# Análisis Temporal de Estaciones de Calidad del Aire - Madrid NO₂

## Resumen Ejecutivo

- **Total de estaciones**: 24
- **Periodo de datos**: 2001 - 2024 (24 años)
- **Total de datasets en HDF5**: 288 (12 meses × 24 años)
- **Promedio de años por estación**: 20.0 años
- **Estaciones con serie completa (24 años)**: 11 estaciones

## Tabla Detallada de Estaciones

| Código Estación | Año Inicio | Año Fin | Años Activos | Total Registros | Primer Dato | Último Dato | Observaciones |
|-----------------|------------|---------|--------------|-----------------|-------------|-------------|---------------|
| 4               | 2001       | 2024    | 24           | 42,242          | 2001-01-01  | 2024-12-31  | Serie completa ✓ |
| 8               | 2001       | 2024    | 24           | 104,847         | 2001-01-01  | 2024-12-31  | Serie completa ✓ (más datos) |
| 11              | 2001       | 2024    | 24           | 42,417          | 2001-01-01  | 2024-12-31  | Serie completa ✓ |
| 16              | 2001       | 2024    | 24           | 41,943          | 2001-01-01  | 2024-12-31  | Serie completa ✓ |
| 17              | 2001       | 2024    | 21           | 34,588          | 2001-01-01  | 2024-12-31  | 3 años faltantes |
| 18              | 2001       | 2024    | 24           | 74,351          | 2001-01-01  | 2024-12-31  | Serie completa ✓ |
| 24              | 2001       | 2024    | 24           | 111,774         | 2001-01-01  | 2024-12-31  | Serie completa ✓ (más datos) |
| 27              | 2002       | 2024    | 23           | 41,861          | 2002-12-31  | 2024-12-31  | Inicio tardío (2002) |
| 35              | 2001       | 2024    | 24           | 51,954          | 2001-01-01  | 2024-12-31  | Serie completa ✓ |
| 36              | 2001       | 2024    | 24           | 50,879          | 2001-01-01  | 2024-12-31  | Serie completa ✓ |
| 38              | 2001       | 2024    | 24           | 65,911          | 2001-01-01  | 2024-12-31  | Serie completa ✓ |
| 39              | 2001       | 2024    | 24           | 41,716          | 2001-01-01  | 2024-12-31  | Serie completa ✓ |
| 40              | 2001       | 2024    | 24           | 42,295          | 2001-01-01  | 2024-12-31  | Serie completa ✓ |
| 47              | 2009       | 2024    | 16           | 27,379          | 2009-12-21  | 2024-12-31  | Estación nueva (2009) |
| 48              | 2010       | 2024    | 15           | 26,507          | 2010-05-31  | 2024-12-31  | Estación nueva (2010) |
| 49              | 2009       | 2024    | 16           | 21,924          | 2009-12-29  | 2024-12-31  | Estación nueva (2009) |
| 50              | 2010       | 2024    | 15           | 26,945          | 2010-02-04  | 2024-12-31  | Estación nueva (2010) |
| 54              | 2009       | 2024    | 16           | 21,999          | 2009-12-11  | 2024-12-31  | Estación nueva (2009) |
| 55              | 2010       | 2024    | 15           | 49,630          | 2010-01-20  | 2024-12-31  | Estación nueva (2010) |
| 56              | 2010       | 2024    | 15           | 29,853          | 2010-01-18  | 2024-12-31  | Estación nueva (2010) |
| 57              | 2009       | 2024    | 16           | 31,624          | 2009-11-23  | 2024-12-31  | Estación nueva (2009) |
| 58              | 2009       | 2024    | 16           | 22,036          | 2009-11-30  | 2024-12-31  | Estación nueva (2009) |
| 59              | 2009       | 2024    | 16           | 21,900          | 2009-12-14  | 2024-12-31  | Estación nueva (2009) |
| 60              | 2010       | 2024    | 15           | 27,177          | 2010-01-05  | 2024-12-31  | Estación nueva (2010) |

## Clasificación de Estaciones

### Generación 1: Estaciones Históricas (2001-2024)
**11 estaciones con serie temporal completa de 24 años**
- Códigos: 4, 8, 11, 16, 18, 24, 35, 36, 38, 39, 40
- Cobertura: 100% del periodo
- Total de registros: 670,298
- Promedio de registros por estación: 60,936

**Observaciones**:
- Estación 8: 104,847 registros (máximo)
- Estación 24: 111,774 registros (máximo absoluto)
- Estas estaciones son fundamentales para análisis de tendencias a largo plazo

### Generación 1b: Estaciones Históricas con Gaps
- **Estación 17**: 2001-2024 (21 años activos, 3 años con datos faltantes)
- **Estación 27**: 2002-2024 (23 años, inicio tardío en diciembre 2002)

### Generación 2: Expansión de la Red (2009-2010)
**12 estaciones nuevas instaladas entre 2009-2010**
- **Cohorte 2009** (6 estaciones): 47, 49, 54, 57, 58, 59
  - Periodo: 2009-2024 (16 años)
  - Promedio de registros: 24,543

- **Cohorte 2010** (6 estaciones): 48, 50, 55, 56, 60
  - Periodo: 2010-2024 (15 años)
  - Promedio de registros: 32,018

## Estadísticas Generales

| Métrica | Valor |
|---------|-------|
| Total de estaciones | 24 |
| Años de datos disponibles | 24 (2001-2024) |
| Estaciones con serie completa | 11 (45.8%) |
| Estaciones Gen1 (2001-2002) | 13 (54.2%) |
| Estaciones Gen2 (2009-2010) | 12 (45.8%) |
| Total de registros en HDF5 | ~1,200,000 |
| Promedio registros/estación | ~50,000 |

## Implicaciones para el Análisis

### Periodo 2001-2008
- **13 estaciones** disponibles
- Cobertura espacial: Red original del Ayuntamiento de Madrid
- Análisis de tendencias a largo plazo: Basado en estas estaciones

### Periodo 2009-2024
- **24 estaciones** disponibles (expansión de la red)
- Cobertura espacial: Mejorada significativamente
- Mayor densidad de mediciones para interpolación

### Recomendaciones para el Paper

1. **Sección de Datos**:
   - Mencionar dos generaciones de estaciones
   - Explicar que análisis 2001-2008 usa 13 estaciones
   - Análisis post-2009 usa 24 estaciones

2. **Interpolación**:
   - La densidad espacial mejoró en 2009-2010
   - Considerar diferentes estrategias de interpolación para cada periodo
   - Validación cruzada debe tener en cuenta disponibilidad temporal

3. **Análisis de Tendencias**:
   - Tendencias a largo plazo (2001-2024): Solo 11 estaciones con serie completa
   - Análisis comparativos: Considerar que la red se expandió

4. **Figura Sugerida para el Paper**:
   - Timeline mostrando periodo activo de cada estación
   - Eje Y: Estaciones (agrupadas por generación)
   - Eje X: Años (2001-2024)
   - Barras horizontales mostrando cobertura temporal

## Notas Adicionales

- **Estación 8 y 24**: Mayor número de registros, posiblemente estaciones de referencia
- **Gaps en estación 17**: Investigar causas (mantenimiento, averías)
- **Fecha de inicio tardía en estación 27**: Diciembre 2002 sugiere instalación a finales de año

## Generado

Fecha: 2025-01-16
Fuente: `air_quality.h5`
Script: Análisis de estaciones con pandas HDFStore
