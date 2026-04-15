import type { RuntimeConfig } from "../../src/types.js";

const DEFAULT_NETWORKS: RuntimeConfig["networks"] = {
  base: {
    network: "base",
    chainId: 8453,
    rpcUrl: "http://127.0.0.1:8545",
    ajnaToken: "0x0000000000000000000000000000000000000010",
    erc20PoolFactory: "0x0000000000000000000000000000000000000020",
    erc721PoolFactory: "0x0000000000000000000000000000000000000030",
    poolInfoUtils: "0x0000000000000000000000000000000000000040",
    positionManager: "0x0000000000000000000000000000000000000050"
  },
  ethereum: {
    network: "ethereum",
    chainId: 1,
    rpcUrl: "http://localhost:8545",
    ajnaToken: "0x0000000000000000000000000000000000000011",
    erc20PoolFactory: "0x0000000000000000000000000000000000000012",
    erc721PoolFactory: "0x0000000000000000000000000000000000000013",
    poolInfoUtils: "0x0000000000000000000000000000000000000014",
    positionManager: "0x0000000000000000000000000000000000000015"
  }
};

export function buildTestRuntime(overrides: Partial<RuntimeConfig> = {}): RuntimeConfig {
  return {
    mode: "prepare",
    unsafeUnsupportedActionsEnabled: false,
    networks: { ...DEFAULT_NETWORKS },
    ...overrides
  };
}
