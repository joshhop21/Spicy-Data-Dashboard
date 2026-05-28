import type { BtcLiquidityModelData } from "./btc-liquidity-types";
import raw from "@/data/btc-liquidity-model.json";

export function getBtcLiquidityModel(): BtcLiquidityModelData {
  return raw as BtcLiquidityModelData;
}
