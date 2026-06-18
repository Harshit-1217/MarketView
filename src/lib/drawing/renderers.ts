import { Drawing, DrawingPoint } from '@/lib/store/drawingStore';

export const drawAllDrawings = (
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  activeDrawings: Drawing[],
  chart: any,
  mainSeries: any,
  areDrawingsHidden: boolean,
  isDrawing: boolean,
  drawingPoints: DrawingPoint[],
  activeTool: string | null,
  currentColor: string,
  currentWidth: number
) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (areDrawingsHidden) return;

  activeDrawings.forEach((drawing) => {
    ctx.strokeStyle = drawing.properties.color || '#2962ff';
    ctx.fillStyle = drawing.properties.color || '#2962ff';
    ctx.lineWidth = drawing.properties.width || 2;

    const points = drawing.points.map((pt) => {
      const x = chart.timeScale().timeToCoordinate(pt.time as any);
      const y = mainSeries.priceToCoordinate(pt.price);
      return { x, y };
    });

    // Draw depending on type
    if (drawing.type === 'trend' && points.length === 2) {
      const [p1, p2] = points;
      if (p1.x !== null && p1.y !== null && p2.x !== null && p2.y !== null) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, 4, 0, Math.PI * 2);
        ctx.arc(p2.x, p2.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (drawing.type === 'horizontal' && points.length >= 1) {
      const [p1] = points;
      if (p1.y !== null) {
        ctx.beginPath();
        ctx.moveTo(0, p1.y);
        ctx.lineTo(canvas.width, p1.y);
        ctx.stroke();
      }
    } else if (drawing.type === 'vertical' && points.length >= 1) {
      const [p1] = points;
      if (p1.x !== null) {
        ctx.beginPath();
        ctx.moveTo(p1.x, 0);
        ctx.lineTo(p1.x, canvas.height);
        ctx.stroke();
      }
    } else if (drawing.type === 'rectangle' && points.length === 2) {
      const [p1, p2] = points;
      if (p1.x !== null && p1.y !== null && p2.x !== null && p2.y !== null) {
        ctx.beginPath();
        ctx.rect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
        ctx.stroke();
        ctx.fillStyle = drawing.properties.fillColor || 'rgba(41, 98, 255, 0.15)';
        ctx.fill();
      }
    } else if (drawing.type === 'fib' && points.length === 2) {
      const [p1, p2] = points;
      if (p1.x !== null && p1.y !== null && p2.x !== null && p2.y !== null) {
        ctx.beginPath();
        ctx.strokeStyle = drawing.properties.color || '#787b86';
        ctx.lineWidth = drawing.properties.width || 1;
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
        const colors = ['#f23645', '#ff9800', '#4caf50', '#00bcd4', '#2196f3', '#9c27b0', '#787b86'];
        const diff = p2.y - p1.y;
        const priceDiff = drawing.points[1].price - drawing.points[0].price;

        levels.forEach((lvl, idx) => {
          const x1 = p1.x as number;
          const y1 = p1.y as number;
          const x2 = p2.x as number;
          const y = y1 + diff * lvl;
          ctx.strokeStyle = colors[idx];
          ctx.beginPath();
          ctx.moveTo(Math.min(x1, x2), y);
          ctx.lineTo(Math.max(x1, x2), y);
          ctx.stroke();

          ctx.fillStyle = colors[idx];
          ctx.font = '9px Arial';
          const priceVal = (drawing.points[0].price + priceDiff * lvl).toFixed(2);
          ctx.fillText(`Fib ${lvl} (${priceVal})`, Math.min(x1, x2) + 5, y - 4);
        });
      }
    } else if (drawing.type === 'text' && points.length >= 1) {
      const [p1] = points;
      if (p1.x !== null && p1.y !== null) {
        ctx.fillStyle = drawing.properties.color || '#fff';
        ctx.font = '12px Arial';
        ctx.fillText(drawing.properties.text || '', p1.x + 8, p1.y + 4);
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (drawing.type === 'ellipse' && points.length === 2) {
      const [p1, p2] = points;
      if (p1.x !== null && p1.y !== null && p2.x !== null && p2.y !== null) {
        const rx = Math.abs(p2.x - p1.x) / 2;
        const ry = Math.abs(p2.y - p1.y) / 2;
        const cx = Math.min(p1.x, p2.x) + rx;
        const cy = Math.min(p1.y, p2.y) + ry;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.fillStyle = drawing.properties.fillColor || 'rgba(41, 98, 255, 0.15)';
        ctx.fill();
      }
    } else if (drawing.type === 'ray' && points.length === 2) {
      const [p1, p2] = points;
      if (p1.x !== null && p1.y !== null && p2.x !== null && p2.y !== null) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        ctx.lineTo(p1.x + dx * 2000, p1.y + dy * 2000);
        ctx.stroke();
      }
    } else if (drawing.type === 'extendedLine' && points.length === 2) {
      const [p1, p2] = points;
      if (p1.x !== null && p1.y !== null && p2.x !== null && p2.y !== null) {
        ctx.beginPath();
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        ctx.moveTo(p1.x - dx * 2000, p1.y - dy * 2000);
        ctx.lineTo(p1.x + dx * 2000, p1.y + dy * 2000);
        ctx.stroke();
      }
    } else if (drawing.type === 'parallelChannel' && points.length === 3) {
      const [p1, p2, p3] = points;
      if (p1.x !== null && p1.y !== null && p2.x !== null && p2.y !== null && p3.x !== null && p3.y !== null) {
        ctx.beginPath();
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        ctx.moveTo(p1.x - dx * 2000, p1.y - dy * 2000);
        ctx.lineTo(p1.x + dx * 2000, p1.y + dy * 2000);
        ctx.stroke();

        const offsetX = p3.x - p1.x;
        const offsetY = p3.y - p1.y;

        ctx.beginPath();
        ctx.moveTo(p1.x + offsetX - dx * 2000, p1.y + offsetY - dy * 2000);
        ctx.lineTo(p1.x + offsetX + dx * 2000, p1.y + offsetY + dy * 2000);
        ctx.stroke();

        // Fill the channel
        ctx.beginPath();
        ctx.moveTo(p1.x - dx * 2000, p1.y - dy * 2000);
        ctx.lineTo(p1.x + dx * 2000, p1.y + dy * 2000);
        ctx.lineTo(p1.x + offsetX + dx * 2000, p1.y + offsetY + dy * 2000);
        ctx.lineTo(p1.x + offsetX - dx * 2000, p1.y + offsetY - dy * 2000);
        ctx.fillStyle = drawing.properties.fillColor || 'rgba(41, 98, 255, 0.15)';
        ctx.fill();
      }
    } else if (drawing.type === 'triangle' && points.length === 3) {
      const [p1, p2, p3] = points;
      if (p1.x !== null && p1.y !== null && p2.x !== null && p2.y !== null && p3.x !== null && p3.y !== null) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = drawing.properties.fillColor || 'rgba(41, 98, 255, 0.15)';
        ctx.fill();
      }
    } else if (drawing.type === 'ruler' && points.length === 2) {
      const [p1, p2] = points;
      if (p1.x !== null && p1.y !== null && p2.x !== null && p2.y !== null) {
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.setLineDash([]);
        
        const priceDiff = drawing.points[1].price - drawing.points[0].price;
        const pctDiff = (priceDiff / drawing.points[0].price) * 100;
        
        ctx.fillStyle = pctDiff >= 0 ? 'rgba(38, 166, 154, 0.9)' : 'rgba(239, 83, 80, 0.9)';
        ctx.font = '12px Arial';
        const text = `${priceDiff > 0 ? '+' : ''}${priceDiff.toFixed(2)} (${pctDiff.toFixed(2)}%)`;
        const textWidth = ctx.measureText(text).width;
        
        ctx.fillRect(p2.x + 10, p2.y - 15, textWidth + 12, 22);
        ctx.fillStyle = '#fff';
        ctx.fillText(text, p2.x + 16, p2.y);
      }
    } else if (drawing.type === 'arrow' && points.length === 2) {
      const [p1, p2] = points;
      if (p1.x !== null && p1.y !== null && p2.x !== null && p2.y !== null) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        ctx.beginPath();
        ctx.moveTo(p2.x, p2.y);
        ctx.lineTo(p2.x - 12 * Math.cos(angle - Math.PI / 6), p2.y - 12 * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(p2.x - 12 * Math.cos(angle + Math.PI / 6), p2.y - 12 * Math.sin(angle + Math.PI / 6));
        ctx.lineTo(p2.x, p2.y);
        ctx.fill();
      }
    } else if (drawing.type === 'brush' && points.length > 1) {
      ctx.beginPath();
      if (points[0].x !== null && points[0].y !== null) {
        ctx.moveTo(points[0].x as number, points[0].y as number);
        for (let i = 1; i < points.length; i++) {
          if (points[i].x !== null && points[i].y !== null) {
            ctx.lineTo(points[i].x as number, points[i].y as number);
          }
        }
        ctx.stroke();
      }
    } else if (drawing.type === 'horizontalRay' && points.length >= 1) {
      const [p1] = points;
      if (p1.x !== null && p1.y !== null) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(canvas.width, p1.y);
        ctx.stroke();
      }
    } else if (drawing.type === 'crossLine' && points.length >= 1) {
      const [p1] = points;
      if (p1.x !== null && p1.y !== null) {
        ctx.beginPath();
        ctx.moveTo(0, p1.y);
        ctx.lineTo(canvas.width, p1.y);
        ctx.moveTo(p1.x, 0);
        ctx.lineTo(p1.x, canvas.height);
        ctx.stroke();
      }
    } else if (drawing.type === 'infoLine' && points.length === 2) {
      const [p1, p2] = points;
      if (p1.x !== null && p1.y !== null && p2.x !== null && p2.y !== null) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        
        const priceDiff = drawing.points[1].price - drawing.points[0].price;
        const pctDiff = (priceDiff / drawing.points[0].price) * 100;
        const angle = -Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
        
        ctx.fillStyle = 'rgba(13, 17, 23, 0.8)';
        ctx.font = '12px Arial';
        const text1 = `${priceDiff > 0 ? '+' : ''}${priceDiff.toFixed(2)} (${pctDiff.toFixed(2)}%)`;
        const text2 = `${angle.toFixed(1)}°`;
        const textWidth = Math.max(ctx.measureText(text1).width, ctx.measureText(text2).width);
        
        ctx.fillRect(p2.x + 10, p2.y - 15, textWidth + 12, 36);
        ctx.fillStyle = drawing.properties.color || '#2962ff';
        ctx.fillText(text1, p2.x + 16, p2.y);
        ctx.fillText(text2, p2.x + 16, p2.y + 16);
      }
    } else if (drawing.type === 'trendAngle' && points.length === 2) {
      const [p1, p2] = points;
      if (p1.x !== null && p1.y !== null && p2.x !== null && p2.y !== null) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p1.y);
        ctx.stroke();
        ctx.setLineDash([]);
        
        const angleRad = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const angleDeg = -angleRad * 180 / Math.PI;
        
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, 30, angleRad < 0 ? angleRad : 0, angleRad < 0 ? 0 : angleRad, angleRad < 0);
        ctx.stroke();
        
        ctx.fillStyle = drawing.properties.color || '#2962ff';
        ctx.font = '12px Arial';
        ctx.fillText(`${angleDeg.toFixed(1)}°`, p2.x + 10, p2.y);
      }
    } else if (drawing.type === 'path' && points.length >= 2) {
      ctx.beginPath();
      if (points[0].x !== null && points[0].y !== null) {
        ctx.moveTo(points[0].x as number, points[0].y as number);
        for (let i = 1; i < points.length; i++) {
          if (points[i].x !== null && points[i].y !== null) {
            ctx.lineTo(points[i].x as number, points[i].y as number);
          }
        }
        ctx.stroke();
      }
    } else if (drawing.type === 'curve' && points.length === 3) {
      const [p1, p2, p3] = points;
      if (p1.x !== null && p1.y !== null && p2.x !== null && p2.y !== null && p3.x !== null && p3.y !== null) {
        ctx.beginPath();
        ctx.moveTo(p1.x as number, p1.y as number);
        ctx.quadraticCurveTo(p2.x as number, p2.y as number, p3.x as number, p3.y as number);
        ctx.stroke();
      }
    }
  });

  // Draw active drawing in progress
  if (isDrawing && drawingPoints.length > 0) {
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentWidth;
    ctx.fillStyle = currentColor;

    const p1 = {
      x: chart.timeScale().timeToCoordinate(drawingPoints[0].time as any),
      y: mainSeries.priceToCoordinate(drawingPoints[0].price),
    };

    if (p1.x !== null && p1.y !== null) {
      if (activeTool === 'trend' && drawingPoints.length === 2) {
        const p2 = {
          x: chart.timeScale().timeToCoordinate(drawingPoints[1].time as any),
          y: mainSeries.priceToCoordinate(drawingPoints[1].price),
        };
        if (p2.x !== null && p2.y !== null) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      } else if (activeTool === 'rectangle' && drawingPoints.length === 2) {
        const p2 = {
          x: chart.timeScale().timeToCoordinate(drawingPoints[1].time as any),
          y: mainSeries.priceToCoordinate(drawingPoints[1].price),
        };
        if (p2.x !== null && p2.y !== null) {
          ctx.beginPath();
          ctx.rect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
          ctx.stroke();
        }
      } else if (activeTool === 'fib' && drawingPoints.length === 2) {
        const p2 = {
          x: chart.timeScale().timeToCoordinate(drawingPoints[1].time as any),
          y: mainSeries.priceToCoordinate(drawingPoints[1].price),
        };
        if (p2.x !== null && p2.y !== null) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      } else if (activeTool === 'ellipse' && drawingPoints.length === 2) {
        const p2 = {
          x: chart.timeScale().timeToCoordinate(drawingPoints[1].time as any),
          y: mainSeries.priceToCoordinate(drawingPoints[1].price),
        };
        if (p2.x !== null && p2.y !== null) {
          const rx = Math.abs(p2.x - p1.x) / 2;
          const ry = Math.abs(p2.y - p1.y) / 2;
          const cx = Math.min(p1.x, p2.x) + rx;
          const cy = Math.min(p1.y, p2.y) + ry;
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
          ctx.stroke();
        }
      } else if (activeTool === 'ray' && drawingPoints.length === 2) {
        const p2 = {
          x: chart.timeScale().timeToCoordinate(drawingPoints[1].time as any),
          y: mainSeries.priceToCoordinate(drawingPoints[1].price),
        };
        if (p2.x !== null && p2.y !== null) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          ctx.lineTo(p1.x + dx * 1000, p1.y + dy * 1000);
          ctx.stroke();
        }
      } else if (activeTool === 'arrow' && drawingPoints.length === 2) {
        const p2 = {
          x: chart.timeScale().timeToCoordinate(drawingPoints[1].time as any),
          y: mainSeries.priceToCoordinate(drawingPoints[1].price),
        };
        if (p2.x !== null && p2.y !== null) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
          const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
          ctx.beginPath();
          ctx.moveTo(p2.x, p2.y);
          ctx.lineTo(p2.x - 12 * Math.cos(angle - Math.PI / 6), p2.y - 12 * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(p2.x - 12 * Math.cos(angle + Math.PI / 6), p2.y - 12 * Math.sin(angle + Math.PI / 6));
          ctx.lineTo(p2.x, p2.y);
          ctx.fill();
        }
      } else if (activeTool === 'extendedLine' && drawingPoints.length === 2) {
        const p2 = {
          x: chart.timeScale().timeToCoordinate(drawingPoints[1].time as any),
          y: mainSeries.priceToCoordinate(drawingPoints[1].price),
        };
        if (p2.x !== null && p2.y !== null) {
          ctx.beginPath();
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          ctx.moveTo(p1.x - dx * 2000, p1.y - dy * 2000);
          ctx.lineTo(p1.x + dx * 2000, p1.y + dy * 2000);
          ctx.stroke();
        }
      } else if (activeTool === 'infoLine' && drawingPoints.length === 2) {
        const p2 = {
          x: chart.timeScale().timeToCoordinate(drawingPoints[1].time as any),
          y: mainSeries.priceToCoordinate(drawingPoints[1].price),
        };
        if (p2.x !== null && p2.y !== null) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      } else if (activeTool === 'trendAngle' && drawingPoints.length === 2) {
        const p2 = {
          x: chart.timeScale().timeToCoordinate(drawingPoints[1].time as any),
          y: mainSeries.priceToCoordinate(drawingPoints[1].price),
        };
        if (p2.x !== null && p2.y !== null) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.setLineDash([4, 4]);
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p1.y);
          ctx.stroke();
          ctx.setLineDash([]);
          
          const angleRad = Math.atan2(p2.y - p1.y, p2.x - p1.x);
          ctx.beginPath();
          ctx.arc(p1.x, p1.y, 30, angleRad < 0 ? angleRad : 0, angleRad < 0 ? 0 : angleRad, angleRad < 0);
          ctx.stroke();
        }
      } else if (activeTool === 'path' && drawingPoints.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(p1.x as number, p1.y as number);
        for (let i = 1; i < drawingPoints.length; i++) {
          const pNext = {
            x: chart.timeScale().timeToCoordinate(drawingPoints[i].time as any),
            y: mainSeries.priceToCoordinate(drawingPoints[i].price),
          };
          if (pNext.x !== null && pNext.y !== null) {
            ctx.lineTo(pNext.x as number, pNext.y as number);
          }
        }
        ctx.stroke();
      } else if (activeTool === 'curve' && (drawingPoints.length === 2 || drawingPoints.length === 3)) {
        const p2 = {
          x: chart.timeScale().timeToCoordinate(drawingPoints[1].time as any),
          y: mainSeries.priceToCoordinate(drawingPoints[1].price),
        };
        if (drawingPoints.length === 2 && p2.x !== null && p2.y !== null) {
          ctx.beginPath();
          ctx.moveTo(p1.x as number, p1.y as number);
          ctx.lineTo(p2.x as number, p2.y as number);
          ctx.stroke();
        } else if (drawingPoints.length === 3) {
          const p3 = {
            x: chart.timeScale().timeToCoordinate(drawingPoints[2].time as any),
            y: mainSeries.priceToCoordinate(drawingPoints[2].price),
          };
          if (p2.x !== null && p2.y !== null && p3.x !== null && p3.y !== null) {
            ctx.beginPath();
            ctx.moveTo(p1.x as number, p1.y as number);
            ctx.quadraticCurveTo(p2.x as number, p2.y as number, p3.x as number, p3.y as number);
            ctx.stroke();
          }
        }
      } else if (activeTool === 'parallelChannel' && (drawingPoints.length === 2 || drawingPoints.length === 3)) {
        const p2 = {
          x: chart.timeScale().timeToCoordinate(drawingPoints[1].time as any),
          y: mainSeries.priceToCoordinate(drawingPoints[1].price),
        };
        if (p2.x !== null && p2.y !== null) {
          ctx.beginPath();
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          ctx.moveTo(p1.x - dx * 2000, p1.y - dy * 2000);
          ctx.lineTo(p1.x + dx * 2000, p1.y + dy * 2000);
          ctx.stroke();

          if (drawingPoints.length === 3) {
            const p3 = {
              x: chart.timeScale().timeToCoordinate(drawingPoints[2].time as any),
              y: mainSeries.priceToCoordinate(drawingPoints[2].price),
            };
            if (p3.x !== null && p3.y !== null) {
              const offsetX = p3.x - p1.x;
              const offsetY = p3.y - p1.y;
              ctx.beginPath();
              ctx.moveTo(p1.x + offsetX - dx * 2000, p1.y + offsetY - dy * 2000);
              ctx.lineTo(p1.x + offsetX + dx * 2000, p1.y + offsetY + dy * 2000);
              ctx.stroke();

              ctx.beginPath();
              ctx.moveTo(p1.x - dx * 2000, p1.y - dy * 2000);
              ctx.lineTo(p1.x + dx * 2000, p1.y + dy * 2000);
              ctx.lineTo(p1.x + offsetX + dx * 2000, p1.y + offsetY + dy * 2000);
              ctx.lineTo(p1.x + offsetX - dx * 2000, p1.y + offsetY - dy * 2000);
              ctx.fillStyle = 'rgba(41, 98, 255, 0.15)';
              ctx.fill();
            }
          }
        }
      } else if (activeTool === 'triangle' && (drawingPoints.length === 2 || drawingPoints.length === 3)) {
        const p2 = {
          x: chart.timeScale().timeToCoordinate(drawingPoints[1].time as any),
          y: mainSeries.priceToCoordinate(drawingPoints[1].price),
        };
        if (p2.x !== null && p2.y !== null) {
          if (drawingPoints.length === 2) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          } else if (drawingPoints.length === 3) {
            const p3 = {
              x: chart.timeScale().timeToCoordinate(drawingPoints[2].time as any),
              y: mainSeries.priceToCoordinate(drawingPoints[2].price),
            };
            if (p3.x !== null && p3.y !== null) {
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.lineTo(p3.x, p3.y);
              ctx.closePath();
              ctx.stroke();
              ctx.fillStyle = 'rgba(41, 98, 255, 0.15)';
              ctx.fill();
            }
          }
        }
      } else if (activeTool === 'ruler' && drawingPoints.length === 2) {
        const p2 = {
          x: chart.timeScale().timeToCoordinate(drawingPoints[1].time as any),
          y: mainSeries.priceToCoordinate(drawingPoints[1].price),
        };
        if (p2.x !== null && p2.y !== null) {
          ctx.beginPath();
          ctx.setLineDash([4, 4]);
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
          ctx.setLineDash([]);
          
          const priceDiff = drawingPoints[1].price - drawingPoints[0].price;
          const pctDiff = (priceDiff / drawingPoints[0].price) * 100;
          ctx.fillStyle = pctDiff >= 0 ? 'rgba(38, 166, 154, 0.9)' : 'rgba(239, 83, 80, 0.9)';
          ctx.font = '12px Arial';
          const text = `${priceDiff > 0 ? '+' : ''}${priceDiff.toFixed(2)} (${pctDiff.toFixed(2)}%)`;
          const textWidth = ctx.measureText(text).width;
          ctx.fillRect(p2.x + 10, p2.y - 15, textWidth + 12, 22);
          ctx.fillStyle = '#fff';
          ctx.fillText(text, p2.x + 16, p2.y);
        }
      } else if (activeTool === 'brush' && drawingPoints.length > 1) {
        ctx.beginPath();
        ctx.moveTo(p1.x as number, p1.y as number);
        for (let i = 1; i < drawingPoints.length; i++) {
          const pt = {
            x: chart.timeScale().timeToCoordinate(drawingPoints[i].time as any),
            y: mainSeries.priceToCoordinate(drawingPoints[i].price),
          };
          if (pt.x !== null && pt.y !== null) {
            ctx.lineTo(pt.x as number, pt.y as number);
          }
        }
        ctx.stroke();
      }
    }
  }
};
