# Fix: Problema de Hora 24

## 🐛 Problema Identificado

### Descripción
Los datos no se mostraban para la hora 24 de cada día en el viewer.

### Causa Raíz

Había un **mismatch entre el frontend y los datos**:

#### 1. Datos Originales (CSV)
```
points_20010101_24_res9.csv  ← hora 24 (formato original)
```
Contiene:
```csv
h3_index,datetime,value
89390ca320fffff,2001-01-01 24:00:00,57.082  ← hora 24 del día 1
```

#### 2. Conversión a Parquet
En el script [05_from_csv_to_geoparquet.py](../scripts/05_from_csv_to_geoparquet.py:83-85):

```python
# Corregir formato de hora 24 (debería ser 00 del día siguiente)
df['datetime'] = df['datetime'].str.replace(' 24:', ' 00:', regex=False)
df['datetime'] = pd.to_datetime(df['datetime'])
```

Resultado en Parquet:
```
2001-01-01 24:00:00 → 2001-01-02 00:00:00  ← Convertido al día siguiente
```

#### 3. Frontend (frameBuilder)
En [frameBuilder.js](src/utils/frameBuilder.js:10):

```javascript
// Genera frames con horas 1-24
for (let h = 1; h <= 24; h++)
  frames.push({ year, month, day, hour: h });
```

Genera frames:
```javascript
{ year: 2001, month: 1, day: 1, hour: 24 }  ← Busca hora 24 del día 1
```

#### 4. Búsqueda en ParquetDataManager (ANTES del fix)
```javascript
const dayHourKey = `${day}-${hour}`;  // "01-24"
// Busca en Parquet: día 1, hora 24
// ❌ NO EXISTE (porque fue convertido a día 2, hora 0)
```

---

## ✅ Solución Implementada

### Cambio en [ParquetDataManager.js](src/utils/ParquetDataManager.js:242-267)

```javascript
getData(year, month, day, hour) {
  // IMPORTANTE: frameBuilder genera horas 1-24, pero Parquet tiene 0-23
  // La hora 24 del día D corresponde a la hora 0 del día D+1
  let actualYear = year;
  let actualMonth = month;
  let actualDay = day;
  let actualHour = hour;

  if (hour === 24) {
    // Hora 24 = medianoche del día siguiente = hora 0 del día D+1
    actualHour = 0;
    actualDay = day + 1;

    // Verificar si pasamos al siguiente mes
    const daysInCurrentMonth = new Date(year, month, 0).getDate();
    if (actualDay > daysInCurrentMonth) {
      actualDay = 1;
      actualMonth = month + 1;

      // Verificar si pasamos al siguiente año
      if (actualMonth > 12) {
        actualMonth = 1;
        actualYear = year + 1;
      }
    }
  }

  const key = this.getMonthKey(actualYear, actualMonth);
  const dayHourKey = `${actualDay}-${actualHour}`;

  // Ahora busca correctamente:
  // Entrada: día 1, hora 24
  // Busca: día 2, hora 0 ✅
}
```

### Casos de Borde Manejados

#### 1. Último día del mes
```javascript
// Entrada:
{ year: 2001, month: 1, day: 31, hour: 24 }

// Conversión:
actualDay = 32 → 1        (primer día del siguiente mes)
actualMonth = 1 → 2       (febrero)
actualYear = 2001         (sin cambio)

// Resultado:
Busca: año=2001, mes=02, día=01, hora=00 ✅
```

#### 2. Último día del año
```javascript
// Entrada:
{ year: 2001, month: 12, day: 31, hour: 24 }

// Conversión:
actualDay = 32 → 1        (primer día del siguiente mes)
actualMonth = 12 → 13 → 1 (enero del siguiente año)
actualYear = 2001 → 2002  (año siguiente)

// Resultado:
Busca: año=2002, mes=01, día=01, hora=00 ✅
```

---

## 🧪 Cómo Verificar el Fix

### Opción 1: Consola del Navegador

1. Abre http://localhost:5173/map/madno2
2. Navega a cualquier día (ej: 1 enero 2001)
3. La animación debería mostrar 24 frames (horas 1-24)
4. En la consola verás:

```
📥 Obteniendo datos para frame: year=2001, month=1, day=1, hour=24
   → Convertido a: year=2001, month=1, day=2, hour=0 ✅
   → Datos encontrados: 777 celdas
```

### Opción 2: Test Manual

```javascript
// En la consola del navegador:
const manager = window.__parquetManager; // (si se expone)

// Test hora normal
manager.getData(2001, 1, 1, 15);  // ✅ Debería retornar datos

// Test hora 24
manager.getData(2001, 1, 1, 24);  // ✅ Ahora debería retornar datos del día 2, hora 0

// Test fin de mes
manager.getData(2001, 1, 31, 24); // ✅ Debería retornar datos de feb 1, hora 0
```

---

## 📝 Alternativas Consideradas

### Opción A: Cambiar frameBuilder (Descartada)
❌ Cambiar frameBuilder para generar horas 0-23 en lugar de 1-24
- **Problema**: Rompería compatibilidad con CSV legacy
- **Impacto**: Requeriría cambios en múltiples componentes

### Opción B: Ajustar en ParquetDataManager (Implementada)
✅ Convertir hora 24 a día siguiente hora 0 en tiempo de lectura
- **Ventaja**: Solo afecta a Parquet, CSV sigue funcionando
- **Ventaja**: Cambio mínimo y localizado
- **Ventaja**: Maneja correctamente casos de borde

### Opción C: Regenerar Parquet sin convertir hora 24
❌ Mantener hora 24 en los Parquet
- **Problema**: PostgreSQL y la mayoría de DBs no soportan hora 24
- **Problema**: Formato no estándar según ISO 8601
- **Impacto**: ~430 MB de datos a regenerar

---

## 🎯 Resultado

✅ **Problema resuelto**
- La hora 24 ahora se muestra correctamente
- Sin saltos en las animaciones
- Compatible con CSV legacy
- Maneja correctamente cambios de mes/año

---

**Fecha**: 30 octubre 2025
**Autor**: Claude (Anthropic)
