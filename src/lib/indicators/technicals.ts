import { Candle } from '../market/client';

export interface SingleValuePoint {
  time: number;
  value: number;
}

export interface BBPoint {
  time: number;
  upper: number;
  middle: number;
  lower: number;
}

export interface MACDPoint {
  time: number;
  macd: number;
  signal: number;
  histogram: number;
}

export interface StochRSIPoint {
  time: number;
  k: number;
  d: number;
}

export interface IchimokuPoint {
  time: number;
  tenkan: number;
  kijun: number;
  senkouA: number;
  senkouB: number;
}

/** 1. Simple Moving Average */
export function calculateSMA(data: Candle[], period: number): SingleValuePoint[] {
  const result: SingleValuePoint[] = [];
  if (data.length < period) return result;
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) sum += data[i - j].close;
    result.push({ time: data[i].time, value: sum / period });
  }
  return result;
}

/** 2. Exponential Moving Average */
export function calculateEMA(data: Candle[], period: number): SingleValuePoint[] {
  const result: SingleValuePoint[] = [];
  if (data.length < period) return result;
  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i].close;
  let prevEma = sum / period;
  result.push({ time: data[period - 1].time, value: prevEma });
  for (let i = period; i < data.length; i++) {
    const currentEma = (data[i].close - prevEma) * k + prevEma;
    result.push({ time: data[i].time, value: currentEma });
    prevEma = currentEma;
  }
  return result;
}

/** 3. Weighted Moving Average */
export function calculateWMA(data: Candle[], period: number): SingleValuePoint[] {
  const result: SingleValuePoint[] = [];
  if (data.length < period) return result;
  const denominator = (period * (period + 1)) / 2;
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close * (period - j);
    }
    result.push({ time: data[i].time, value: sum / denominator });
  }
  return result;
}

/** 4. Hull Moving Average */
export function calculateHMA(data: Candle[], period: number): SingleValuePoint[] {
  const halfPeriod = Math.floor(period / 2);
  const sqrtPeriod = Math.floor(Math.sqrt(period));
  const wmaHalf = calculateWMA(data, halfPeriod);
  const wmaFull = calculateWMA(data, period);

  const timeMap = new Map(wmaFull.map(p => [p.time, p.value]));
  const diffCandles: Candle[] = wmaHalf
    .filter(p => timeMap.has(p.time))
    .map(p => ({
      time: p.time,
      open: 2 * p.value - timeMap.get(p.time)!,
      high: 2 * p.value - timeMap.get(p.time)!,
      low:  2 * p.value - timeMap.get(p.time)!,
      close: 2 * p.value - timeMap.get(p.time)!,
      volume: 0,
    }));

  return calculateWMA(diffCandles, sqrtPeriod);
}

/** 5. VWAP */
export function calculateVWAP(data: Candle[]): SingleValuePoint[] {
  const result: SingleValuePoint[] = [];
  if (data.length === 0) return result;
  let cumTPV = 0, cumVol = 0, prevDay = -1;
  for (const candle of data) {
    const day = new Date(candle.time * 1000).getUTCDate();
    if (day !== prevDay) { cumTPV = 0; cumVol = 0; prevDay = day; }
    const tp = (candle.high + candle.low + candle.close) / 3;
    cumTPV += tp * candle.volume;
    cumVol += candle.volume;
    result.push({ time: candle.time, value: cumVol > 0 ? cumTPV / cumVol : tp });
  }
  return result;
}

/** 6. Bollinger Bands */
export function calculateBollingerBands(data: Candle[], period = 20, multiplier = 2): BBPoint[] {
  const result: BBPoint[] = [];
  if (data.length < period) return result;
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) sum += data[i - j].close;
    const mean = sum / period;
    let varSum = 0;
    for (let j = 0; j < period; j++) { const d = data[i - j].close - mean; varSum += d * d; }
    const std = Math.sqrt(varSum / period);
    result.push({ time: data[i].time, middle: mean, upper: mean + multiplier * std, lower: mean - multiplier * std });
  }
  return result;
}

/** 7. RSI */
export function calculateRSI(data: Candle[], period = 14): SingleValuePoint[] {
  const result: SingleValuePoint[] = [];
  if (data.length <= period) return result;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = data[i].close - data[i - 1].close;
    if (d > 0) gains += d; else losses -= d;
  }
  let avgGain = gains / period, avgLoss = losses / period;
  result.push({ time: data[period].time, value: avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss) });
  for (let i = period + 1; i < data.length; i++) {
    const ch = data[i].close - data[i - 1].close;
    avgGain = (avgGain * (period - 1) + Math.max(ch, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-ch, 0)) / period;
    result.push({ time: data[i].time, value: avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss) });
  }
  return result;
}

/** 8. MACD */
export function calculateMACD(data: Candle[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9): MACDPoint[] {
  const result: MACDPoint[] = [];
  if (data.length < slowPeriod) return result;
  const fastEma = calculateEMA(data, fastPeriod);
  const slowEma = calculateEMA(data, slowPeriod);
  const fastMap = new Map(fastEma.map(p => [p.time, p.value]));
  const macdLine: SingleValuePoint[] = [];
  for (const sp of slowEma) {
    const fv = fastMap.get(sp.time);
    if (fv !== undefined) macdLine.push({ time: sp.time, value: fv - sp.value });
  }
  if (macdLine.length < signalPeriod) return result;
  const macdCandles: Candle[] = macdLine.map(p => ({ time: p.time, open: p.value, high: p.value, low: p.value, close: p.value, volume: 0 }));
  const signalLine = calculateEMA(macdCandles, signalPeriod);
  const sigMap = new Map(signalLine.map(p => [p.time, p.value]));
  for (const mp of macdLine) {
    const sv = sigMap.get(mp.time);
    if (sv !== undefined) result.push({ time: mp.time, macd: mp.value, signal: sv, histogram: mp.value - sv });
  }
  return result;
}

/** 9. ATR */
export function calculateATR(data: Candle[], period = 14): SingleValuePoint[] {
  const result: SingleValuePoint[] = [];
  if (data.length <= 1) return result;
  const trs: SingleValuePoint[] = [];
  for (let i = 1; i < data.length; i++) {
    const h = data[i].high, l = data[i].low, pc = data[i - 1].close;
    trs.push({ time: data[i].time, value: Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)) });
  }
  if (trs.length < period) return result;
  let trSum = 0;
  for (let i = 0; i < period; i++) trSum += trs[i].value;
  let prevAtr = trSum / period;
  result.push({ time: trs[period - 1].time, value: prevAtr });
  for (let i = period; i < trs.length; i++) {
    prevAtr = (prevAtr * (period - 1) + trs[i].value) / period;
    result.push({ time: trs[i].time, value: prevAtr });
  }
  return result;
}

/** 10. Stochastic RSI */
export function calculateStochRSI(data: Candle[], rsiPeriod = 14, stochPeriod = 14, kPeriod = 3, dPeriod = 3): StochRSIPoint[] {
  const result: StochRSIPoint[] = [];
  const rsiPts = calculateRSI(data, rsiPeriod);
  if (rsiPts.length < stochPeriod) return result;
  const rawStoch: SingleValuePoint[] = [];
  for (let i = stochPeriod - 1; i < rsiPts.length; i++) {
    const sub = rsiPts.slice(i - stochPeriod + 1, i + 1).map(p => p.value);
    const mn = Math.min(...sub), mx = Math.max(...sub);
    rawStoch.push({ time: rsiPts[i].time, value: mx - mn > 0 ? ((rsiPts[i].value - mn) / (mx - mn)) * 100 : 0 });
  }
  const toCandles = (pts: SingleValuePoint[]): Candle[] => pts.map(p => ({ time: p.time, open: p.value, high: p.value, low: p.value, close: p.value, volume: 0 }));
  const kPts = calculateSMA(toCandles(rawStoch), kPeriod);
  const dPts = calculateSMA(toCandles(kPts), dPeriod);
  const dMap = new Map(dPts.map(p => [p.time, p.value]));
  for (const kp of kPts) {
    const dv = dMap.get(kp.time);
    if (dv !== undefined) result.push({ time: kp.time, k: kp.value, d: dv });
  }
  return result;
}

/** 11. CCI — Commodity Channel Index */
export function calculateCCI(data: Candle[], period = 20): SingleValuePoint[] {
  const result: SingleValuePoint[] = [];
  if (data.length < period) return result;
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const tps = slice.map(c => (c.high + c.low + c.close) / 3);
    const mean = tps.reduce((a, b) => a + b, 0) / period;
    const meanDev = tps.reduce((a, b) => a + Math.abs(b - mean), 0) / period;
    const tp = tps[tps.length - 1];
    result.push({ time: data[i].time, value: meanDev === 0 ? 0 : (tp - mean) / (0.015 * meanDev) });
  }
  return result;
}

/** 12. Williams %R */
export function calculateWilliamsR(data: Candle[], period = 14): SingleValuePoint[] {
  const result: SingleValuePoint[] = [];
  if (data.length < period) return result;
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const highH = Math.max(...slice.map(c => c.high));
    const lowL = Math.min(...slice.map(c => c.low));
    const val = highH - lowL === 0 ? -50 : ((highH - data[i].close) / (highH - lowL)) * -100;
    result.push({ time: data[i].time, value: val });
  }
  return result;
}

/** 13. On-Balance Volume (OBV) */
export function calculateOBV(data: Candle[]): SingleValuePoint[] {
  const result: SingleValuePoint[] = [];
  if (data.length === 0) return result;
  let obv = 0;
  result.push({ time: data[0].time, value: obv });
  for (let i = 1; i < data.length; i++) {
    if (data[i].close > data[i - 1].close) obv += data[i].volume;
    else if (data[i].close < data[i - 1].close) obv -= data[i].volume;
    result.push({ time: data[i].time, value: obv });
  }
  return result;
}

/** 14. Ichimoku Cloud */
export function calculateIchimoku(
  data: Candle[],
  tenkanPeriod = 9,
  kijunPeriod = 26,
  senkouBPeriod = 52
): IchimokuPoint[] {
  const result: IchimokuPoint[] = [];
  const highLow = (slice: Candle[]) => {
    const h = Math.max(...slice.map(c => c.high));
    const l = Math.min(...slice.map(c => c.low));
    return (h + l) / 2;
  };
  const maxP = Math.max(tenkanPeriod, kijunPeriod, senkouBPeriod);
  if (data.length < maxP) return result;
  for (let i = maxP - 1; i < data.length; i++) {
    const tenkan = highLow(data.slice(i - tenkanPeriod + 1, i + 1));
    const kijun = highLow(data.slice(i - kijunPeriod + 1, i + 1));
    const senkouA = (tenkan + kijun) / 2;
    const senkouB = highLow(data.slice(i - senkouBPeriod + 1, i + 1));
    result.push({ time: data[i].time, tenkan, kijun, senkouA, senkouB });
  }
  return result;
}
