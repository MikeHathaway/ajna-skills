import { BigNumber, ethers } from "ethers";
import { afterEach, describe, expect, it, vi } from "vitest";

import { runExecutePrepared } from "../src/actions.js";
import { finalizePreparedAction } from "../src/prepared.js";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

describe("runExecutePrepared", () => {
  it("rejects execute when the RPC resolves to the wrong chain", async () => {
    const wallet = ethers.Wallet.createRandom();

    process.env.AJNA_SKILLS_MODE = "execute";
    process.env.AJNA_SIGNER_PRIVATE_KEY = wallet.privateKey;
    process.env.AJNA_RPC_URL_BASE = "http://127.0.0.1:8545";

    const preparedAction = await finalizePreparedAction(
      {
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
      },
      {
        mode: "execute",
        signerPrivateKey: wallet.privateKey,
        executeSignerAddress: wallet.address,
        unsafeUnsupportedActionsEnabled: false,
        networks: {}
      }
    );

    vi.spyOn(ethers.providers.JsonRpcProvider.prototype, "getNetwork").mockResolvedValue({
      chainId: 1,
      name: "homestead"
    });

    await expect(runExecutePrepared({ preparedAction })).rejects.toMatchObject({
      code: "RPC_CHAIN_MISMATCH"
    });
  });

  it("rejects execute when the prepared nonce is stale", async () => {
    const wallet = ethers.Wallet.createRandom();

    process.env.AJNA_SKILLS_MODE = "execute";
    process.env.AJNA_SIGNER_PRIVATE_KEY = wallet.privateKey;
    process.env.AJNA_RPC_URL_BASE = "http://127.0.0.1:8545";

    const preparedAction = await finalizePreparedAction(
      {
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
      },
      {
        mode: "execute",
        signerPrivateKey: wallet.privateKey,
        executeSignerAddress: wallet.address,
        unsafeUnsupportedActionsEnabled: false,
        networks: {}
      }
    );

    vi.spyOn(ethers.providers.JsonRpcProvider.prototype, "getNetwork").mockResolvedValue({
      chainId: 8453,
      name: "base"
    });
    vi.spyOn(ethers.providers.JsonRpcProvider.prototype, "getTransactionCount").mockResolvedValue(5);

    await expect(runExecutePrepared({ preparedAction })).rejects.toMatchObject({
      code: "PREPARED_NONCE_STALE"
    });
  });

  it("executes prepared transactions with exact sequential nonces", async () => {
    const wallet = ethers.Wallet.createRandom();

    process.env.AJNA_SKILLS_MODE = "execute";
    process.env.AJNA_SIGNER_PRIVATE_KEY = wallet.privateKey;
    process.env.AJNA_RPC_URL_BASE = "http://127.0.0.1:8545";

    const preparedAction = await finalizePreparedAction(
      {
        version: 1,
        kind: "borrow",
        network: "base",
        chainId: 8453,
        actorAddress: wallet.address,
        startingNonce: 9,
        poolAddress: "0x0000000000000000000000000000000000000100",
        quoteAddress: "0x0000000000000000000000000000000000000101",
        collateralAddress: "0x0000000000000000000000000000000000000102",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        transactions: [
          {
            label: "approval",
            target: "0x0000000000000000000000000000000000000101",
            value: "0",
            data: "0xaaaa",
            from: wallet.address
          },
          {
            label: "approval",
            target: "0x0000000000000000000000000000000000000102",
            value: "0",
            data: "0xcccc",
            from: wallet.address
          },
          {
            label: "action",
            target: "0x0000000000000000000000000000000000000100",
            value: "0",
            data: "0xbbbb",
            from: wallet.address
          }
        ],
        metadata: {
          amount: "100",
          collateralAmount: "200"
        }
      },
      {
        mode: "execute",
        signerPrivateKey: wallet.privateKey,
        executeSignerAddress: wallet.address,
        unsafeUnsupportedActionsEnabled: false,
        networks: {}
      }
    );

    vi.spyOn(ethers.providers.JsonRpcProvider.prototype, "getNetwork").mockResolvedValue({
      chainId: 8453,
      name: "base"
    });
    vi.spyOn(ethers.providers.JsonRpcProvider.prototype, "getTransactionCount").mockResolvedValue(9);
    vi.spyOn(ethers.providers.JsonRpcProvider.prototype, "estimateGas").mockResolvedValue(
      BigNumber.from(21_000)
    );

    const nonces: number[] = [];
    vi.spyOn(ethers.Wallet.prototype, "sendTransaction").mockImplementation(async (request) => {
      nonces.push(request.nonce as number);
      return {
        hash: `0x${String(nonces.length).padStart(64, "0")}`,
        wait: async () => ({
          status: 1,
          gasUsed: BigNumber.from(21_000)
        })
      } as never;
    });

    const result = await runExecutePrepared({ preparedAction });

    expect(nonces).toEqual([9, 10, 11]);
    expect(result.submitted).toHaveLength(3);
    expect(result.submitted.map((entry) => entry.label)).toEqual(["approval", "approval", "action"]);
  });

  it("estimates and submits dependent transactions in order", async () => {
    const wallet = ethers.Wallet.createRandom();

    process.env.AJNA_SKILLS_MODE = "execute";
    process.env.AJNA_SIGNER_PRIVATE_KEY = wallet.privateKey;
    process.env.AJNA_RPC_URL_BASE = "http://127.0.0.1:8545";

    const preparedAction = await finalizePreparedAction(
      {
        version: 1,
        kind: "borrow",
        network: "base",
        chainId: 8453,
        actorAddress: wallet.address,
        startingNonce: 2,
        poolAddress: "0x0000000000000000000000000000000000000100",
        quoteAddress: "0x0000000000000000000000000000000000000101",
        collateralAddress: "0x0000000000000000000000000000000000000102",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        transactions: [
          {
            label: "approval",
            target: "0x0000000000000000000000000000000000000101",
            value: "0",
            data: "0xaaaa",
            from: wallet.address
          },
          {
            label: "action",
            target: "0x0000000000000000000000000000000000000100",
            value: "0",
            data: "0xbbbb",
            from: wallet.address
          }
        ],
        metadata: {
          amount: "100"
        }
      },
      {
        mode: "execute",
        signerPrivateKey: wallet.privateKey,
        executeSignerAddress: wallet.address,
        unsafeUnsupportedActionsEnabled: false,
        networks: {}
      }
    );

    vi.spyOn(ethers.providers.JsonRpcProvider.prototype, "getNetwork").mockResolvedValue({
      chainId: 8453,
      name: "base"
    });
    vi.spyOn(ethers.providers.JsonRpcProvider.prototype, "getTransactionCount").mockResolvedValue(2);
    const steps: string[] = [];
    vi.spyOn(ethers.providers.JsonRpcProvider.prototype, "estimateGas").mockImplementation(async (request) => {
      steps.push(`estimate:${request.nonce}`);
      if (request.nonce === 3) {
        expect(steps).toContain("send:2");
      }
      return BigNumber.from(21_000);
    });
    vi.spyOn(ethers.Wallet.prototype, "sendTransaction").mockImplementation(async (request) => {
      steps.push(`send:${request.nonce}`);
      return {
        hash: `0x${String(request.nonce).padStart(64, "0")}`,
        wait: async () => ({
          status: 1,
          gasUsed: BigNumber.from(21_000)
        })
      } as never;
    });

    const result = await runExecutePrepared({ preparedAction });

    expect(steps).toEqual(["estimate:2", "send:2", "estimate:3", "send:3"]);
    expect(result.submitted).toHaveLength(2);
  });

  it("caps padded gas limits below the latest block gas limit ceiling", async () => {
    const wallet = ethers.Wallet.createRandom();

    process.env.AJNA_SKILLS_MODE = "execute";
    process.env.AJNA_SIGNER_PRIVATE_KEY = wallet.privateKey;
    process.env.AJNA_RPC_URL_BASE = "http://127.0.0.1:8545";

    const preparedAction = await finalizePreparedAction(
      {
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
      },
      {
        mode: "execute",
        signerPrivateKey: wallet.privateKey,
        executeSignerAddress: wallet.address,
        unsafeUnsupportedActionsEnabled: false,
        networks: {}
      }
    );

    vi.spyOn(ethers.providers.JsonRpcProvider.prototype, "getNetwork").mockResolvedValue({
      chainId: 8453,
      name: "base"
    });
    vi.spyOn(ethers.providers.JsonRpcProvider.prototype, "getTransactionCount").mockResolvedValue(4);
    vi.spyOn(ethers.providers.JsonRpcProvider.prototype, "getBlock").mockResolvedValue({
      gasLimit: BigNumber.from(100_000)
    } as never);
    vi.spyOn(ethers.providers.JsonRpcProvider.prototype, "estimateGas").mockResolvedValue(
      BigNumber.from(90_000)
    );

    const sendSpy = vi.spyOn(ethers.Wallet.prototype, "sendTransaction").mockResolvedValue({
      hash: `0x${"1".padStart(64, "0")}`,
      wait: async () => ({
        status: 1,
        gasUsed: BigNumber.from(90_000)
      })
    } as never);

    await runExecutePrepared({ preparedAction });

    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        gasLimit: BigNumber.from(95_000)
      })
    );
  });
});
