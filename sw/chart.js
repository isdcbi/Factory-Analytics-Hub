(function () {
  "use strict";

  // Zoom CSS efektif elemen (skala tampilan portal), 1 bila tidak ada.
  function cssZoom(el) {
    if (el && typeof el.currentCSSZoom === "number" && el.currentCSSZoom > 0) {
      return el.currentCSSZoom;
    }
    var width = el ? el.offsetWidth : 0;
    return width ? (el.getBoundingClientRect().width / width) || 1 : 1;
  }

  function getCanvasContext(canvas) {
    // Sinkronkan ukuran canvas dengan ukuran elemen aktual (responsive).
    // Koordinat gambar memakai ukuran layout (px CSS, belum di-zoom) supaya teks chart
    // ikut skala tampilan; resolusi canvas dikali zoom agar tetap tajam.
    var zoom = cssZoom(canvas);
    var layoutWidth = canvas.clientWidth || canvas.getBoundingClientRect().width / zoom;
    var layoutHeight = canvas.clientHeight || canvas.getBoundingClientRect().height / zoom;
    var width = Math.max(300, Math.floor(layoutWidth || canvas.width || 900));
    var height = Math.max(240, Math.floor(layoutHeight || canvas.height || 320));
    var dpr = (window.devicePixelRatio || 1) * zoom;
    // Canvas tanpa tinggi CSS mengikuti atribut height; kunci tingginya agar tidak berubah tiap redraw.
    var followsAttribute = !canvas.style.height && canvas.clientHeight === canvas.height;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    if (followsAttribute) {
      canvas.style.height = height + "px";
    }

    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    return {
      ctx: ctx,
      width: width,
      height: height
    };
  }

  function drawAxes(ctx, width, height, padding) {
    ctx.strokeStyle = "#91a1ae";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();
  }

  function drawGrid(ctx, width, height, padding, steps) {
    var gridSteps = steps || 5;
    var usableHeight = height - padding.top - padding.bottom;
    ctx.strokeStyle = "rgba(100, 122, 138, 0.22)";
    ctx.lineWidth = 1;

    for (var i = 1; i <= gridSteps; i += 1) {
      var y = padding.top + (usableHeight * i) / gridSteps;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }
  }

  function drawLegend(ctx, series, startX, y) {
    var x = startX;
    ctx.font = "12px Bahnschrift, Segoe UI, sans-serif";

    series.forEach(function (item) {
      ctx.fillStyle = item.color;
      ctx.fillRect(x, y - 10, 12, 12);
      ctx.fillStyle = "#243443";
      ctx.fillText(item.name, x + 18, y);
      x += ctx.measureText(item.name).width + 40;
    });
  }

  function drawLineChart(canvas, labels, series, options) {
    if (!canvas) {
      return;
    }

    var prepared = getCanvasContext(canvas);
    var ctx = prepared.ctx;
    var width = prepared.width;
    var height = prepared.height;
    var padding = {
      top: 40,
      right: 30,
      bottom: 50,
      left: 56
    };

    if (!Array.isArray(labels) || labels.length === 0 || !Array.isArray(series) || series.length === 0) {
      ctx.fillStyle = "#566775";
      ctx.font = "14px Bahnschrift, Segoe UI, sans-serif";
      ctx.fillText("Data chart belum tersedia.", 22, 30);
      return;
    }

    // Cari nilai tertinggi untuk skala sumbu Y.
    var maxValue = 0;
    series.forEach(function (row) {
      (row.values || []).forEach(function (value) {
        maxValue = Math.max(maxValue, Number(value) || 0);
      });
    });
    maxValue = Math.max(maxValue, Number((options && options.minMax) || 0), 1);

    drawGrid(ctx, width, height, padding, 5);
    drawAxes(ctx, width, height, padding);
    drawLegend(ctx, series, padding.left, 24);

    var chartWidth = width - padding.left - padding.right;
    var chartHeight = height - padding.top - padding.bottom;
    var count = labels.length;
    var xStep = count > 1 ? chartWidth / (count - 1) : chartWidth;

    ctx.fillStyle = "#435564";
    ctx.font = "11px Bahnschrift, Segoe UI, sans-serif";

    for (var t = 0; t <= 5; t += 1) {
      var yValue = maxValue - (maxValue * t) / 5;
      var y = padding.top + (chartHeight * t) / 5;
      ctx.fillText(String(Math.round(yValue)), 10, y + 4);
    }

    labels.forEach(function (label, i) {
      var x = padding.left + i * xStep;
      var text = String(label);
      ctx.save();
      ctx.translate(x, height - padding.bottom + 14);
      ctx.rotate(-0.35);
      ctx.fillText(text.length > 12 ? text.slice(0, 12) + "…" : text, 0, 0);
      ctx.restore();
    });

    series.forEach(function (item) {
      var values = item.values || [];
      ctx.strokeStyle = item.color;
      ctx.fillStyle = item.color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      values.forEach(function (value, i) {
        var x = padding.left + i * xStep;
        var safeValue = Number(value) || 0;
        var y = padding.top + chartHeight - (safeValue / maxValue) * chartHeight;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      values.forEach(function (value, i) {
        var x = padding.left + i * xStep;
        var safeValue = Number(value) || 0;
        var y = padding.top + chartHeight - (safeValue / maxValue) * chartHeight;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  }

  function drawYamazumiChart(canvas, bars, taktTime, options) {
    if (!canvas) {
      return;
    }

    var config = options || {};
    var stacked = Boolean(config.stacked);
    var stackOrder = [
      { key: "value", label: "Value", color: "#1de64f" },
      { key: "nonValue", label: "Non Value", color: "#f5eb2f" },
      { key: "walking", label: "Walking", color: "#87dff7" },
      { key: "irregular", label: "Irregular", color: "#bb63d8" }
    ];

    function getStackTotal(bar) {
      var stacks = bar.stacks || {};
      return stackOrder.reduce(function (sum, item) {
        return sum + (Number(stacks[item.key]) || 0);
      }, 0);
    }

    function splitLabel(text, maxCharsPerLine, maxLines) {
      var words = String(text || "").trim().split(/\s+/).filter(Boolean);
      if (!words.length) {
        return [""];
      }

      var lines = [];
      var currentLine = "";

      words.forEach(function (word) {
        var candidate = currentLine ? currentLine + " " + word : word;
        if (candidate.length <= maxCharsPerLine || !currentLine) {
          currentLine = candidate;
          return;
        }
        lines.push(currentLine);
        currentLine = word;
      });

      if (currentLine) {
        lines.push(currentLine);
      }

      if (lines.length > maxLines) {
        lines = lines.slice(0, maxLines);
        var lastIndex = lines.length - 1;
        if (lines[lastIndex].length > maxCharsPerLine - 3) {
          lines[lastIndex] = lines[lastIndex].slice(0, Math.max(1, maxCharsPerLine - 3));
        }
        lines[lastIndex] += "...";
      }

      return lines;
    }

    function shortenLabel(text, maxChars) {
      var label = String(text || "").trim();
      if (label.length <= maxChars) {
        return label;
      }
      return label.slice(0, Math.max(1, maxChars - 3)) + "...";
    }

    function getNiceScale(maxValue) {
      var safeMax = Math.max(1, Number(maxValue) || 0);
      var step = safeMax <= 25 ? 5 : 10;
      var roundedMax = Math.ceil(safeMax / step) * step;
      return {
        step: step,
        max: Math.max(step, roundedMax),
        gridSteps: Math.max(1, Math.ceil(roundedMax / step))
      };
    }

    var prepared = getCanvasContext(canvas);
    var ctx = prepared.ctx;
    var width = prepared.width;
    var height = prepared.height;
    var padding = {
      top: 38,
      right: 52,
      bottom: 74,
      left: 78
    };

    if (!Array.isArray(bars) || bars.length === 0) {
      ctx.fillStyle = "#566775";
      ctx.font = "14px Bahnschrift, Segoe UI, sans-serif";
      ctx.fillText("Data Yamazumi belum tersedia.", 22, 30);
      return;
    }

    var maxBar = 1;
    bars.forEach(function (bar) {
      var stackTotal = Number(bar.total) || getStackTotal(bar);
      var baseValue = stackTotal > 0 ? stackTotal : (Number(bar.value) || 0);
      maxBar = Math.max(maxBar, baseValue);
    });
    var safeTakt = Math.max(1, Number(taktTime) || 0);
    maxBar = Math.max(maxBar, safeTakt);
    var scale = getNiceScale(maxBar);
    maxBar = scale.max;
    var showStackLegend = bars.some(function (bar) {
      return (Number(bar.total) || getStackTotal(bar)) > 0;
    });
    var ttValueText = "TT: " + (Math.round(safeTakt * 100) / 100).toFixed(2);

    ctx.font = "12px Bahnschrift, Segoe UI, sans-serif";
    var ttValueWidth = ctx.measureText(ttValueText).width;
    padding.right = Math.max(72, Math.ceil(ttValueWidth) + 26);

    var chartWidth = width - padding.left - padding.right;
    var barWidth = Math.max(18, chartWidth / (bars.length * 1.55));
    var gap = Math.max(10, (chartWidth - barWidth * bars.length) / Math.max(1, bars.length + 1));
    var slotWidth = barWidth + gap;
    var labelMode = "horizontal";
    var wrappedMaxWidth = 0;
    var plainMaxWidth = 0;

    ctx.font = "10px Bahnschrift, Segoe UI, sans-serif";
    // Batas karakter per baris label mengikuti lebar slot bar agar label tidak saling tumpang.
    var avgCharWidth = ctx.measureText("abcdefghijklmnopqrstuvwxyz").width / 26;
    var wrapChars = Math.max(6, Math.min(bars.length > 20 ? 12 : 16, Math.floor((slotWidth - 4) / avgCharWidth)));
    bars.forEach(function (bar) {
      var labelText = String(bar.label || "");
      var wrappedLines = splitLabel(labelText, wrapChars, 3);
      plainMaxWidth = Math.max(plainMaxWidth, ctx.measureText(labelText).width);
      wrappedLines.forEach(function (line) {
        wrappedMaxWidth = Math.max(wrappedMaxWidth, ctx.measureText(line).width);
      });
    });

    if (config.labelMode) {
      labelMode = config.labelMode;
    } else {
      if (wrappedMaxWidth > slotWidth * 1.08 || bars.length > 16) {
        labelMode = "angled";
      }
      if (plainMaxWidth > slotWidth * 3.8 || bars.length > 30) {
        labelMode = "vertical";
      }
    }

    padding.bottom = labelMode === "horizontal" ? 74 : labelMode === "angled" ? 104 : 118;

    drawGrid(ctx, width, height, padding, scale.gridSteps);
    drawAxes(ctx, width, height, padding);

    var chartHeight = height - padding.top - padding.bottom;

    for (var i = 0; i <= scale.gridSteps; i += 1) {
      var yValue = maxBar - scale.step * i;
      var y = padding.top + (chartHeight * i) / scale.gridSteps;
      ctx.fillStyle = "#435564";
      ctx.font = "11px Bahnschrift, Segoe UI, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(String(Math.max(0, yValue)), padding.left - 10, y + 4);
    }
    ctx.textAlign = "left";

    ctx.save();
    ctx.translate(22, padding.top + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = "#32414f";
    ctx.font = "12px Bahnschrift, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Cycle Time (detik)", 0, 0);
    ctx.restore();

    if (showStackLegend) {
      ctx.font = "11px Bahnschrift, Segoe UI, sans-serif";
      var legendX = padding.left;
      var legendY = 22;
      stackOrder.forEach(function (item, idx) {
        var x = legendX + idx * 96;
        ctx.fillStyle = item.color;
        ctx.fillRect(x, legendY - 10, 14, 10);
        ctx.strokeStyle = "#32414f";
        ctx.strokeRect(x, legendY - 10, 14, 10);
        ctx.fillStyle = "#32414f";
        ctx.fillText(item.label, x + 20, legendY);
      });
    }

    var ttLegendLineStart = width - padding.right - 92;
    var ttLegendLineEnd = width - padding.right - 50;
    var ttLegendY = 16;
    ctx.strokeStyle = "#e53935";
    ctx.lineWidth = 2.2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(ttLegendLineStart, ttLegendY);
    ctx.lineTo(ttLegendLineEnd, ttLegendY);
    ctx.stroke();
    ctx.fillStyle = "#b21f1f";
    ctx.font = "12px Bahnschrift, Segoe UI, sans-serif";
    ctx.fillText("Takt Time", ttLegendLineEnd + 6, ttLegendY + 4);

    bars.forEach(function (bar, index) {
      var stackTotal = Number(bar.total) || getStackTotal(bar);
      var hasStacks = stackTotal > 0;
      var value = hasStacks ? stackTotal : (Number(bar.value) || 0);
      var x = padding.left + gap + index * (barWidth + gap);
      var bottomY = padding.top + chartHeight;
      var isOver = value > safeTakt;

      if (hasStacks) {
        var stacks = bar.stacks || {};
        ctx.lineWidth = stacked ? 0.55 : 0.8;
        stackOrder.forEach(function (item) {
          var segmentValue = Number(stacks[item.key]) || 0;
          if (segmentValue <= 0) {
            return;
          }
          var segmentHeight = (segmentValue / maxBar) * chartHeight;
          var y = bottomY - segmentHeight;
          ctx.fillStyle = item.color;
          ctx.fillRect(x, y, barWidth, segmentHeight);
          ctx.strokeStyle = "#33414d";
          ctx.strokeRect(x, y, barWidth, segmentHeight);
          bottomY = y;
        });
        ctx.lineWidth = 1;
      } else {
        var heightRatio = value / maxBar;
        var barHeight = heightRatio * chartHeight;
        var yBar = padding.top + chartHeight - barHeight;
        ctx.fillStyle = isOver ? "#e5675f" : "#5e6ad2";
        ctx.fillRect(x, yBar, barWidth, barHeight);
      }

      var topY = padding.top + chartHeight - (value / maxBar) * chartHeight;
      ctx.fillStyle = "#243443";
      ctx.font = "11px Bahnschrift, Segoe UI, sans-serif";
      ctx.fillText(String(Math.round(value)), x + 2, topY - 6);

      ctx.fillStyle = "#32414f";
      ctx.font = "10px Bahnschrift, Segoe UI, sans-serif";
      var labelAreaTop = height - padding.bottom;
      var labelCenterX = x + barWidth / 2;

      if (labelMode === "horizontal") {
        var labelLines = splitLabel(bar.label, wrapChars, 3);
        var labelBaseY = labelAreaTop + 14;
        ctx.textAlign = "center";
        labelLines.forEach(function (line, lineIndex) {
          ctx.fillText(line, labelCenterX, labelBaseY + lineIndex * 11);
        });
        ctx.textAlign = "left";
      } else if (labelMode === "angled") {
        ctx.save();
        ctx.translate(labelCenterX, labelAreaTop + 18);
        ctx.rotate(-Math.PI / 4);
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(shortenLabel(bar.label, bars.length > 24 ? 16 : 20), 0, 0);
        ctx.restore();
      } else {
        ctx.save();
        ctx.translate(labelCenterX, labelAreaTop + padding.bottom / 2 + 4);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(shortenLabel(bar.label, 18), 0, 0);
        ctx.restore();
      }
    });

    var taktY = padding.top + chartHeight - (safeTakt / maxBar) * chartHeight;
    ctx.strokeStyle = "#e53935";
    ctx.lineWidth = 2.2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(padding.left, taktY);
    ctx.lineTo(width - padding.right, taktY);
    ctx.stroke();

    ctx.fillStyle = "#b21f1f";
    ctx.font = "12px Bahnschrift, Segoe UI, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(ttValueText, width - 14, taktY - 8);
    ctx.textAlign = "left";
  }
  window.SWCharts = {
    cssZoom: cssZoom,
    drawLineChart: drawLineChart,
    drawYamazumiChart: drawYamazumiChart
  };
})();

