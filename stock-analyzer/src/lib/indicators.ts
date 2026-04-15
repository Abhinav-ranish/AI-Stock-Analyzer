/**
 * Technical indicators ported from backend/blueprints/technical.py
 * All functions operate on arrays of numbers (close prices, volumes, etc.)
 */

export function calculateRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;

  const deltas = closes.slice(1).map((c, i) => c - closes[i]);
  const gains = deltas.map((d) => (d > 0 ? d : 0));
  const losses = deltas.map((d) => (d < 0 ? -d : 0));

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < deltas.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return round(100 - 100 / (1 + rs));
}

export function calculateMACD(closes: number[]): {
  macd: number;
  signal: number;
} {
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signalLine = ema(macdLine, 9);
  return {
    macd: round(macdLine[macdLine.length - 1]),
    signal: round(signalLine[signalLine.length - 1]),
  };
}

export function getSMAs(closes: number[]): { sma50: number; sma200: number } {
  return {
    sma50: round(sma(closes, 50)),
    sma200: round(sma(closes, 200)),
  };
}

export function emaCrossovers(closes: number[]): string {
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  return ema12[ema12.length - 1] > ema26[ema26.length - 1]
    ? "Bullish Crossover"
    : "Bearish Crossover";
}

export function stochasticRSI(closes: number[], period = 14): number {
  const deltas = closes.slice(1).map((c, i) => c - closes[i]);
  const gains = deltas.map((d) => (d > 0 ? d : 0));
  const losses = deltas.map((d) => (d < 0 ? -d : 0));

  const avgGains = rollingMean(gains, period);
  const avgLosses = rollingMean(losses, period);

  const rsiValues = avgGains.map((g, i) => {
    if (avgLosses[i] === 0) return 100;
    return 100 - 100 / (1 + g / avgLosses[i]);
  });

  const validRsi = rsiValues.filter((v) => !isNaN(v));
  if (validRsi.length < period) return 50;

  const recentRsi = validRsi.slice(-period);
  const minRsi = Math.min(...recentRsi);
  const maxRsi = Math.max(...recentRsi);
  const currentRsi = validRsi[validRsi.length - 1];

  if (maxRsi === minRsi) return 50;
  return round(((currentRsi - minRsi) / (maxRsi - minRsi)) * 100);
}

export function calculateADX(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14
): number {
  if (highs.length < period + 1) return 25;

  const trueRanges: number[] = [];
  const plusDMs: number[] = [];
  const minusDMs: number[] = [];

  for (let i = 1; i < highs.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    trueRanges.push(tr);

    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];

    plusDMs.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDMs.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }

  const smoothedTR = smoothed(trueRanges, period);
  const smoothedPlusDM = smoothed(plusDMs, period);
  const smoothedMinusDM = smoothed(minusDMs, period);

  const plusDI = smoothedPlusDM.map((v, i) =>
    smoothedTR[i] === 0 ? 0 : (v / smoothedTR[i]) * 100
  );
  const minusDI = smoothedMinusDM.map((v, i) =>
    smoothedTR[i] === 0 ? 0 : (v / smoothedTR[i]) * 100
  );

  const dx = plusDI.map((p, i) => {
    const sum = p + minusDI[i];
    return sum === 0 ? 0 : (Math.abs(p - minusDI[i]) / sum) * 100;
  });

  if (dx.length < period) return 25;
  const adxValues = smoothed(dx, period);
  return round(adxValues[adxValues.length - 1]);
}

export function trendZone(
  close: number,
  sma50: number,
  sma200: number
): string {
  if (close > sma50 && sma50 > sma200) return "Strong Bull";
  if (close > sma200 && close < sma50) return "Bull with Pullback";
  if (close < sma200) return "Bear";
  return "Neutral";
}

export function volumeSpike(volumes: number[], factor = 2.0): boolean {
  if (volumes.length < 21) return false;
  const avg20 = sma(volumes, 20);
  return volumes[volumes.length - 1] >= factor * avg20;
}

export function candleType(openPrice: number, closePrice: number): string {
  return closePrice > openPrice ? "Bullish" : "Bearish";
}

export function calculateVolatilityIndex(
  closes: number[],
  window = 20,
  longWindow = 100
): { volIndex: number; isSqueeze: boolean } {
  if (closes.length < longWindow) return { volIndex: 1, isSqueeze: false };

  const smaVal = sma(closes, window);
  const stdVal = rollingStd(closes, window);

  const bbUpper = smaVal + 2 * stdVal;
  const bbLower = smaVal - 2 * stdVal;
  const bbw = (bbUpper - bbLower) / smaVal;

  // Calculate long-window average of bbw
  const recentCloses = closes.slice(-longWindow);
  const bbwValues: number[] = [];
  for (let i = window; i <= recentCloses.length; i++) {
    const slice = recentCloses.slice(i - window, i);
    const s = sma(slice, window);
    const std = rollingStd(slice, window);
    const u = s + 2 * std;
    const l = s - 2 * std;
    bbwValues.push((u - l) / s);
  }

  const avgBbw =
    bbwValues.length > 0
      ? bbwValues.reduce((a, b) => a + b, 0) / bbwValues.length
      : 1;

  const volIndex = avgBbw === 0 ? 1 : bbw / avgBbw;
  return { volIndex: round(volIndex, 3), isSqueeze: volIndex < 0.75 };
}

// --- Helpers ---

function ema(data: number[], span: number): number[] {
  const k = 2 / (span + 1);
  const result = [data[0]];
  for (let i = 1; i < data.length; i++) {
    result.push(data[i] * k + result[i - 1] * (1 - k));
  }
  return result;
}

function sma(data: number[], period: number): number {
  const slice = data.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function rollingMean(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      result.push(slice.reduce((a, b) => a + b, 0) / period);
    }
  }
  return result;
}

function rollingStd(data: number[], period: number): number {
  const slice = data.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const variance =
    slice.reduce((sum, val) => sum + (val - mean) ** 2, 0) / slice.length;
  return Math.sqrt(variance);
}

function smoothed(data: number[], period: number): number[] {
  if (data.length < period) return data;
  let current = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const result = [current];
  for (let i = period; i < data.length; i++) {
    current = (current * (period - 1) + data[i]) / period;
    result.push(current);
  }
  return result;
}

function round(value: number, decimals = 2): number {
  return Math.round(value * 10 ** decimals) / 10 ** decimals;
}
