import { Candle } from '../binance/client';

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

/**
 * 1. Simple Moving Average (SMA)
 */
export function calculateSMA(data: Candle[], period: number): SingleValuePoint[] {
  const result: SingleValuePoint[] = [];
  if (data.length < period) return result;

  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    result.push({
      time: data[i].time,
      value: sum / period,
    });
  }
  return result;
}

/**
 * 2. Exponential Moving Average (EMA)
 */
export function calculateEMA(data: Candle[], period: number): SingleValuePoint[] {
  const result: SingleValuePoint[] = [];
  if (data.length < period) return result;

  const k = 2 / (period + 1);
  
  // First EMA value is SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i].close;
  }
  let prevEma = sum / period;
  result.push({ time: data[period - 1].time, value: prevEma });

  for (let i = period; i < data.length; i++) {
    const currentEma = (data[i].close - prevEma) * k + prevEma;
    result.push({ time: data[i].time, value: currentEma });
    prevEma = currentEma;
  }
  return result;
}

/**
 * 3. Volume Weighted Average Price (VWAP)
 * Resets whenever the calendar day changes (intraday reset)
 */
export function calculateVWAP(data: Candle[]): SingleValuePoint[] {
  const result: SingleValuePoint[] = [];
  if (data.length === 0) return result;

  let cumulativeTypicalPriceVolume = 0;
  let cumulativeVolume = 0;
  let prevDay = -1;

  for (let i = 0; i < data.length; i++) {
    const candle = data[i];
    const date = new Date(candle.time * 1000);
    const currentDay = date.getUTCDate();

    // Reset cumulative sums on new UTC day
    if (currentDay !== prevDay) {
      cumulativeTypicalPriceVolume = 0;
      cumulativeVolume = 0;
      prevDay = currentDay;
    }

    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    cumulativeTypicalPriceVolume += typicalPrice * candle.volume;
    cumulativeVolume += candle.volume;

    const vwapValue = cumulativeVolume > 0 ? (cumulativeTypicalPriceVolume / cumulativeVolume) : typicalPrice;

    result.push({
      time: candle.time,
      value: vwapValue,
    });
  }

  return result;
}

/**
 * 4. Relative Strength Index (RSI)
 */
export function calculateRSI(data: Candle[], period = 14): SingleValuePoint[] {
  const result: SingleValuePoint[] = [];
  if (data.length <= period) return result;

  let gains = 0;
  let losses = 0;

  // First change values
  for (let i = 1; i <= period; i++) {
    const diff = data[i].close - data[i - 1].close;
    if (diff > 0) {
      gains += diff;
    } else {
      losses -= diff;
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  let firstRsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  result.push({ time: data[period].time, value: firstRsi });

  for (let i = period + 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    const currentGain = change > 0 ? change : 0;
    const currentLoss = change < 0 ? -change : 0;

    // Wilder's smoothing technique
    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;

    const rsiValue = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    result.push({ time: data[i].time, value: rsiValue });
  }

  return result;
}

/**
 * 5. MACD (Moving Average Convergence Divergence)
 */
export function calculateMACD(
  data: Candle[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): MACDPoint[] {
  const result: MACDPoint[] = [];
  if (data.length < slowPeriod) return result;

  const fastEmaPoints = calculateEMA(data, fastPeriod);
  const slowEmaPoints = calculateEMA(data, slowPeriod);

  // Align Fast & Slow EMAs
  const macdLinePoints: SingleValuePoint[] = [];
  const fastMap = new Map(fastEmaPoints.map(p => [p.time, p.value]));

  for (const slowPoint of slowEmaPoints) {
    const fastVal = fastMap.get(slowPoint.time);
    if (fastVal !== undefined) {
      macdLinePoints.push({
        time: slowPoint.time,
        value: fastVal - slowPoint.value,
      });
    }
  }

  if (macdLinePoints.length < signalPeriod) return result;

  // Convert MACD line points to a pseudo-candle format for calculateEMA reuse
  const macdCandles: Candle[] = macdLinePoints.map(p => ({
    time: p.time,
    open: p.value,
    high: p.value,
    low: p.value,
    close: p.value,
    volume: 0,
  }));

  const signalLinePoints = calculateEMA(macdCandles, signalPeriod);
  const signalMap = new Map(signalLinePoints.map(p => [p.time, p.value]));

  for (const macdPoint of macdLinePoints) {
    const signalVal = signalMap.get(macdPoint.time);
    if (signalVal !== undefined) {
      result.push({
        time: macdPoint.time,
        macd: macdPoint.value,
        signal: signalVal,
        histogram: macdPoint.value - signalVal,
      });
    }
  }

  return result;
}

/**
 * 6. Bollinger Bands
 */
export function calculateBollingerBands(data: Candle[], period = 20, multiplier = 2): BBPoint[] {
  const result: BBPoint[] = [];
  if (data.length < period) return result;

  for (let i = period - 1; i < data.length; i++) {
    // Mean
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    const mean = sum / period;

    // Standard Deviation
    let varianceSum = 0;
    for (let j = 0; j < period; j++) {
      const diff = data[i - j].close - mean;
      varianceSum += diff * diff;
    }
    const stdDev = Math.sqrt(varianceSum / period);

    result.push({
      time: data[i].time,
      middle: mean,
      upper: mean + multiplier * stdDev,
      lower: mean - multiplier * stdDev,
    });
  }

  return result;
}

/**
 * 7. Average True Range (ATR)
 */
export function calculateATR(data: Candle[], period = 14): SingleValuePoint[] {
  const result: SingleValuePoint[] = [];
  if (data.length <= 1) return result;

  // Calculate True Range (TR)
  const trs: SingleValuePoint[] = [];
  for (let i = 1; i < data.length; i++) {
    const high = data[i].high;
    const low = data[i].low;
    const prevClose = data[i - 1].close;

    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trs.push({ time: data[i].time, value: tr });
  }

  if (trs.length < period) return result;

  // First ATR value is SMA of TR
  let trSum = 0;
  for (let i = 0; i < period; i++) {
    trSum += trs[i].value;
  }
  let prevAtr = trSum / period;
  result.push({ time: trs[period - 1].time, value: prevAtr });

  for (let i = period; i < trs.length; i++) {
    const currentAtr = (prevAtr * (period - 1) + trs[i].value) / period;
    result.push({ time: trs[i].time, value: currentAtr });
    prevAtr = currentAtr;
  }

  return result;
}

/**
 * 8. Stochastic RSI
 */
export function calculateStochRSI(
  data: Candle[],
  rsiPeriod = 14,
  stochPeriod = 14,
  kPeriod = 3,
  dPeriod = 3
): StochRSIPoint[] {
  const result: StochRSIPoint[] = [];
  const rsiPoints = calculateRSI(data, rsiPeriod);
  if (rsiPoints.length < stochPeriod) return result;

  const stochRsiRaw: SingleValuePoint[] = [];

  for (let i = stochPeriod - 1; i < rsiPoints.length; i++) {
    const subRsi = rsiPoints.slice(i - stochPeriod + 1, i + 1).map(p => p.value);
    const minRsi = Math.min(...subRsi);
    const maxRsi = Math.max(...subRsi);

    let stochVal = 0;
    if (maxRsi - minRsi > 0) {
      stochVal = (rsiPoints[i].value - minRsi) / (maxRsi - minRsi);
    }

    stochRsiRaw.push({
      time: rsiPoints[i].time,
      value: stochVal * 100,
    });
  }

  // Smooth with K Period (SMA of Raw StochRSI)
  const stochRsiRawCandles: Candle[] = stochRsiRaw.map(p => ({
    time: p.time,
    open: p.value,
    high: p.value,
    low: p.value,
    close: p.value,
    volume: 0,
  }));

  const kPoints = calculateSMA(stochRsiRawCandles, kPeriod);
  const kMap = new Map(kPoints.map(p => [p.time, p.value]));

  // Smooth D Period (SMA of K Points)
  const kCandles: Candle[] = kPoints.map(p => ({
    time: p.time,
    open: p.value,
    high: p.value,
    low: p.value,
    close: p.value,
    volume: 0,
  }));

  const dPoints = calculateSMA(kCandles, dPeriod);
  const dMap = new Map(dPoints.map(p => [p.time, p.value]));

  for (const kPt of kPoints) {
    const dVal = dMap.get(kPt.time);
    if (dVal !== undefined) {
      result.push({
        time: kPt.time,
        k: kPt.value,
        d: dVal,
      });
    }
  }

  return result;
}
