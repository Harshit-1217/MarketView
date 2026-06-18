import { Drawing } from '@/lib/store/drawingStore';

export const distanceToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
  const l2 = (x1 - x2) ** 2 + (y1 - y2) ** 2;
  if (l2 === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt((px - (x1 + t * (x2 - x1))) ** 2 + (py - (y1 + t * (y2 - y1))) ** 2);
};

export const findClosestDrawing = (
  x: number, 
  y: number, 
  drawings: Drawing[], 
  chart: any, 
  series: any
): string | null => {
  let closestId: string | null = null;
  let minDistance = 15; // 15 pixel threshold for erasing/selecting

  drawings.forEach(d => {
    if (!d.points || d.points.length < 1) return;
    
    const screenPts = d.points.map(pt => {
      const sx = chart.timeScale().timeToCoordinate(pt.time as any);
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
    } else if (d.type === 'fib' && screenPts.length >= 2) {
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
          if (x >= minX && x <= maxX) {
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
    } else if (['trend', 'ray', 'arrow', 'extendedLine', 'ruler', 'triangle'].includes(d.type) && screenPts.length >= 2) {
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
    } else if (d.type === 'brush' && screenPts.length >= 2) {
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
