import { ERC20__factory, SdkError } from "@ajna-finance/sdk";
import { BigNumber } from "ethers";
import { afterEach, describe, expect, it, vi } from "vitest";

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
  afterEach(() => {
    createTransactionMock.mockReset();
    vi.restoreAllMocks();
  });

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
        contract: {
          address: "0x00000000000000000000000000000000000000B1",
          provider: {}
        },
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
    vi.spyOn(ERC20__factory, "connect").mockReturnValue({
      allowance: vi.fn().mockResolvedValue(BigNumber.from(0))
    } as never);

    createTransactionMock.mockResolvedValue({
      _transaction: {
        to: "0x00000000000000000000000000000000000000B1",
        value: BigNumber.from(0),
        data: "0x1234",
        nonce: 0
      },
      verify: vi.fn().mockRejectedValue(new SdkError("ERC20InsufficientAllowance"))
    });

    await expect(
      (adapter as never).prepareContractTransaction({
        contract: {
          address: "0x00000000000000000000000000000000000000B1",
          provider: {}
        },
        methodName: "approve",
        args: ["0x00000000000000000000000000000000000000B1", 1],
        from: "0x00000000000000000000000000000000000000A1",
        label: "approval",
        deferredVerification: {
          kind: "erc20-allowance-raise",
          tokenAddress: "0x00000000000000000000000000000000000000C1",
          owner: "0x00000000000000000000000000000000000000A1",
          spender: "0x00000000000000000000000000000000000000B1",
          requiredAllowance: BigNumber.from(1)
        }
      })
    ).resolves.toMatchObject({
      label: "approval",
      gasEstimate: undefined
    });
  });

  it("still fails closed on unrelated deferred verification errors", async () => {
    const adapter = new AjnaAdapter(runtime);
    vi.spyOn(ERC20__factory, "connect").mockReturnValue({
      allowance: vi.fn().mockResolvedValue(BigNumber.from(0))
    } as never);

    createTransactionMock.mockResolvedValue({
      _transaction: {
        to: "0x00000000000000000000000000000000000000B1",
        value: BigNumber.from(0),
        data: "0x1234",
        nonce: 0
      },
      verify: vi.fn().mockRejectedValue(new Error("pool missing liquidity"))
    });

    await expect(
      (adapter as never).prepareContractTransaction({
        contract: {
          address: "0x00000000000000000000000000000000000000B1",
          provider: {}
        },
        methodName: "approve",
        args: ["0x00000000000000000000000000000000000000B1", 1],
        from: "0x00000000000000000000000000000000000000A1",
        label: "approval",
        deferredVerification: {
          kind: "erc20-allowance-raise",
          tokenAddress: "0x00000000000000000000000000000000000000C1",
          owner: "0x00000000000000000000000000000000000000A1",
          spender: "0x00000000000000000000000000000000000000B1",
          requiredAllowance: BigNumber.from(1)
        }
      })
    ).rejects.toMatchObject({
      code: "PREPARE_VERIFICATION_FAILED"
    });
  });

  it("still fails closed when the allowance dependency is not actually missing", async () => {
    const adapter = new AjnaAdapter(runtime);
    vi.spyOn(ERC20__factory, "connect").mockReturnValue({
      allowance: vi.fn().mockResolvedValue(BigNumber.from(1))
    } as never);

    createTransactionMock.mockResolvedValue({
      _transaction: {
        to: "0x00000000000000000000000000000000000000B1",
        value: BigNumber.from(0),
        data: "0x1234",
        nonce: 0
      },
      verify: vi.fn().mockRejectedValue(new SdkError("ERC20InsufficientAllowance"))
    });

    await expect(
      (adapter as never).prepareContractTransaction({
        contract: {
          address: "0x00000000000000000000000000000000000000B1",
          provider: {}
        },
        methodName: "approve",
        args: ["0x00000000000000000000000000000000000000B1", 1],
        from: "0x00000000000000000000000000000000000000A1",
        label: "approval",
        deferredVerification: {
          kind: "erc20-allowance-raise",
          tokenAddress: "0x00000000000000000000000000000000000000C1",
          owner: "0x00000000000000000000000000000000000000A1",
          spender: "0x00000000000000000000000000000000000000B1",
          requiredAllowance: BigNumber.from(1)
        }
      })
    ).rejects.toMatchObject({
      code: "PREPARE_VERIFICATION_FAILED"
    });
  });

  it("allows reset-dependent approval preparation only for known reset failures", async () => {
    const adapter = new AjnaAdapter(runtime);
    vi.spyOn(ERC20__factory, "connect").mockReturnValue({
      allowance: vi.fn().mockResolvedValue(BigNumber.from(5))
    } as never);

    createTransactionMock.mockResolvedValue({
      _transaction: {
        to: "0x00000000000000000000000000000000000000B1",
        value: BigNumber.from(0),
        data: "0x1234",
        nonce: 0
      },
      verify: vi.fn().mockRejectedValue(new SdkError("approve from non-zero to non-zero allowance"))
    });

    await expect(
      (adapter as never).prepareContractTransaction({
        contract: {
          address: "0x00000000000000000000000000000000000000B1",
          provider: {}
        },
        methodName: "approve",
        args: ["0x00000000000000000000000000000000000000B1", 10],
        from: "0x00000000000000000000000000000000000000A1",
        label: "approval",
        deferredVerification: {
          kind: "erc20-allowance-reset",
          tokenAddress: "0x00000000000000000000000000000000000000C1",
          owner: "0x00000000000000000000000000000000000000A1",
          spender: "0x00000000000000000000000000000000000000B1",
          currentAllowance: BigNumber.from(5),
          desiredAllowance: BigNumber.from(10)
        }
      })
    ).resolves.toMatchObject({
      label: "approval",
      gasEstimate: undefined
    });
  });

  it("does not defer generic allowance-like errors that are not SDK reasons", async () => {
    const adapter = new AjnaAdapter(runtime);
    vi.spyOn(ERC20__factory, "connect").mockReturnValue({
      allowance: vi.fn().mockResolvedValue(BigNumber.from(0))
    } as never);

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
        contract: {
          address: "0x00000000000000000000000000000000000000B1",
          provider: {}
        },
        methodName: "approve",
        args: ["0x00000000000000000000000000000000000000B1", 1],
        from: "0x00000000000000000000000000000000000000A1",
        label: "approval",
        deferredVerification: {
          kind: "erc20-allowance-raise",
          tokenAddress: "0x00000000000000000000000000000000000000C1",
          owner: "0x00000000000000000000000000000000000000A1",
          spender: "0x00000000000000000000000000000000000000B1",
          requiredAllowance: BigNumber.from(1)
        }
      })
    ).rejects.toMatchObject({
      code: "PREPARE_VERIFICATION_FAILED"
    });
  });

  it("derives prepared payload expiry from wall clock time", async () => {
    const adapter = new AjnaAdapter(runtime);
    const now = Date.now();

    const expiresAt = await (adapter as never).expirationIso({} as never, 60);
    const expiresAtMs = new Date(expiresAt).getTime();

    expect(expiresAtMs).toBeGreaterThanOrEqual(now + 59_000);
    expect(expiresAtMs).toBeLessThanOrEqual(now + 61_000);
  });
});
