import { afterEach, describe, expect, it } from "vitest";

import { NETWORK_DEFAULTS } from "../src/constants.js";
import { loadRuntimeConfig } from "../src/config.js";

const ORIGINAL_ENV = { ...process.env };

describe("loadRuntimeConfig", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("loads built-in base config from env", () => {
    process.env.AJNA_RPC_URL_BASE = "http://127.0.0.1:8545";
    process.env.AJNA_ENABLE_UNSAFE_SDK_CALLS = "true";

    const runtime = loadRuntimeConfig();

    expect(runtime.mode).toBe("inspect");
    expect(runtime.unsafeUnsupportedActionsEnabled).toBe(true);
    expect(runtime.networks.base.chainId).toBe(8453);
    expect(runtime.networks.base.erc20PoolFactory).toBe(
      "0x214f62B5836D83f3D6c4f71F174209097B1A779C"
    );
  });

  it("ignores canonical Ajna address overrides from env", () => {
    process.env.AJNA_RPC_URL_BASE = "http://127.0.0.1:8545";
    process.env.AJNA_TOKEN_BASE = "0x000000000000000000000000000000000000dEaD";
    process.env.AJNA_ERC20_POOL_FACTORY_BASE = "0x000000000000000000000000000000000000dEaD";
    process.env.AJNA_ERC721_POOL_FACTORY_BASE = "0x000000000000000000000000000000000000dEaD";
    process.env.AJNA_POOL_INFO_UTILS_BASE = "0x000000000000000000000000000000000000dEaD";
    process.env.AJNA_POSITION_MANAGER_BASE = "0x000000000000000000000000000000000000dEaD";

    const runtime = loadRuntimeConfig();

    expect(runtime.networks.base.ajnaToken).toBe(NETWORK_DEFAULTS.base.ajnaToken);
    expect(runtime.networks.base.erc20PoolFactory).toBe(NETWORK_DEFAULTS.base.erc20PoolFactory);
    expect(runtime.networks.base.erc721PoolFactory).toBe(NETWORK_DEFAULTS.base.erc721PoolFactory);
    expect(runtime.networks.base.poolInfoUtils).toBe(NETWORK_DEFAULTS.base.poolInfoUtils);
    expect(runtime.networks.base.positionManager).toBe(NETWORK_DEFAULTS.base.positionManager);
  });
});
