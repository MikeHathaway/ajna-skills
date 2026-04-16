import { ethers } from "ethers";

import { finalizePreparedAction } from "../../src/prepared.js";
import type { PreparedAction, RuntimeConfig } from "../../src/types.js";
import { buildTestRuntime } from "./runtime.js";

type PreparedFixtureOverrides = Partial<
  Omit<PreparedAction, "digest" | "signature" | "signatureStatus" | "signatureReason">
>;

export async function buildPreparedFixture(
  wallet: ethers.Wallet,
  overrides: PreparedFixtureOverrides = {},
  runtime: RuntimeConfig = buildTestRuntime({
    mode: "execute",
    signerPrivateKey: wallet.privateKey,
    executeSignerAddress: wallet.address
  })
) {
  const baseAction: Omit<
    PreparedAction,
    "digest" | "signature" | "signatureStatus" | "signatureReason"
  > = {
    version: 1,
    kind: "lend",
    network: "base",
    chainId: 8453,
    actorAddress: wallet.address,
    startingNonce: 4,
    poolAddress: "0x0000000000000000000000000000000000000100",
    quoteAddress: "0x0000000000000000000000000000000000000101",
    collateralAddress: "0x0000000000000000000000000000000000000102",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    transactions: [
      {
        label: "action",
        target: "0x0000000000000000000000000000000000000100",
        value: "0",
        data: "0x1234",
        from: wallet.address
      }
    ],
    metadata: {
      amount: "100"
    }
  };

  return finalizePreparedAction(
    {
      ...baseAction,
      ...overrides,
      actorAddress: overrides.actorAddress ?? wallet.address,
      transactions: overrides.transactions ?? baseAction.transactions,
      metadata: overrides.metadata ?? baseAction.metadata
    },
    runtime
  );
}
