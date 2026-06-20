import { Drawing } from '@/lib/store/drawingStore';

export const parseTimeToUnix = (time: any): number => {
  if (time === null || time === undefined) return 0;
  if (typeof time === 'number') {
    if (isNaN(time)) return 0;
    return time > 1e11 ? Math.floor(time / 1000) : time;
  }
  if (typeof time === 'string') {
    if (!isNaN(Number(time))) {
      const num = Number(time);
      return num > 1e11 ? Math.floor(num / 1000) : num;
    }
    const date = new Date(time);
    const ts = Math.floor(date.getTime() / 1000);
    return isNaN(ts) ? 0 : ts;
  }
  if (typeof time === 'object') {
    if ('year' in time && 'month' in time && 'day' in time) {
      const date = new Date(Date.UTC(time.year, time.month - 1, time.day));
      const ts = Math.floor(date.getTime() / 1000);
      return isNaN(ts) ? 0 : ts;
    }
  }
  return 0;
};

export const distanceToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
  const l2 = (x1 - x2) ** 2 + (y1 - y2) ** 2;
  if (l2 === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt((px - (x1 + t * (x2 - x1))) ** 2 + (py - (y1 + t * (y2 - y1))) ** 2);
};

export const getCoordinateFromTime = (time: any, chart: any, candles: any[]): number | null => {
  let x = chart.timeScale().timeToCoordinate(time);
  if (x === null && candles && candles.length >= 2) {
    const last = candles[candles.length - 1];
    const prev = candles[candles.length - 2];
    const first = candles[0];
    const second = candles[1];
    
    const tUnix = parseTimeToUnix(time);
    const lastUnix = parseTimeToUnix(last.time);
    const prevUnix = parseTimeToUnix(prev.time);
    const firstUnix = parseTimeToUnix(first.time);
    const secondUnix = parseTimeToUnix(second.time);
    
    if (tUnix > lastUnix) {
      const dt = lastUnix - prevUnix;
      if (dt !== 0) {
        const logicalOffset = (tUnix - lastUnix) / dt;
        x = chart.timeScale().logicalToCoordinate((candles.length - 1) + logicalOffset);
      }
    } else if (tUnix < firstUnix) {
      const dt = secondUnix - firstUnix;
      if (dt !== 0) {
        const logicalOffset = (firstUnix - tUnix) / dt;
        x = chart.timeScale().logicalToCoordinate(0 - logicalOffset);
      }
    }
  }
  return x;
};

export const findClosestDrawingPoint = (
  x: number,
  y: number,
  drawings: Drawing[],
  chart: any,
  series: any,
  candles: any[]
): { id: string, pointIndex: number } | null => {
  let closest: { id: string, pointIndex: number } | null = null;
  let minDistance = 10; // 10 pixel threshold for grabbing a point

  drawings.forEach(d => {
    if (!d.points) return;
    d.points.forEach((pt, index) => {
      const sx = getCoordinateFromTime(pt.time as any, chart, candles);
      const sy = series.priceToCoordinate(pt.price);
      if (sx !== null && sy !== null) {
        const dist = Math.sqrt((x - sx)**2 + (y - sy)**2);
        if (dist < minDistance) {
          minDistance = dist;
          closest = { id: d.id, pointIndex: index };
        }
      }
    });
  });

  return closest;
};

export const findClosestDrawing = (
  x: number, 
  y: number, 
  drawings: Drawing[], 
  chart: any, 
  series: any,
  candles: any[]
): string | null => {
  let closestId: string | null = null;
  let minDistance = 15; // 15 pixel threshold for erasing/selecting

  drawings.forEach(d => {
    if (!d.points || d.points.length < 1) return;
    
    const screenPts = d.points.map(pt => {
      const sx = getCoordinateFromTime(pt.time as any, chart, candles);
      const sy = series.priceToCoordinate(pt.price);
      return { sx, sy };
    });

    let dist = Infinity;

    if (d.type === 'horizontal') {
      if (screenPts[0]?.sy !== null) dist = Math.abs(y - screenPts[0].sy);
    } else if (d.type === 'horizontalRay') {
      if (screenPts[0]?.sx !== null && screenPts[0]?.sy !== null) {
        if (x >= screenPts[0].sx - 15) {
          dist = Math.abs(y - screenPts[0].sy);
        } else {
          dist = Math.sqrt((x - screenPts[0].sx)**2 + (y - screenPts[0].sy)**2);
        }
      }
    } else if (d.type === 'vertical') {
      if (screenPts[0]?.sx !== null) dist = Math.abs(x - screenPts[0].sx);
    } else if (d.type === 'crossLine') {
      if (screenPts[0]?.sx !== null && screenPts[0]?.sy !== null) {
        dist = Math.min(Math.abs(x - screenPts[0].sx), Math.abs(y - screenPts[0].sy));
      }
    } else if (d.type === 'parallelChannel' && screenPts.length >= 3) {
      const { sx: x1, sy: y1 } = screenPts[0];
      const { sx: x2, sy: y2 } = screenPts[1];
      const { sx: x3, sy: y3 } = screenPts[2];
      if (x1 !== null && y1 !== null && x2 !== null && y2 !== null && x3 !== null && y3 !== null) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const x4 = x3 - dx;
        const y4 = y3 - dy;
        const d1 = distanceToSegment(x, y, x1, y1, x2, y2);
        const d2 = distanceToSegment(x, y, x3, y3, x4, y4);
        const d3 = distanceToSegment(x, y, x1, y1, x4, y4);
        const d4 = distanceToSegment(x, y, x2, y2, x3, y3);
        dist = Math.min(d1, d2, d3, d4);
        const minX = Math.min(x1, x2, x3, x4), maxX = Math.max(x1, x2, x3, x4);
        const minY = Math.min(y1, y2, y3, y4), maxY = Math.max(y1, y2, y3, y4);
        if (x >= minX && x <= maxX && y >= minY && y <= maxY) dist = Math.min(dist, 10);
      }
    } else if (['fib', 'fibExtension', 'pitchfork'].includes(d.type) && screenPts.length >= 2) {
      const { sx: x1, sy: y1 } = screenPts[0];
      const { sx: x2, sy: y2 } = screenPts[1];
      if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
        dist = distanceToSegment(x, y, x1, y1, x2, y2);
        const diff = y2 - y1;
        const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        levels.forEach(lvl => {
          const ly = y1 + diff * lvl;
          if (d.properties?.extendLine || (x >= minX && x <= maxX)) {
            dist = Math.min(dist, Math.abs(y - ly));
          } else {
            dist = Math.min(dist, Math.sqrt(Math.min((x - minX)**2, (x - maxX)**2) + (y - ly)**2));
          }
        });
        const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
        if (x >= minX && x <= maxX && y >= Math.min(minY, y1 + diff) && y <= Math.max(maxY, y1 + diff)) {
          dist = Math.min(dist, 10);
        }
      }
    } else if (['trend', 'ray', 'arrow', 'extendedLine', 'ruler', 'triangle', 'infoLine', 'trendAngle'].includes(d.type) && screenPts.length >= 2) {
      const { sx: x1, sy: y1 } = screenPts[0];
      const { sx: x2, sy: y2 } = screenPts[1];
      if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
        if (d.type === 'ray' || d.type === 'extendedLine') {
          const num = Math.abs((y2 - y1)*x - (x2 - x1)*y + x2*y1 - y2*x1);
          const den = Math.sqrt((y2 - y1)**2 + (x2 - x1)**2);
          if (den !== 0) {
            const lineDist = num / den;
            if (d.type === 'extendedLine') {
              dist = lineDist;
            } else {
              const dotProduct = (x - x1)*(x2 - x1) + (y - y1)*(y2 - y1);
              if (dotProduct >= 0 || Math.sqrt((x - x1)**2 + (y - y1)**2) < 15) {
                dist = lineDist;
              }
            }
          }
        } else {
          dist = distanceToSegment(x, y, x1, y1, x2, y2);
          if (d.type === 'triangle' && screenPts.length >= 3 && screenPts[2].sx !== null && screenPts[2].sy !== null) {
            const { sx: x3, sy: y3 } = screenPts[2];
            const d2 = distanceToSegment(x, y, x2, y2, x3, y3);
            const d3 = distanceToSegment(x, y, x3, y3, x1, y1);
            dist = Math.min(dist, d2, d3);
          }
        }
      }
    } else if (d.type === 'rectangle' && screenPts.length >= 2) {
      const { sx: x1, sy: y1 } = screenPts[0];
      const { sx: x2, sy: y2 } = screenPts[1];
      if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
        const d1 = distanceToSegment(x, y, x1, y1, x2, y1);
        const d2 = distanceToSegment(x, y, x2, y1, x2, y2);
        const d3 = distanceToSegment(x, y, x2, y2, x1, y2);
        const d4 = distanceToSegment(x, y, x1, y2, x1, y1);
        dist = Math.min(d1, d2, d3, d4);
        const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
        if (x >= minX && x <= maxX && y >= minY && y <= maxY) dist = Math.min(dist, 10);
      }
    } else if (d.type === 'ellipse' && screenPts.length >= 2) {
      const { sx: x1, sy: y1 } = screenPts[0];
      const { sx: x2, sy: y2 } = screenPts[1];
      if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
        const rx = Math.abs(x2 - x1) / 2;
        const ry = Math.abs(y2 - y1) / 2;
        const cx = Math.min(x1, x2) + rx;
        const cy = Math.min(y1, y2) + ry;
        if (rx > 0 && ry > 0) {
          const isInside = ((x - cx)**2) / (rx**2) + ((y - cy)**2) / (ry**2) <= 1;
          if (isInside) {
            dist = 5; // close enough to hit
          } else {
            // Rough distance to bounding box if outside
            dist = Math.sqrt((x - cx)**2 + (y - cy)**2) - Math.max(rx, ry);
          }
        }
      }
    } else if (d.type === 'curve' && screenPts.length >= 3) {
      const p1 = screenPts[0];
      const p2 = screenPts[1];
      const p3 = screenPts[2];
      if (p1.sx !== null && p1.sy !== null && p2.sx !== null && p2.sy !== null && p3.sx !== null && p3.sy !== null) {
        const d1 = distanceToSegment(x, y, p1.sx, p1.sy, p2.sx, p2.sy);
        const d2 = distanceToSegment(x, y, p2.sx, p2.sy, p3.sx, p3.sy);
        dist = Math.min(d1, d2);
      }
    } else if (['brush', 'path'].includes(d.type) && screenPts.length >= 2) {
      for (let i = 0; i < screenPts.length - 1; i++) {
        const p1 = screenPts[i];
        const p2 = screenPts[i+1];
        if (p1.sx !== null && p1.sy !== null && p2.sx !== null && p2.sy !== null) {
          const segDist = distanceToSegment(x, y, p1.sx, p1.sy, p2.sx, p2.sy);
          if (segDist < dist) dist = segDist;
        }
      }
    } else if (d.type === 'text' && screenPts.length >= 1) {
      const { sx, sy } = screenPts[0];
      if (sx !== null && sy !== null) {
        dist = Math.sqrt((x - sx)**2 + (y - sy)**2);
        if (x >= sx && x <= sx + 150 && y >= sy - 20 && y <= sy + 20) {
          dist = 0;
        }
      }
    } else if (screenPts.length >= 1) {
      const { sx, sy } = screenPts[0];
      if (sx !== null && sy !== null) {
        dist = Math.sqrt((x - sx)**2 + (y - sy)**2);
      }
    }

    if (dist < minDistance) {
      minDistance = dist;
      closestId = d.id;
    }
  });

  return closestId;
};
