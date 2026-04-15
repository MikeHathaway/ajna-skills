import { BigNumber } from "ethers";
import { describe, expect, it, vi } from "vitest";

const { createTransactionMock } = vi.hoisted(() => ({
  createTransactionMock: vi.fn()
}));

vi.mock("@ajna-finance/sdk", async () => {
  const actual = await vi.importActual<typeof import("@ajna-finance/sdk")>("@ajna-finance/sdk");
  return {
    ...actual,
    createTransaction: createTransactionMock
  };
});

import { AjnaAdapter } from "../src/sdk.js";
import { buildTestRuntime } from "./helpers/runtime.js";

const runtime = buildTestRuntime();

describe("prepare-time verification", () => {
  it("fails closed when transaction verification fails", async () => {
    const adapter = new AjnaAdapter(runtime);

    createTransactionMock.mockResolvedValue({
      _transaction: {
        to: "0x00000000000000000000000000000000000000B1",
        value: BigNumber.from(0),
        data: "0x1234",
        nonce: 0
      },
      verify: vi.fn().mockRejectedValue(new Error("verification exploded"))
    });

    await expect(
      (adapter as never).prepareContractTransaction({
        contract: { address: "0x00000000000000000000000000000000000000B1" },
        methodName: "approve",
        args: ["0x00000000000000000000000000000000000000B1", 1],
        from: "0x00000000000000000000000000000000000000A1",
        label: "approval"
      })
    ).rejects.toMatchObject({
      code: "PREPARE_VERIFICATION_FAILED"
    });
  });

  it("allows dependent transaction preparation when verification is deferred", async () => {
    const adapter = new AjnaAdapter(runtime);

    createTransactionMock.mockResolvedValue({
      _transaction: {
        to: "0x00000000000000000000000000000000000000B1",
        value: BigNumber.from(0),
        data: "0x1234",
        nonce: 0
      },
      verify: vi.fn().mockRejectedValue(new Error("allowance not updated yet"))
    });

    await expect(
      (adapter as never).prepareContractTransaction({
        contract: { address: "0x00000000000000000000000000000000000000B1" },
        methodName: "approve",
        args: ["0x00000000000000000000000000000000000000B1", 1],
        from: "0x00000000000000000000000000000000000000A1",
        label: "approval",
        allowVerifyFailure: true
      })
    ).resolves.toMatchObject({
      label: "approval",
      gasEstimate: undefined
    });
  });
});
