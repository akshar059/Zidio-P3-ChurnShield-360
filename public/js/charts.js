/**
 * Standalone High-Performance Canvas Chart Engine
 * Light Warm Professional Theme Compatible, Clean, Retina-Crisp
 */

class MiniCharts {
  static getRetinaContext(canvas) {
    if (!canvas) return { ctx: null, width: 0, height: 0 };
    const rect = canvas.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) {
      return { ctx: null, width: 0, height: 0 };
    }
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { ctx: null, width: 0, height: 0 };
    ctx.scale(dpr, dpr);
    return { ctx, width: rect.width, height: rect.height };
  }

  static BRAZIL_STATES = {
    SP: "São Paulo",
    RJ: "Rio de Janeiro",
    MG: "Minas Gerais",
    RS: "Rio Grande do Sul",
    PR: "Paraná",
    SC: "Santa Catarina",
    BA: "Bahia",
    DF: "Distrito Federal (Brasília)",
    GO: "Goiás",
    ES: "Espírito Santo",
    PE: "Pernambuco",
    CE: "Ceará",
    PA: "Pará",
    MT: "Mato Grosso",
    MA: "Maranhão",
    MS: "Mato Grosso do Sul",
    PB: "Paraíba",
    RN: "Rio Grande do Norte",
    AL: "Alagoas",
    PI: "Piauí",
    SE: "Sergipe",
    RO: "Rondônia",
    TO: "Tocantins",
    AM: "Amazonas",
    AC: "Acre",
    AP: "Amapá",
    RR: "Roraima"
  };

  static isLightTheme() {
    return document.documentElement.getAttribute("data-theme") !== "dark";
  }

  static getThemeColors() {
    const isLight = this.isLightTheme();
    return {
      grid: isLight ? "rgba(220, 210, 195, 0.45)" : "rgba(255, 255, 255, 0.06)",
      text: isLight ? "#57534E" : "#94A3B8",
      textDim: isLight ? "#8C827A" : "#64748B",
      cardBg: isLight ? "#FFFFFF" : "#111827",
      border: isLight ? "#E7E0D5" : "rgba(255, 255, 255, 0.08)"
    };
  }

  static showTooltip(e, title, rows) {
    const tt = document.getElementById("chart-floating-tooltip");
    if (!tt) return;
    let html = `<div class="tooltip-title">${title}</div>`;
    rows.forEach(r => {
      html += `
        <div class="tooltip-value-row">
          <span class="tooltip-dot" style="background: ${r.color || 'var(--accent-primary)'};"></span>
          <span style="font-size: 0.78rem; font-weight: 500; color: var(--text-dim);">${r.label}:</span>
          <span style="font-weight: 700; color: var(--text-main); margin-left: auto;">${r.val}</span>
        </div>
      `;
    });
    tt.innerHTML = html;
    tt.style.display = "block";
    tt.style.opacity = "1";

    const offset = 14;
    let left = e.clientX + offset;
    let top = e.clientY + offset;
    const ttRect = tt.getBoundingClientRect();
    if (left + ttRect.width > window.innerWidth - 12) {
      left = e.clientX - ttRect.width - offset;
    }
    if (top + ttRect.height > window.innerHeight - 12) {
      top = e.clientY - ttRect.height - offset;
    }
    tt.style.left = `${Math.max(10, left)}px`;
    tt.style.top = `${Math.max(10, top)}px`;
  }

  static hideTooltip() {
    const tt = document.getElementById("chart-floating-tooltip");
    if (tt) {
      tt.style.opacity = "0";
      tt.style.display = "none";
    }
  }

  static attachHoverListeners(canvas) {
    if (!canvas || canvas._hasChartHoverListeners) return;
    canvas._hasChartHoverListeners = true;
    canvas.addEventListener("mousemove", (e) => {
      if (typeof canvas._chartHoverHandler === "function") {
        canvas._chartHoverHandler(e);
      }
    });
    canvas.addEventListener("mouseleave", () => {
      MiniCharts.hideTooltip();
      if (typeof canvas._chartLeaveHandler === "function") {
        canvas._chartLeaveHandler();
      }
    });
  }

  static drawLineChart(canvasId, options) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const { ctx, width, height } = this.getRetinaContext(canvas);
    if (!ctx || width <= 10 || height <= 10) return;
    const theme = this.getThemeColors();

    const xAxisLabel = options.xAxisLabel || options.xLabel || "";
    const yAxisLabel = options.yAxisLabel || options.yLabel || "";

    const padding = { 
      top: 28, 
      right: 30, 
      bottom: xAxisLabel ? 48 : 38, 
      left: yAxisLabel ? 74 : 65 
    };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const labels = options.labels || [];
    const datasets = options.datasets || [];
    if (!labels.length || !datasets.length) return;

    let minY = Infinity;
    let maxY = -Infinity;
    datasets.forEach(ds => {
      (ds.data || []).forEach(v => {
        if (v !== null && v !== undefined) {
          if (v < minY) minY = v;
          if (v > maxY) maxY = v;
        }
      });
    });
    if (minY === Infinity) minY = 0;
    if (minY > 0) minY = 0;
    if (maxY === minY) maxY = minY + 10;
    maxY *= 1.12;

    ctx.clearRect(0, 0, width, height);

    // Draw Y grid lines
    const yTicks = 5;
    ctx.strokeStyle = theme.grid;
    ctx.fillStyle = theme.text;
    ctx.font = "11px Inter, sans-serif";
    ctx.textAlign = "right";

    for (let i = 0; i <= yTicks; i++) {
      const val = minY + (maxY - minY) * (i / yTicks);
      const y = padding.top + chartH - (i / yTicks) * chartH;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      const labelText = options.formatY ? options.formatY(val) : (val >= 1000 ? `$${(val/1000).toFixed(0)}k` : val.toFixed(0));
      ctx.fillText(labelText, padding.left - 10, y + 4);
    }

    // Draw X labels with dynamic collision prevention
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // Measure maximum label width
    let maxLblW = 0;
    labels.forEach(lbl => {
      const w = ctx.measureText(String(lbl)).width;
      if (w > maxLblW) maxLblW = w;
    });

    const xStep = chartW / Math.max(labels.length - 1, 1);
    const minSpacing = maxLblW + 16;
    const maxLabelsThatFit = Math.max(2, Math.floor(chartW / minSpacing));
    const labelSkip = Math.max(1, Math.ceil(labels.length / maxLabelsThatFit));

    let lastDrawnX = -Infinity;
    labels.forEach((lbl, i) => {
      const x = padding.left + i * xStep;
      const isLast = (i === labels.length - 1);
      const isStep = (i % labelSkip === 0);

      if (isStep || isLast) {
        // Prevent collision with previous label
        if (x - lastDrawnX < minSpacing) return;
        // If not last, ensure it won't collide with guaranteed last label
        if (!isLast) {
          const lastX = padding.left + (labels.length - 1) * xStep;
          if (lastX - x < minSpacing) return;
        }
        ctx.fillStyle = theme.text;
        ctx.fillText(lbl, x, padding.top + chartH + 14);
        lastDrawnX = x;
      }
    });

    // Draw Datasets
    datasets.forEach(ds => {
      const color = ds.color || "#C2410C";
      ctx.strokeStyle = color;
      ctx.lineWidth = ds.width || 2.5;

      if (ds.dashed) {
        ctx.setLineDash([5, 5]);
      } else {
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      let started = false;
      let firstX = 0, firstY = 0, lastX = 0;

      ds.data.forEach((val, i) => {
        if (val === null || val === undefined) return;
        const x = padding.left + i * xStep;
        const normY = (val - minY) / (maxY - minY);
        const y = padding.top + chartH - normY * chartH;
        if (!started) {
          ctx.moveTo(x, y);
          firstX = x;
          firstY = y;
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
        lastX = x;
      });
      ctx.stroke();

      // Area fill if requested
      if (ds.fill && started) {
        ctx.lineTo(lastX, padding.top + chartH);
        ctx.lineTo(firstX, padding.top + chartH);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
        grad.addColorStop(0, ds.fill);
        grad.addColorStop(1, "rgba(255, 255, 255, 0.0)");
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Draw dots
      if (ds.dots !== false) {
        ctx.setLineDash([]);
        ctx.fillStyle = color;
        ds.data.forEach((val, i) => {
          if (val === null || val === undefined) return;
          if (i % labelSkip === 0 || i === ds.data.length - 1) {
            const x = padding.left + i * xStep;
            const normY = (val - minY) / (maxY - minY);
            const y = padding.top + chartH - normY * chartH;
            ctx.beginPath();
            ctx.arc(x, y, 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#FFFFFF";
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        });
      }
    });

    // Draw Top Legend for Line Chart
    let curLegendX = width - padding.right;
    ctx.textAlign = "right";
    ctx.font = "10px Inter, sans-serif";
    datasets.slice().reverse().forEach(ds => {
      if (!ds.label) return;
      ctx.fillStyle = theme.text;
      ctx.fillText(ds.label, curLegendX, 15);
      const textW = ctx.measureText(ds.label).width;

      const swatchX = curLegendX - textW - 10;
      const swatchY = 12;
      ctx.strokeStyle = ds.color || "#C2410C";
      ctx.lineWidth = 2.5;
      if (ds.dashed) {
        ctx.setLineDash([3, 3]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.beginPath();
      ctx.moveTo(swatchX - 12, swatchY);
      ctx.lineTo(swatchX, swatchY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = ds.color || "#C2410C";
      ctx.beginPath();
      ctx.arc(swatchX - 6, swatchY, 2.5, 0, Math.PI * 2);
      ctx.fill();

      curLegendX -= (textW + 28);
    });

    // Render Y-Axis Title (Rotated)
    if (yAxisLabel) {
      ctx.save();
      ctx.translate(14, padding.top + chartH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = theme.textDim;
      ctx.font = "bold 9.5px Inter, sans-serif";
      ctx.fillText(yAxisLabel.toUpperCase(), 0, 0);
      ctx.restore();
    }

    // Render X-Axis Title (Centered)
    if (xAxisLabel) {
      ctx.fillStyle = theme.textDim;
      ctx.font = "bold 9.5px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(xAxisLabel.toUpperCase(), padding.left + chartW / 2, height - 6);
    }

    // Attach interactive hover listener
    this.attachHoverListeners(canvas);
    canvas._chartHoverHandler = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (mouseX < padding.left - 10 || mouseX > width - padding.right + 10 ||
          mouseY < padding.top - 10 || mouseY > padding.top + chartH + 10) {
        MiniCharts.hideTooltip();
        return;
      }

      const relX = mouseX - padding.left;
      const idx = Math.max(0, Math.min(labels.length - 1, Math.round(relX / xStep)));
      const lbl = labels[idx];

      const tooltipRows = [];
      datasets.forEach(ds => {
        const val = ds.data ? ds.data[idx] : null;
        if (val !== null && val !== undefined) {
          const formatted = options.formatY ? options.formatY(val) : (val >= 1000 ? `$${(val/1000).toFixed(1)}k` : val.toLocaleString());
          tooltipRows.push({
            color: ds.color || "#C2410C",
            label: ds.label || "Value",
            val: formatted
          });
        }
      });

      if (tooltipRows.length > 0) {
        MiniCharts.showTooltip(e, String(lbl), tooltipRows);
      }
    };
    canvas._chartLeaveHandler = () => {
      MiniCharts.hideTooltip();
    };
  }

  static drawBarChart(canvasId, options) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const { ctx, width, height } = this.getRetinaContext(canvas);
    if (!ctx || width <= 10 || height <= 10) return;
    const theme = this.getThemeColors();

    const labels = options.labels || [];
    const data = options.data || [];
    if (!labels.length || !data.length) return;

    ctx.clearRect(0, 0, width, height);

    const legendText = options.legendLabel || options.seriesLabel || "";
    const xAxisLabel = options.xAxisLabel || options.xLabel || "";
    const yAxisLabel = options.yAxisLabel || options.yLabel || "";

    if (options.horizontal) {
      const hasBothHeaders = !!(legendText && yAxisLabel);
      const topPad = hasBothHeaders ? 40 : (legendText || yAxisLabel ? 26 : 16);
      const botPad = xAxisLabel ? 34 : 16;
      const leftPad = 120;
      const padding = { top: topPad, right: 40, bottom: botPad, left: leftPad };
      const chartW = width - padding.left - padding.right;
      const chartH = height - padding.top - padding.bottom;
      const maxVal = Math.max(...data) * 1.15 || 1;
      const gap = chartH / labels.length;
      const barH = Math.min(20, gap * 0.62);

      // Render Top Legend for Horizontal Bar Chart (aligned right on line 1: y = 13)
      if (legendText) {
        ctx.font = "10px Inter, sans-serif";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillStyle = theme.text;
        ctx.fillText(legendText, width - padding.right, 13);
        const textW = ctx.measureText(legendText).width;

        const grad = ctx.createLinearGradient(0, 0, 10, 0);
        grad.addColorStop(0, options.colorStart || "#D97706");
        grad.addColorStop(1, options.colorEnd || "#EA580C");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(width - padding.right - textW - 13, 8, 9, 9, 2);
        ctx.fill();
      }

      // Render Y-Axis Title as Top-Left Column Header above categories
      // When legendText exists, render on line 2 (y = 28) so they NEVER overlap horizontally
      if (yAxisLabel) {
        const yPos = hasBothHeaders ? 28 : 13;
        ctx.fillStyle = theme.textDim;
        ctx.font = "bold 9.5px Inter, sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(yAxisLabel.toUpperCase(), 16, yPos);
      }

      labels.forEach((lbl, i) => {
        const val = data[i];
        const y = padding.top + i * gap + (gap - barH) / 2;
        const barW = (val / maxVal) * chartW;

        // Truncate category label if too long so it never bleeds into canvas edge
        ctx.fillStyle = theme.text;
        ctx.font = "11px Inter, sans-serif";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        let displayLbl = String(lbl);
        const maxCatW = padding.left - 18;
        if (ctx.measureText(displayLbl).width > maxCatW) {
          while (displayLbl.length > 3 && ctx.measureText(displayLbl + "…").width > maxCatW) {
            displayLbl = displayLbl.slice(0, -1);
          }
          displayLbl += "…";
        }
        ctx.fillText(displayLbl, padding.left - 10, y + barH / 2);

        // Bar
        const grad = ctx.createLinearGradient(padding.left, 0, padding.left + barW, 0);
        grad.addColorStop(0, options.colorStart || "#D97706");
        grad.addColorStop(1, options.colorEnd || "#EA580C");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(padding.left, y, Math.max(barW, 3), barH, 4);
        ctx.fill();

        // Value text
        ctx.fillStyle = theme.text;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        const valStr = options.formatVal ? options.formatVal(val) : val.toLocaleString();
        ctx.fillText(valStr, padding.left + barW + 8, y + barH / 2);
      });

      // Render X-Axis Title (Centered at bottom with bottom baseline so it never clips)
      if (xAxisLabel) {
        ctx.fillStyle = theme.textDim;
        ctx.font = "bold 9.5px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(xAxisLabel.toUpperCase(), padding.left + chartW / 2, height - 6);
      }
    } else {
      const paddingLeft = yAxisLabel ? 76 : 58;
      const paddingRight = 20;
      const topPad = legendText ? 30 : 22;
      const chartW = width - paddingLeft - paddingRight;
      const step = chartW / Math.max(labels.length, 1);

      // Choose optimal font size based on step width
      const fontSize = step < 22 ? 9 : (step < 30 ? 10 : 11);
      const fontStr = `${fontSize}px Inter, sans-serif`;
      ctx.font = fontStr;

      // Measure max label width with the active font
      let maxLblW = 0;
      labels.forEach(lbl => {
        const w = ctx.measureText(String(lbl)).width;
        if (w > maxLblW) maxLblW = w;
      });

      // A label only needs rotation if it cannot comfortably fit horizontally
      const fitsHorizontally = maxLblW <= (step - 3);
      const needsRotation = !fitsHorizontally;

      // If rotation is needed, use a steeper angle (-68° to -55°) to eliminate horizontal label overlap
      const rotAngle = step < 26 ? -Math.PI / 2.65 : -Math.PI / 3.2; // ~-68° or ~-56°
      const xTitleExtra = xAxisLabel ? 26 : 0;
      const padBottom = (needsRotation ? Math.min(76, Math.max(48, maxLblW * Math.sin(Math.abs(rotAngle)) + 16)) : 34) + xTitleExtra;

      const padding = { top: topPad, right: paddingRight, bottom: padBottom, left: paddingLeft };
      const chartH = height - padding.top - padding.bottom;
      const maxVal = Math.max(...data) * 1.15 || 1;
      const barW = Math.max(5, Math.min(needsRotation ? 20 : 28, step * 0.58));

      // Render Top Legend for Vertical Bar Chart
      if (legendText) {
        ctx.font = "10px Inter, sans-serif";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillStyle = theme.text;
        ctx.fillText(legendText, width - padding.right, 14);
        const textW = ctx.measureText(legendText).width;

        const grad = ctx.createLinearGradient(0, 0, 10, 0);
        grad.addColorStop(0, options.colorStart || "#D97706");
        grad.addColorStop(1, options.colorEnd || "#EA580C");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(width - padding.right - textW - 13, 9, 9, 9, 2);
        ctx.fill();
      }

      // Y-axis grid
      ctx.strokeStyle = theme.grid;
      ctx.fillStyle = theme.text;
      ctx.font = "11px Inter, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      for (let i = 0; i <= 4; i++) {
        const val = (maxVal * i) / 4;
        const y = padding.top + chartH - (i / 4) * chartH;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
        ctx.fillText(options.formatVal ? options.formatVal(val) : Math.round(val), padding.left - 8, y);
      }

      labels.forEach((lbl, i) => {
        const val = data[i];
        const barH = (val / maxVal) * chartH;
        const x = padding.left + i * step + (step - barW) / 2;
        const y = padding.top + chartH - barH;

        // Bar gradient
        const grad = ctx.createLinearGradient(0, y, 0, padding.top + chartH);
        grad.addColorStop(0, options.colorStart || "#D97706");
        grad.addColorStop(1, options.colorEnd || "#C2410C");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
        ctx.fill();

        // Label rendering: Horizontal if fits, or steep collision-free angle if rotation required
        if (needsRotation) {
          ctx.save();
          ctx.translate(x + barW / 2, padding.top + chartH + 8);
          ctx.rotate(rotAngle);
          ctx.textAlign = "right";
          ctx.textBaseline = "middle";
          ctx.fillStyle = theme.text;
          ctx.font = fontStr;

          // Ellipsis truncate if excessively long
          let displayLbl = String(lbl);
          if (ctx.measureText(displayLbl).width > 70) {
            while (displayLbl.length > 3 && ctx.measureText(displayLbl + "…").width > 70) {
              displayLbl = displayLbl.slice(0, -1);
            }
            displayLbl += "…";
          }
          ctx.fillText(displayLbl, 0, 0);
          ctx.restore();
        } else {
          ctx.fillStyle = theme.text;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.font = fontStr;
          ctx.fillText(lbl, x + barW / 2, padding.top + chartH + 8);
        }
      });

      // Render Y-Axis Title (Rotated)
      if (yAxisLabel) {
        ctx.save();
        ctx.translate(14, padding.top + chartH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = theme.textDim;
        ctx.font = "bold 9.5px Inter, sans-serif";
        ctx.fillText(yAxisLabel.toUpperCase(), 0, 0);
        ctx.restore();
      }

      // Render X-Axis Title (Centered with bottom baseline so it never cuts off)
      if (xAxisLabel) {
        ctx.fillStyle = theme.textDim;
        ctx.font = "bold 9.5px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(xAxisLabel.toUpperCase(), padding.left + chartW / 2, height - 6);
      }
    }

    // Attach interactive hover listener
    this.attachHoverListeners(canvas);
    if (options.horizontal) {
      canvas._chartHoverHandler = (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseY = e.clientY - rect.top;
        const topPad = (legendText && yAxisLabel) ? 40 : (legendText || yAxisLabel ? 26 : 16);
        const botPad = xAxisLabel ? 34 : 16;
        const chartH = height - topPad - botPad;
        const gap = chartH / labels.length;

        if (mouseY < topPad || mouseY > topPad + chartH) {
          MiniCharts.hideTooltip();
          return;
        }
        const idx = Math.floor((mouseY - topPad) / gap);
        if (idx >= 0 && idx < labels.length) {
          const val = data[idx];
          const valStr = options.formatVal ? options.formatVal(val) : val.toLocaleString();
          const rawLbl = String(labels[idx]);
          const displayTitle = MiniCharts.BRAZIL_STATES[rawLbl] ? `${MiniCharts.BRAZIL_STATES[rawLbl]} (${rawLbl})` : rawLbl;
          MiniCharts.showTooltip(e, displayTitle, [{
            color: options.colorEnd || options.colorStart || "#EA580C",
            label: legendText || "Metric",
            val: valStr
          }]);
        } else {
          MiniCharts.hideTooltip();
        }
      };
    } else {
      canvas._chartHoverHandler = (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const paddingLeft = yAxisLabel ? 76 : 58;
        const paddingRight = 20;
        const chartW = width - paddingLeft - paddingRight;
        const step = chartW / Math.max(labels.length, 1);

        if (mouseX < paddingLeft || mouseX > width - paddingRight) {
          MiniCharts.hideTooltip();
          return;
        }
        const idx = Math.floor((mouseX - paddingLeft) / step);
        if (idx >= 0 && idx < labels.length) {
          const val = data[idx];
          const valStr = options.formatVal ? options.formatVal(val) : val.toLocaleString();
          const rawLbl = String(labels[idx]);
          const displayTitle = MiniCharts.BRAZIL_STATES[rawLbl] ? `${MiniCharts.BRAZIL_STATES[rawLbl]} (${rawLbl})` : rawLbl;
          MiniCharts.showTooltip(e, displayTitle, [{
            color: options.colorEnd || options.colorStart || "#EA580C",
            label: legendText || "Metric",
            val: valStr
          }]);
        } else {
          MiniCharts.hideTooltip();
        }
      };
    }
    canvas._chartLeaveHandler = () => {
      MiniCharts.hideTooltip();
    };
  }

  static drawGroupedBarChart(canvasId, options) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const { ctx, width, height } = this.getRetinaContext(canvas);
    if (!ctx || width <= 10 || height <= 10) return;
    const theme = this.getThemeColors();

    const labels = options.labels || [];
    const series = options.series || []; // [{ label, data, color }]
    if (!labels.length || !series.length) return;

    const xAxisLabel = options.xAxisLabel || options.xLabel || "";
    const yAxisLabel = options.yAxisLabel || options.yLabel || "";

    ctx.clearRect(0, 0, width, height);

    const padding = { 
      top: 32, 
      right: 25, 
      bottom: xAxisLabel ? 52 : 40, 
      left: yAxisLabel ? 72 : 60 
    };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    let maxVal = 0;
    series.forEach(s => {
      s.data.forEach(v => {
        if (v > maxVal) maxVal = v;
      });
    });
    maxVal = maxVal * 1.15 || 1;

    // Grid lines
    ctx.strokeStyle = theme.grid;
    ctx.fillStyle = theme.text;
    ctx.font = "11px Inter, sans-serif";
    ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
      const val = (maxVal * i) / 4;
      const y = padding.top + chartH - (i / 4) * chartH;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.fillText(options.formatVal ? options.formatVal(val) : (val >= 1000 ? `${(val/1000).toFixed(0)}k` : val.toFixed(0)), padding.left - 8, y + 4);
    }

    const groupStep = chartW / labels.length;
    const nSeries = series.length;
    const barW = Math.min(22, (groupStep * 0.7) / nSeries);

    labels.forEach((lbl, gIdx) => {
      const groupX = padding.left + gIdx * groupStep + (groupStep - barW * nSeries) / 2;

      series.forEach((s, sIdx) => {
        const val = s.data[gIdx] || 0;
        const barH = (val / maxVal) * chartH;
        const x = groupX + sIdx * barW;
        const y = padding.top + chartH - barH;

        ctx.fillStyle = s.color || "#C2410C";
        ctx.beginPath();
        ctx.roundRect(x, y, barW - 2, barH, [4, 4, 0, 0]);
        ctx.fill();
      });

      // Group label
      ctx.fillStyle = theme.text;
      ctx.textAlign = "center";
      ctx.fillText(lbl, groupX + (barW * nSeries) / 2, padding.top + chartH + 18);
    });

    // Legend
    let legendX = width - padding.right - 10;
    ctx.textAlign = "right";
    series.slice().reverse().forEach(s => {
      ctx.fillStyle = theme.text;
      ctx.fillText(s.label, legendX, 18);
      const textW = ctx.measureText(s.label).width;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.roundRect(legendX - textW - 14, 8, 10, 10, 2);
      ctx.fill();
      legendX -= (textW + 30);
    });

    // Render Y-Axis Title (Rotated)
    if (yAxisLabel) {
      ctx.save();
      ctx.translate(14, padding.top + chartH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = theme.textDim;
      ctx.font = "bold 9.5px Inter, sans-serif";
      ctx.fillText(yAxisLabel.toUpperCase(), 0, 0);
      ctx.restore();
    }

    // Render X-Axis Title (Centered)
    if (xAxisLabel) {
      ctx.fillStyle = theme.textDim;
      ctx.font = "bold 9.5px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(xAxisLabel.toUpperCase(), padding.left + chartW / 2, height - 6);
    }

    // Attach interactive hover listener
    this.attachHoverListeners(canvas);
    canvas._chartHoverHandler = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      if (mouseX < padding.left || mouseX > width - padding.right) {
        MiniCharts.hideTooltip();
        return;
      }
      const gIdx = Math.floor((mouseX - padding.left) / groupStep);
      if (gIdx >= 0 && gIdx < labels.length) {
        const rows = series.map(s => {
          const val = s.data ? s.data[gIdx] : 0;
          return {
            color: s.color,
            label: s.label,
            val: options.formatVal ? options.formatVal(val) : val.toLocaleString()
          };
        });
        MiniCharts.showTooltip(e, String(labels[gIdx]), rows);
      } else {
        MiniCharts.hideTooltip();
      }
    };
    canvas._chartLeaveHandler = () => {
      MiniCharts.hideTooltip();
    };
  }

  static drawDonutChart(canvasId, options) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const { ctx, width, height } = this.getRetinaContext(canvas);
    if (!ctx || width <= 10 || height <= 10) return;
    const theme = this.getThemeColors();

    const labels = options.labels || [];
    const data = options.data || [];
    const colors = options.colors || ["#C2410C", "#EA580C", "#D97706", "#0D9488", "#4F46E5"];
    const total = data.reduce((a, b) => a + b, 0) || 1;

    ctx.clearRect(0, 0, width, height);

    const hasLegend = labels && labels.length > 0;
    const isWide = width >= 340;
    const cx = (hasLegend && isWide) ? Math.min(width * 0.34, 105) : width / 2;
    const cy = (hasLegend && !isWide) ? (height * 0.38) : (height / 2);
    const outerR = (hasLegend && isWide)
      ? Math.min(cx - 12, height / 2 - 14)
      : Math.min(width / 2 - 18, (hasLegend ? height * 0.30 : height / 2 - 16));
    const innerR = outerR * 0.65;

    let startAngle = -Math.PI / 2;

    data.forEach((val, i) => {
      const sliceAngle = (val / total) * (Math.PI * 2);
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, startAngle, startAngle + sliceAngle);
      ctx.arc(cx, cy, innerR, startAngle + sliceAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      ctx.strokeStyle = theme.cardBg;
      ctx.lineWidth = 2;
      ctx.stroke();
      startAngle += sliceAngle;
    });

    // Center text
    ctx.fillStyle = this.isLightTheme() ? "#1C1917" : "#FFFFFF";
    ctx.font = `bold ${Math.max(14, Math.round(outerR * 0.34))}px Outfit, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(options.centerText || total.toLocaleString(), cx, cy - 5);

    ctx.fillStyle = theme.textDim;
    ctx.font = "9.5px Inter, sans-serif";
    ctx.fillText(options.centerLabel || "TOTAL", cx, cy + 13);

    // Draw Legend
    if (hasLegend) {
      if (isWide) {
        const legendX = cx + outerR + 18;
        const itemH = Math.min(26, (height - 16) / labels.length);
        const startY = Math.max(10, (height - labels.length * itemH) / 2);

        labels.forEach((lbl, i) => {
          const val = data[i] || 0;
          const pct = ((val / total) * 100).toFixed(1);
          const y = startY + i * itemH + itemH / 2;

          // Color swatch
          ctx.fillStyle = colors[i % colors.length];
          ctx.beginPath();
          ctx.roundRect(legendX, y - 5, 9, 9, 2);
          ctx.fill();

          // Label name
          ctx.fillStyle = theme.text;
          ctx.font = "bold 10px Inter, sans-serif";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(lbl, legendX + 14, y);

          // Value and percentage
          ctx.fillStyle = theme.textDim;
          ctx.font = "9.5px Inter, sans-serif";
          ctx.textAlign = "right";
          ctx.fillText(`${pct}%`, width - 10, y);
        });
      } else {
        // Bottom Legend: Clean, non-overlapping measured layout
        ctx.font = "9.5px Inter, sans-serif";
        const isMultiRow = labels.length >= 4 && width < 380;
        
        if (isMultiRow) {
          const cols = 2;
          const rows = Math.ceil(labels.length / cols);
          const rowH = 18;
          const startY = height - (rows * rowH) + 2;

          labels.forEach((lbl, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const colCenterX = (col === 0) ? (width * 0.28) : (width * 0.72);
            const y = startY + row * rowH;

            const textW = ctx.measureText(lbl).width;
            const dotR = 3.5;
            const gap = 6;
            const totalItemW = dotR * 2 + gap + textW;
            const startX = Math.round(colCenterX - totalItemW / 2);

            // Draw Dot
            ctx.fillStyle = colors[i % colors.length];
            ctx.beginPath();
            ctx.arc(startX + dotR, y, dotR, 0, Math.PI * 2);
            ctx.fill();

            // Draw Label
            ctx.fillStyle = theme.text;
            ctx.font = "9.5px Inter, sans-serif";
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillText(lbl, startX + dotR * 2 + gap, y);
          });
        } else {
          const startY = height - 16;
          const itemW = width / labels.length;

          labels.forEach((lbl, i) => {
            const centerX = i * itemW + itemW / 2;
            const textW = ctx.measureText(lbl).width;
            const dotR = 3.5;
            const gap = 6;
            const totalItemW = dotR * 2 + gap + textW;
            const startX = Math.round(centerX - totalItemW / 2);

            // Draw Dot
            ctx.fillStyle = colors[i % colors.length];
            ctx.beginPath();
            ctx.arc(startX + dotR, startY, dotR, 0, Math.PI * 2);
            ctx.fill();

            // Draw Label
            ctx.fillStyle = theme.text;
            ctx.font = "9.5px Inter, sans-serif";
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillText(lbl, startX + dotR * 2 + gap, startY);
          });
        }
      }
    }

    // Attach interactive hover listener
    this.attachHoverListeners(canvas);
    canvas._chartHoverHandler = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const dx = mouseX - cx;
      const dy = mouseY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist >= innerR * 0.85 && dist <= outerR * 1.15) {
        let angle = Math.atan2(dy, dx);
        if (angle < -Math.PI / 2) angle += Math.PI * 2;
        const normAngle = angle - (-Math.PI / 2);
        let accumulated = 0;
        let matchedIdx = -1;
        for (let i = 0; i < data.length; i++) {
          const sliceAngle = (data[i] / total) * (Math.PI * 2);
          if (normAngle >= accumulated && normAngle <= accumulated + sliceAngle) {
            matchedIdx = i;
            break;
          }
          accumulated += sliceAngle;
        }

        if (matchedIdx !== -1) {
          const val = data[matchedIdx];
          const pct = ((val / total) * 100).toFixed(1);
          MiniCharts.showTooltip(e, String(labels[matchedIdx] || "Segment"), [{
            color: colors[matchedIdx % colors.length],
            label: "Total Volume",
            val: `${val.toLocaleString()} (${pct}%)`
          }]);
          return;
        }
      }
      MiniCharts.hideTooltip();
    };
    canvas._chartLeaveHandler = () => {
      MiniCharts.hideTooltip();
    };
  }

  static drawCircularGauge(canvasId, value, maxValue = 1.0, color = "#C2410C") {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const { ctx, width, height } = this.getRetinaContext(canvas);
    if (!ctx || width <= 10 || height <= 10) return;

    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const r = Math.min(cx, cy) - 15;
    const startAngle = 0.75 * Math.PI;
    const endAngle = 2.25 * Math.PI;
    const totalSweep = 1.5 * Math.PI;

    // Track
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.strokeStyle = this.isLightTheme() ? "rgba(220, 210, 195, 0.4)" : "rgba(255, 255, 255, 0.08)";
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.stroke();

    // Value Arc
    const pct = Math.min(Math.max(value / maxValue, 0.0), 1.0);
    const valAngle = startAngle + pct * totalSweep;

    const grad = ctx.createLinearGradient(0, height, width, 0);
    grad.addColorStop(0, color);
    grad.addColorStop(1, "#E11D48");
    ctx.strokeStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, valAngle);
    ctx.stroke();
  }

  static drawConfusionMatrix(canvasId, cmData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const { ctx, width, height } = this.getRetinaContext(canvas);
    if (!ctx || width <= 10 || height <= 10) return;
    const isLight = this.isLightTheme();

    ctx.clearRect(0, 0, width, height);

    // Generous, calculated margins so labels and axes never collide
    const padLeft = 130;
    const padTop = 56;
    const padRight = 18;
    const padBottom = 32;

    const availW = width - padLeft - padRight;
    const availH = height - padTop - padBottom;
    const maxCellSize = Math.min(availW / 2, availH / 2);
    const size = Math.max(70, Math.min(maxCellSize, 115));
    const matrixW = size * 2;
    const matrixH = size * 2;

    // Center the matrix inside the available area
    const matrixX = padLeft + Math.max(0, (availW - matrixW) / 2);
    const matrixY = padTop + Math.max(0, (availH - matrixH) / 2);

    // Matrix values: [[TN, FP], [FN, TP]]
    const tn = cmData?.[0]?.[0] || 0;
    const fp = cmData?.[0]?.[1] || 0;
    const fn = cmData?.[1]?.[0] || 0;
    const tp = cmData?.[1]?.[1] || 0;
    const total = tn + fp + fn + tp || 1;

    const cells = [
      { r: 0, c: 0, val: tn, title: "True Retained", code: "TN", color: isLight ? "#E0F2FE" : "rgba(56, 189, 248, 0.15)", text: "#0369A1" },
      { r: 0, c: 1, val: fp, title: "False Churn", code: "FP", color: isLight ? "#FEF3C7" : "rgba(245, 158, 11, 0.15)", text: "#B45309" },
      { r: 1, c: 0, val: fn, title: "Missed Churn", code: "FN", color: isLight ? "#FEE2E2" : "rgba(239, 68, 68, 0.15)", text: "#B91C1C" },
      { r: 1, c: 1, val: tp, title: "True Churn", code: "TP", color: isLight ? "#DCFCE7" : "rgba(16, 185, 129, 0.15)", text: "#15803D" }
    ];

    // Axis Titles (X: Predicted Class, Y: Actual Class)
    // 1. Top Axis Title: Dedicated Tier 1 (y = 14) centered above the matrix
    const matrixCenterX = matrixX + size;
    ctx.fillStyle = isLight ? "#78716C" : "#94A3B8";
    ctx.font = "bold 9.5px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("PREDICTED CLASS (MODEL)", matrixCenterX, 14);

    // 2. Left Axis Title: Rotated vertically at x = 16 with safe clearance from row headers
    ctx.save();
    ctx.translate(16, matrixY + size);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = isLight ? "#78716C" : "#94A3B8";
    ctx.font = "bold 9.5px Inter, sans-serif";
    ctx.fillText("ACTUAL CLASS (TRUE)", 0, 0);
    ctx.restore();

    // 3. Column Top Headers: Dedicated Tier 2 (y = 31) & Tier 3 (y = 44)
    const col0Center = matrixX + size / 2;
    const col1Center = matrixX + size + size / 2;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Col 0 Header
    ctx.fillStyle = isLight ? "#1C1917" : "#FFFFFF";
    ctx.font = "bold 10px Inter, sans-serif";
    ctx.fillText("PRED: RETAINED", col0Center, 31);
    ctx.font = "9px Inter, sans-serif";
    ctx.fillStyle = isLight ? "#78716C" : "#94A3B8";
    ctx.fillText("(Negative Class 0)", col0Center, 44);

    // Col 1 Header
    ctx.fillStyle = isLight ? "#1C1917" : "#FFFFFF";
    ctx.font = "bold 10px Inter, sans-serif";
    ctx.fillText("PRED: CHURN", col1Center, 31);
    ctx.font = "9px Inter, sans-serif";
    ctx.fillStyle = isLight ? "#78716C" : "#94A3B8";
    ctx.fillText("(Positive Class 1)", col1Center, 44);

    // 4. Row Left Headers (Actual Class): Right-aligned at matrixX - 12 (at least 20px buffer from rotated axis)
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const row0Center = matrixY + size / 2;
    ctx.fillStyle = isLight ? "#1C1917" : "#FFFFFF";
    ctx.font = "bold 10px Inter, sans-serif";
    ctx.fillText("ACTUAL: RET", matrixX - 12, row0Center - 8);
    ctx.font = "9px Inter, sans-serif";
    ctx.fillStyle = isLight ? "#78716C" : "#94A3B8";
    ctx.fillText("(Class 0)", matrixX - 12, row0Center + 8);

    const row1Center = matrixY + size + size / 2;
    ctx.fillStyle = isLight ? "#1C1917" : "#FFFFFF";
    ctx.font = "bold 10px Inter, sans-serif";
    ctx.fillText("ACTUAL: CHURN", matrixX - 12, row1Center - 8);
    ctx.font = "9px Inter, sans-serif";
    ctx.fillStyle = isLight ? "#78716C" : "#94A3B8";
    ctx.fillText("(Class 1)", matrixX - 12, row1Center + 8);

    // Draw Matrix Cells (Tier 4: Starts at matrixY >= 56)
    cells.forEach(cell => {
      const x = matrixX + cell.c * size;
      const y = matrixY + cell.r * size;

      ctx.fillStyle = cell.color;
      ctx.beginPath();
      ctx.roundRect(x + 4, y + 4, size - 8, size - 8, 8);
      ctx.fill();
      ctx.strokeStyle = isLight ? "#E7E0D5" : "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      ctx.stroke();

      const cx = x + size / 2;
      const cy = y + size / 2;

      // Big Number
      const numFontSize = Math.min(22, Math.max(16, Math.round(size * 0.22)));
      ctx.fillStyle = cell.text;
      ctx.font = `bold ${numFontSize}px Outfit, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(cell.val.toLocaleString(), cx, cy - size * 0.14);

      // Clean Title with Tag (e.g. "True Retained (TN)")
      const titleFontSize = Math.min(10.5, Math.max(9, Math.round(size * 0.105)));
      ctx.font = `bold ${titleFontSize}px Inter, sans-serif`;
      ctx.fillText(`${cell.title} (${cell.code})`, cx, cy + size * 0.08);

      // Cohort percentage on dedicated line
      const pct = ((cell.val / total) * 100).toFixed(1);
      ctx.fillStyle = isLight ? "#57534E" : "#94A3B8";
      const pctFontSize = Math.min(10, Math.max(8.5, Math.round(size * 0.095)));
      ctx.font = `${pctFontSize}px Inter, sans-serif`;
      ctx.fillText(`${pct}% of cohort`, cx, cy + size * 0.23);
    });

    // Dedicated Legend Row at Bottom of Confusion Matrix (Tier 5)
    const legendY = height - 10;
    const legItems = [
      { text: "True Retained (TN)", color: isLight ? "#0369A1" : "#38BDF8" },
      { text: "False Churn (FP)", color: isLight ? "#B45309" : "#F59E0B" },
      { text: "Missed Churn (FN)", color: isLight ? "#B91C1C" : "#EF4444" },
      { text: "True Churn (TP)", color: isLight ? "#15803D" : "#10B981" }
    ];
    const itemStep = width / 4;
    ctx.font = "9.5px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    legItems.forEach((item, idx) => {
      const ix = idx * itemStep + itemStep / 2;
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.roundRect(ix - ctx.measureText(item.text).width / 2 - 12, legendY - 4, 8, 8, 2);
      ctx.fill();
      ctx.fillStyle = isLight ? "#57534E" : "#94A3B8";
      ctx.fillText(item.text, ix, legendY);
    });
  }

  static drawCalibrationCurve(canvasId, options) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const { ctx, width, height } = this.getRetinaContext(canvas);
    if (!ctx || width <= 10 || height <= 10) return;
    const theme = this.getThemeColors();

    const padding = { top: 30, right: 35, bottom: 42, left: 55 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const bins = options.bins || [];
    if (!bins.length) return;

    ctx.clearRect(0, 0, width, height);

    // Grid lines for 0.0, 0.2, 0.4, 0.6, 0.8, 1.0
    ctx.strokeStyle = theme.grid;
    ctx.fillStyle = theme.text;
    ctx.font = "11px Inter, sans-serif";
    ctx.textAlign = "right";

    for (let i = 0; i <= 5; i++) {
      const frac = i / 5;
      const y = padding.top + chartH - frac * chartH;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.fillText(`${(frac * 100).toFixed(0)}%`, padding.left - 8, y + 4);
    }

    // X Axis labels
    ctx.textAlign = "center";
    for (let i = 0; i <= 5; i++) {
      const frac = i / 5;
      const x = padding.left + frac * chartW;
      ctx.fillText(`${(frac * 100).toFixed(0)}%`, x, height - padding.bottom + 18);
    }

    // Axis Titles
    ctx.fillStyle = theme.textDim;
    ctx.font = "10px Inter, sans-serif";
    ctx.fillText("PREDICTED CHURN PROBABILITY", padding.left + chartW / 2, height - 8);

    ctx.save();
    ctx.translate(14, padding.top + chartH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText("EMPIRICAL CHURN RATE", 0, 0);
    ctx.restore();

    // 1. Draw Perfect Calibration Reference Line (Dashed 45 deg)
    ctx.save();
    ctx.strokeStyle = this.isLightTheme() ? "#A8A29E" : "#64748B";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartH);
    ctx.lineTo(padding.left + chartW, padding.top);
    ctx.stroke();
    ctx.restore();

    // 2. Draw Model Calibration Line
    ctx.strokeStyle = "#4F46E5";
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    const points = bins.map(b => {
      const pred = Math.min(Math.max(b.mean_predicted || b.bin_center, 0.0), 1.0);
      const actual = Math.min(Math.max(b.actual_churn_rate, 0.0), 1.0);
      return {
        x: padding.left + pred * chartW,
        y: padding.top + chartH - actual * chartH,
        pred,
        actual
      };
    });

    points.forEach((p, idx) => {
      if (idx === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    // 3. Draw Dots on points
    points.forEach(p => {
      ctx.fillStyle = "#4F46E5";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // 4. Legend
    ctx.textAlign = "right";
    ctx.font = "10px Inter, sans-serif";

    const modelName = options.modelName || "Hybrid ANN-LSTM";
    ctx.fillStyle = theme.text;
    ctx.fillText(`${modelName} Model Curve`, width - padding.right, 16);
    const modW = ctx.measureText(`${modelName} Model Curve`).width;
    ctx.fillStyle = "#4F46E5";
    ctx.beginPath();
    ctx.arc(width - padding.right - modW - 10, 13, 4, 0, Math.PI * 2);
    ctx.fill();

    const refText = "Ideal (y = x)";
    const refX = width - padding.right - modW - 28;
    ctx.fillStyle = theme.textDim;
    ctx.fillText(refText, refX, 16);
    const refW = ctx.measureText(refText).width;
    ctx.save();
    ctx.strokeStyle = this.isLightTheme() ? "#A8A29E" : "#64748B";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(refX - refW - 16, 13);
    ctx.lineTo(refX - refW - 4, 13);
    ctx.stroke();
    ctx.restore();

    // Attach interactive hover listener
    this.attachHoverListeners(canvas);
    canvas._chartHoverHandler = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      let closest = null;
      let minD = Infinity;
      points.forEach((p, idx) => {
        const d = Math.hypot(p.x - mouseX, p.y - mouseY);
        if (d < minD && d < 36) {
          minD = d;
          closest = { p, b: bins[idx], idx };
        }
      });

      if (closest) {
        const b = closest.b;
        const predPct = ((b.mean_predicted || b.bin_center) * 100).toFixed(1);
        const actPct = ((b.actual_churn_rate) * 100).toFixed(1);
        MiniCharts.showTooltip(e, `Bin #${closest.idx + 1} (${predPct}% Pred)`, [
          { color: "#4F46E5", label: "Model Empirical Churn", val: `${actPct}%` },
          { color: "#A8A29E", label: "Ideal Calibration", val: `${predPct}%` },
          { color: "var(--text-dim)", label: "Sample Count", val: (b.count || 0).toLocaleString() }
        ]);
      } else {
        MiniCharts.hideTooltip();
      }
    };
    canvas._chartLeaveHandler = () => {
      MiniCharts.hideTooltip();
    };
  }
}

window.MiniCharts = MiniCharts;
