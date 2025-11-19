import * as d3 from 'd3';

/**
 * Renderiza un line chart con soporte para múltiples series y tooltips interactivos
 * @param {boolean} showLegendInSvg - Si es false, no renderiza la leyenda dentro del SVG
 * @returns {Array} - Array de series con sus colores para renderizar leyenda externa
 */
export function renderLineChartWithTooltip(svg, data, width = 400, height = 250, showLegendInSvg = true) {
  const isLarge = width > 500; // Detectar si es versión ampliada
  const fontSize = isLarge ? 16 : 13; // Tamaños de fuente
  const axisFontSize = isLarge ? 14 : 12;
  const legendFontSize = isLarge ? 15 : 13;

  const margin = { top: 30, right: 120, bottom: 50, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svgSelection = d3.select(svg);
  const g = svgSelection
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Detectar si data es formato de múltiples series o una sola
  const isSingleSeries = Array.isArray(data) && data[0] && !data[0].series;
  const series = isSingleSeries ? [{ series: 'Datos', data }] : data;

  // Colores para cada serie
  const colors = ['#6366f1', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

  // Obtener todos los datos planos para calcular escalas Y
  const allData = series.flatMap(s => s.data);

  // El eje X siempre debe ser del tamaño de una sola serie (ej. 24 horas)
  const dataPointsPerSeries = series[0]?.data?.length || 24;

  // Escalas
  const x = d3.scaleLinear()
    .domain([0, dataPointsPerSeries - 1])
    .range([0, innerWidth]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(allData, d => d.value) * 1.1])
    .range([innerHeight, 0]);

  // Ejes
  g.append('g')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(Math.min(24, dataPointsPerSeries)))
    .attr('color', '#6b7280')
    .selectAll('text')
    .attr('font-size', `${axisFontSize}px`);

  g.append('g')
    .call(d3.axisLeft(y))
    .attr('color', '#6b7280')
    .selectAll('text')
    .attr('font-size', `${axisFontSize}px`);

  // Tooltip (div HTML posicionado absolutamente)
  const tooltip = d3.select('body').append('div')
    .style('position', 'absolute')
    .style('background', 'rgba(0, 0, 0, 0.85)')
    .style('color', 'white')
    .style('padding', '8px 12px')
    .style('border-radius', '6px')
    .style('font-size', '13px')
    .style('pointer-events', 'none')
    .style('opacity', 0)
    .style('z-index', 10000);

  // Dibujar cada serie
  series.forEach((s, seriesIndex) => {
    const color = colors[seriesIndex % colors.length];
    const lineData = s.data;

    // Línea
    const line = d3.line()
      .x((d, i) => x(i))
      .y(d => y(d.value));

    g.append('path')
      .datum(lineData)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 2.5)
      .attr('d', line);

    // Puntos con interactividad
    g.selectAll(`.dot-series-${seriesIndex}`)
      .data(lineData)
      .enter()
      .append('circle')
      .attr('class', `dot-series-${seriesIndex}`)
      .attr('cx', (d, i) => x(i))
      .attr('cy', d => y(d.value))
      .attr('r', 4)
      .attr('fill', color)
      .attr('stroke', 'white')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 7);

        tooltip
          .style('opacity', 1)
          .html(`
            <div><strong>${s.series}</strong></div>
            <div>${d.label}: <strong>${d.value.toFixed(2)} µg/m³</strong></div>
          `)
          .style('left', (event.pageX + 15) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 4);

        tooltip.style('opacity', 0);
      });
  });

  // Leyenda (solo si hay múltiples series Y showLegendInSvg es true)
  if (series.length > 1 && showLegendInSvg) {
    const legend = g.append('g')
      .attr('transform', `translate(${innerWidth + 20}, 0)`);

    series.forEach((s, i) => {
      const legendRow = legend.append('g')
        .attr('transform', `translate(0, ${i * 25})`);

      legendRow.append('rect')
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', colors[i % colors.length]);

      legendRow.append('text')
        .attr('x', 20)
        .attr('y', 12)
        .attr('font-size', `${legendFontSize}px`)
        .attr('fill', '#374151')
        .text(s.series);
    });
  }

  // Labels de ejes
  g.append('text')
    .attr('x', innerWidth / 2)
    .attr('y', innerHeight + 40)
    .attr('fill', '#374151')
    .attr('text-anchor', 'middle')
    .attr('font-size', `${fontSize}px`)
    .text('Hora del día');

  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -innerHeight / 2)
    .attr('y', -45)
    .attr('fill', '#374151')
    .attr('text-anchor', 'middle')
    .attr('font-size', `${fontSize}px`)
    .text('NO₂ (µg/m³)');

  // Limpiar tooltip al cerrar
  svgSelection.on('remove', () => {
    tooltip.remove();
  });

  // Retornar información de las series con sus colores para leyenda externa
  return series.map((s, i) => ({
    name: s.series,
    color: colors[i % colors.length]
  }));
}

/**
 * Renderiza un bar chart con tooltips interactivos
 */
export function renderBarChartWithTooltip(svg, data, width = 400, height = 250) {
  console.log('📊 renderBarChartWithTooltip recibiendo:', {
    dataLength: data.length,
    firstItem: data[0],
    labels: data.map(d => d.label),
    values: data.map(d => d.value)
  });

  const isLarge = width > 500; // Detectar si es versión ampliada
  const fontSize = isLarge ? 16 : 13;
  const axisFontSize = isLarge ? 14 : 12;

  const margin = { top: 30, right: 30, bottom: 80, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svgSelection = d3.select(svg);
  const g = svgSelection
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Tooltip
  const tooltip = d3.select('body').append('div')
    .style('position', 'absolute')
    .style('background', 'rgba(0, 0, 0, 0.85)')
    .style('color', 'white')
    .style('padding', '8px 12px')
    .style('border-radius', '6px')
    .style('font-size', '13px')
    .style('pointer-events', 'none')
    .style('opacity', 0)
    .style('z-index', 10000);

  // Escalas
  const x = d3.scaleBand()
    .domain(data.map(d => d.label))
    .range([0, innerWidth])
    .padding(0.2);

  // Calcular el máximo considerando max_value si existe
  const maxValue = d3.max(data, d => d.max_value || d.value);

  const y = d3.scaleLinear()
    .domain([0, maxValue * 1.1])
    .range([innerHeight, 0]);

  // Ejes
  g.append('g')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x))
    .attr('color', '#6b7280')
    .selectAll('text')
    .attr('font-size', `${axisFontSize}px`)
    .attr('transform', 'rotate(-45)')
    .style('text-anchor', 'end');

  g.append('g')
    .call(d3.axisLeft(y))
    .attr('color', '#6b7280')
    .selectAll('text')
    .attr('font-size', `${axisFontSize}px`);

  // Barras con interactividad (valores promedio)
  g.selectAll('rect')
    .data(data)
    .enter()
    .append('rect')
    .attr('x', d => x(d.label))
    .attr('y', d => y(d.value))
    .attr('width', x.bandwidth())
    .attr('height', d => innerHeight - y(d.value))
    .attr('fill', '#6366f1')
    .style('cursor', 'pointer')
    .on('mouseover', function(event, d) {
      d3.select(this)
        .transition()
        .duration(200)
        .attr('fill', '#4f46e5');

      // Construir HTML del tooltip
      let tooltipHtml = `
        <div><strong>${d.label}</strong></div>
        <div>Promedio: <strong>${d.value.toFixed(2)} µg/m³</strong></div>
      `;

      if (d.max_value !== undefined) {
        tooltipHtml += `<div>Máximo: <strong style="color: #ef4444">${d.max_value.toFixed(2)} µg/m³</strong></div>`;
      }

      if (d.min_value !== undefined) {
        tooltipHtml += `<div>Mínimo: <strong style="color: #3b82f6">${d.min_value.toFixed(2)} µg/m³</strong></div>`;
      }

      tooltip
        .style('opacity', 1)
        .html(tooltipHtml)
        .style('left', (event.pageX + 15) + 'px')
        .style('top', (event.pageY - 28) + 'px');
    })
    .on('mouseout', function() {
      d3.select(this)
        .transition()
        .duration(200)
        .attr('fill', '#6366f1');

      tooltip.style('opacity', 0);
    });

  // Dibujar líneas de máximos y mínimos si existen los datos
  const hasMinMax = data.some(d => d.max_value !== undefined && d.min_value !== undefined);

  if (hasMinMax) {
    // Crear escala numérica para posiciones X (centro de cada barra)
    const xNumeric = d3.scaleLinear()
      .domain([0, data.length - 1])
      .range([x.bandwidth() / 2, innerWidth - x.bandwidth() / 2]);

    // Línea de máximos (roja)
    const maxLine = d3.line()
      .x((d, i) => xNumeric(i))
      .y(d => y(d.max_value || d.value));

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#ef4444')
      .attr('stroke-width', 2.5)
      .attr('d', maxLine);

    // Puntos de máximos
    g.selectAll('.dot-max')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'dot-max')
      .attr('cx', (d, i) => xNumeric(i))
      .attr('cy', d => y(d.max_value || d.value))
      .attr('r', 4)
      .attr('fill', '#ef4444')
      .attr('stroke', 'white')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 7);

        tooltip
          .style('opacity', 1)
          .html(`
            <div><strong>${d.label}</strong></div>
            <div>Máximo: <strong style="color: #ef4444">${(d.max_value || d.value).toFixed(2)} µg/m³</strong></div>
          `)
          .style('left', (event.pageX + 15) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 4);

        tooltip.style('opacity', 0);
      });

    // Línea de mínimos (azul)
    const minLine = d3.line()
      .x((d, i) => xNumeric(i))
      .y(d => y(d.min_value || d.value));

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 2.5)
      .attr('d', minLine);

    // Puntos de mínimos
    g.selectAll('.dot-min')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'dot-min')
      .attr('cx', (d, i) => xNumeric(i))
      .attr('cy', d => y(d.min_value || d.value))
      .attr('r', 4)
      .attr('fill', '#3b82f6')
      .attr('stroke', 'white')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 7);

        tooltip
          .style('opacity', 1)
          .html(`
            <div><strong>${d.label}</strong></div>
            <div>Mínimo: <strong style="color: #3b82f6">${(d.min_value || d.value).toFixed(2)} µg/m³</strong></div>
          `)
          .style('left', (event.pageX + 15) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 4);

        tooltip.style('opacity', 0);
      });

    // Añadir leyenda horizontal en la parte superior derecha
    const legendData = [
      { label: 'Promedio', type: 'rect', color: '#6366f1' },
      { label: 'Máximo', type: 'line', color: '#ef4444' },
      { label: 'Mínimo', type: 'line', color: '#3b82f6' }
    ];

    const legend = g.append('g')
      .attr('transform', `translate(${innerWidth - 280}, -20)`);

    legendData.forEach((item, i) => {
      const legendItem = legend.append('g')
        .attr('transform', `translate(${i * 95}, 0)`);

      if (item.type === 'rect') {
        legendItem.append('rect')
          .attr('width', 15)
          .attr('height', 15)
          .attr('fill', item.color);
      } else {
        legendItem.append('line')
          .attr('x1', 0)
          .attr('x2', 15)
          .attr('y1', 7)
          .attr('y2', 7)
          .attr('stroke', item.color)
          .attr('stroke-width', 2.5);
      }

      legendItem.append('text')
        .attr('x', 20)
        .attr('y', 12)
        .attr('font-size', '12px')
        .attr('fill', '#374151')
        .text(item.label);
    });
  }

  // Label del eje Y
  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -innerHeight / 2)
    .attr('y', -45)
    .attr('fill', '#374151')
    .attr('text-anchor', 'middle')
    .attr('font-size', `${fontSize}px`)
    .text('NO₂ (µg/m³)');

  // Limpiar tooltip al cerrar
  svgSelection.on('remove', () => {
    tooltip.remove();
  });
}
