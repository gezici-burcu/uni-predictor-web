export type SeededRandom = () => number;

export function createMulberry32(seed: number): SeededRandom {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function sampleTriangular(
  random: SeededRandom, minimum: number, mode: number, maximum: number,
): number {
  const value = random();
  const split = (mode - minimum) / (maximum - minimum);
  return value < split
    ? minimum + Math.sqrt(value * (maximum - minimum) * (mode - minimum))
    : maximum - Math.sqrt((1 - value) * (maximum - minimum) * (maximum - mode));
}

