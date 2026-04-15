import { BigNumber, BigNumberish, ethers } from "ethers";
import { vi } from "vitest";

export function mockBaseProvider({
  chainId = 8453,
  name = chainId === 8453 ? "base" : "homestead",
  timestamp = 1_700_000_000,
  nonce,
  gasLimit
}: {
  chainId?: number;
  name?: string;
  timestamp?: number;
  nonce?: number;
  gasLimit?: BigNumberish;
} = {}) {
  vi.spyOn(ethers.providers.JsonRpcProvider.prototype, "getNetwork").mockResolvedValue({
    chainId,
    name
  });
  vi.spyOn(ethers.providers.JsonRpcProvider.prototype, "getBlock").mockResolvedValue({
    timestamp,
    ...(gasLimit !== undefined ? { gasLimit: BigNumber.from(gasLimit) } : {})
  } as never);

  if (nonce !== undefined) {
    vi.spyOn(ethers.providers.JsonRpcProvider.prototype, "getTransactionCount").mockResolvedValue(nonce);
  }
}
