export type BtcLiquidityPoint = {
  date: string;
  btcActual: number;
  modelFair: number;
  band1Low: number;
  band1High: number;
  band2Low: number;
  band2High: number;
  zScore: number;
  fedNetLiqT: number;
  globalM2Yoy: number;
  stableSupplyB: number;
};

export type BtcLiquidityModelData = {
  slug: string;
  updatedAt: string;
  headline: {
    btcActual: number;
    fairValue: number;
    rangeLow: number;
    rangeHigh: number;
    extremeLow: number;
    extremeHigh: number;
    signal: string;
    vsFairPct: number;
    zScore: number;
  };
  cards: {
    fedNetLiqT: number;
    globalM2Yoy: number;
    stableSupplyB: number;
    stable30dPct: number;
  };
  modelStats: {
    r2: number;
    observations: number;
    residualSigma: number;
  };
  coefficients: { name: string; value: number }[];
  methodology: string;
  sources: string[];
  points: BtcLiquidityPoint[];
};
