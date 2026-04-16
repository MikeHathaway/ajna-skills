import {
  ERC20Pool__factory,
  ERC20PoolFactory__factory,
  ERC721Pool__factory,
  PoolInfoUtils__factory
} from "@ajna-finance/sdk";
import { BigNumber, ethers } from "ethers";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AjnaAdapter } from "../src/sdk.js";
import { mockBaseProvider } from "./helpers/provider.js";
import { buildTestRuntime } from "./helpers/runtime.js";

const runtime = buildTestRuntime({ mode: "inspect" });

function namedTuple<T extends Record<string, unknown>>(values: unknown[], named: T): T {
  return Object.assign(values, named) as T;
}

describe("AjnaAdapter inspect helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the basic inspect-pool shape without full extras", async () => {
    const poolAddress = "0x0000000000000000000000000000000000000100";
    const collateralAddress = "0x0000000000000000000000000000000000000101";
    const quoteAddress = "0x0000000000000000000000000000000000000102";
    const pool = {
      collateralAddress: vi.fn().mockResolvedValue(collateralAddress),
      quoteTokenAddress: vi.fn().mockResolvedValue(quoteAddress),
      debtInfo: vi.fn(),
      interestRateInfo: vi.fn(),
      pledgedCollateral: vi.fn(),
      poolType: vi.fn(),
      quoteTokenScale: vi.fn(),
      collateralScale: vi.fn()
    };
    const poolInfoUtils = {
      poolPricesInfo: vi.fn().mockResolvedValue(
        namedTuple([1, 2, 3, 4, 5, 6], {
          hpb_: BigNumber.from(1),
          hpbIndex_: BigNumber.from(2),
          htp_: BigNumber.from(3),
          htpIndex_: BigNumber.from(4),
          lup_: BigNumber.from(5),
          lupIndex_: BigNumber.from(6)
        })
      ),
      poolLoansInfo: vi.fn().mockResolvedValue(
        namedTuple([1000, 7, ethers.constants.AddressZero, 8, 9], {
          poolSize_: BigNumber.from(1000),
          loansCount_: BigNumber.from(7),
          maxBorrower_: ethers.constants.AddressZero,
          pendingInflator_: BigNumber.from(8),
          pendingInterestFactor_: BigNumber.from(9)
        })
      ),
      poolUtilizationInfo: vi.fn().mockResolvedValue(
        namedTuple([10, 11, 12, 13], {
          poolMinDebtAmount_: BigNumber.from(10),
          poolCollateralization_: BigNumber.from(11),
          poolActualUtilization_: BigNumber.from(12),
          poolTargetUtilization_: BigNumber.from(13)
        })
      ),
      poolReservesInfo: vi.fn().mockResolvedValue(
        namedTuple([14, 15, 16, 17, 18], {
          reserves_: BigNumber.from(14),
          claimableReserves_: BigNumber.from(15),
          claimableReservesRemaining_: BigNumber.from(16),
          auctionPrice_: BigNumber.from(17),
          timeRemaining_: BigNumber.from(18)
        })
      ),
      borrowFeeRate: vi.fn().mockResolvedValue(BigNumber.from(19)),
      depositFeeRate: vi.fn().mockResolvedValue(BigNumber.from(20)),
      lenderInterestMargin: vi.fn()
    };

    mockBaseProvider();
    vi.spyOn(ERC20Pool__factory, "connect").mockReturnValue(pool as never);
    vi.spyOn(ERC20PoolFactory__factory, "connect").mockReturnValue({
      deployedPools: vi.fn().mockResolvedValue(poolAddress)
    } as never);
    vi.spyOn(PoolInfoUtils__factory, "connect").mockReturnValue(poolInfoUtils as never);

    const adapter = new AjnaAdapter(runtime);
    vi.spyOn(adapter as never, "readSymbol").mockImplementation(async (address: string) => {
      if (address === collateralAddress) return "AERO";
      if (address === quoteAddress) return "USDC";
      return null;
    });

    const result = await adapter.inspectPool({
      network: "base",
      poolAddress
    });

    expect(result.detailLevel).toBe("basic");
    expect(result.poolKind).toBe("erc20-pool");
    expect(result.subsetHash).toBeNull();
    expect(result.collateralSymbol).toBe("AERO");
    expect(result.quoteSymbol).toBe("USDC");
    expect(result.pool.poolSize).toBe("1000");
    expect(result.pool.borrowFeeRate).toBe("19");
    expect(result.full).toBeUndefined();
    expect(pool.debtInfo).not.toHaveBeenCalled();
    expect(poolInfoUtils.lenderInterestMargin).not.toHaveBeenCalled();
  });

  it("returns expanded inspect-pool fields when detailLevel is full", async () => {
    const poolAddress = "0x0000000000000000000000000000000000000200";
    const collateralAddress = "0x0000000000000000000000000000000000000201";
    const quoteAddress = "0x0000000000000000000000000000000000000202";
    const pool = {
      collateralAddress: vi.fn().mockResolvedValue(collateralAddress),
      quoteTokenAddress: vi.fn().mockResolvedValue(quoteAddress),
      debtInfo: vi.fn().mockResolvedValue([BigNumber.from(21), BigNumber.from(22), BigNumber.from(23), BigNumber.from(24)]),
      interestRateInfo: vi.fn().mockResolvedValue([BigNumber.from(25), BigNumber.from(1_700_000_000)]),
      pledgedCollateral: vi.fn().mockResolvedValue(BigNumber.from(26)),
      poolType: vi.fn().mockResolvedValue(0),
      quoteTokenScale: vi.fn().mockResolvedValue(BigNumber.from(1_000_000)),
      collateralScale: vi.fn().mockResolvedValue(BigNumber.from("1000000000000000000"))
    };
    const poolInfoUtils = {
      poolPricesInfo: vi.fn().mockResolvedValue(
        namedTuple([1, 2, 3, 4, 5, 6], {
          hpb_: BigNumber.from(1),
          hpbIndex_: BigNumber.from(2),
          htp_: BigNumber.from(3),
          htpIndex_: BigNumber.from(4),
          lup_: BigNumber.from(5),
          lupIndex_: BigNumber.from(6)
        })
      ),
      poolLoansInfo: vi.fn().mockResolvedValue(
        namedTuple([1000, 7, ethers.constants.AddressZero, 27, 28], {
          poolSize_: BigNumber.from(1000),
          loansCount_: BigNumber.from(7),
          maxBorrower_: ethers.constants.AddressZero,
          pendingInflator_: BigNumber.from(27),
          pendingInterestFactor_: BigNumber.from(28)
        })
      ),
      poolUtilizationInfo: vi.fn().mockResolvedValue(
        namedTuple([10, 11, 12, 13], {
          poolMinDebtAmount_: BigNumber.from(10),
          poolCollateralization_: BigNumber.from(11),
          poolActualUtilization_: BigNumber.from(12),
          poolTargetUtilization_: BigNumber.from(13)
        })
      ),
      poolReservesInfo: vi.fn().mockResolvedValue(
        namedTuple([14, 15, 16, 29, 30], {
          reserves_: BigNumber.from(14),
          claimableReserves_: BigNumber.from(15),
          claimableReservesRemaining_: BigNumber.from(16),
          auctionPrice_: BigNumber.from(29),
          timeRemaining_: BigNumber.from(30)
        })
      ),
      borrowFeeRate: vi.fn().mockResolvedValue(BigNumber.from(19)),
      depositFeeRate: vi.fn().mockResolvedValue(BigNumber.from(20)),
      lenderInterestMargin: vi.fn().mockResolvedValue(BigNumber.from(31))
    };

    mockBaseProvider();
    vi.spyOn(ERC20Pool__factory, "connect").mockReturnValue(pool as never);
    vi.spyOn(ERC20PoolFactory__factory, "connect").mockReturnValue({
      deployedPools: vi.fn().mockResolvedValue(poolAddress)
    } as never);
    vi.spyOn(PoolInfoUtils__factory, "connect").mockReturnValue(poolInfoUtils as never);

    const adapter = new AjnaAdapter(runtime);
    vi.spyOn(adapter as never, "readSymbol").mockResolvedValue(null);

    const result = await adapter.inspectPool({
      network: "base",
      poolAddress,
      detailLevel: "full"
    });

    expect(result.detailLevel).toBe("full");
    expect(result.poolKind).toBe("erc20-pool");
    expect(result.subsetHash).toBeNull();
    expect(result.full).toEqual({
      config: {
        poolType: 0,
        quoteTokenScale: "1000000",
        collateralScale: "1000000000000000000"
      },
      rates: {
        borrowRate: "25",
        lenderInterestMargin: "31",
        interestRateLastUpdated: "2023-11-14T22:13:20.000Z"
      },
      debt: {
        debt: "21",
        poolDebtInAuction: "23",
        pendingInflator: "27",
        pendingInterestFactor: "28"
      },
      totals: {
        pledgedCollateral: "26",
        reserveAuctionPrice: "29",
        reserveAuctionTimeRemaining: "30"
      }
    });
  });

  it("returns a normalized bucket inspection result", async () => {
    const poolAddress = "0x0000000000000000000000000000000000000300";
    const pool = {
      quoteTokenAddress: vi.fn().mockResolvedValue("0x0000000000000000000000000000000000000301"),
      collateralAddress: vi.fn().mockResolvedValue("0x0000000000000000000000000000000000000302"),
      quoteTokenScale: vi.fn().mockResolvedValue(BigNumber.from(1_000_000)),
      collateralScale: vi.fn().mockResolvedValue(BigNumber.from("1000000000000000000")),
      bucketCollateralDust: vi.fn().mockResolvedValue(BigNumber.from(40))
    };
    const poolInfoUtils = {
      bucketInfo: vi.fn().mockResolvedValue(
        namedTuple([32, 33, 34, 35, 36, 37], {
          price_: BigNumber.from(32),
          quoteTokens_: BigNumber.from(33),
          collateral_: BigNumber.from(34),
          bucketLP_: BigNumber.from(35),
          scale_: BigNumber.from(36),
          exchangeRate_: BigNumber.from(37)
        })
      )
    };

    mockBaseProvider();
    vi.spyOn(ERC20Pool__factory, "connect").mockReturnValue(pool as never);
    vi.spyOn(ERC20PoolFactory__factory, "connect").mockReturnValue({
      deployedPools: vi.fn().mockResolvedValue(poolAddress)
    } as never);
    vi.spyOn(PoolInfoUtils__factory, "connect").mockReturnValue(poolInfoUtils as never);

    const adapter = new AjnaAdapter(runtime);
    const result = await adapter.inspectBucket({
      network: "base",
      poolAddress,
      bucketIndex: 3232
    });

    expect(result).toEqual({
      network: "base",
      poolKind: "erc20-pool",
      poolAddress,
      subsetHash: null,
      bucketIndex: 3232,
      bucket: {
        price: "32",
        quoteTokens: "33",
        collateral: "34",
        bucketLP: "35",
        scale: "36",
        exchangeRate: "37",
        collateralDust: "40"
      }
    });
  });

  it("returns ERC721 pool inspection details when the target pool is ERC721", async () => {
    const poolAddress = "0x0000000000000000000000000000000000000400";
    const collateralAddress = "0x0000000000000000000000000000000000000401";
    const quoteAddress = "0x0000000000000000000000000000000000000402";
    const subsetHash = "0x93e3b87db48beb11f82ff978661ba6e96f72f582300e9724191ab4b5d7964364";
    const pool = {
      debtInfo: vi.fn().mockResolvedValue([BigNumber.from(41), BigNumber.from(42), BigNumber.from(43), BigNumber.from(44)]),
      interestRateInfo: vi.fn().mockResolvedValue([BigNumber.from(45), BigNumber.from(1_700_000_100)]),
      pledgedCollateral: vi.fn().mockResolvedValue(BigNumber.from(46)),
      poolType: vi.fn().mockResolvedValue(1),
      quoteTokenScale: vi.fn().mockResolvedValue(BigNumber.from(1_000_000))
    };
    const poolInfoUtils = {
      poolPricesInfo: vi.fn().mockResolvedValue(
        namedTuple([1, 2, 3, 4, 5, 6], {
          hpb_: BigNumber.from(1),
          hpbIndex_: BigNumber.from(2),
          htp_: BigNumber.from(3),
          htpIndex_: BigNumber.from(4),
          lup_: BigNumber.from(5),
          lupIndex_: BigNumber.from(6)
        })
      ),
      poolLoansInfo: vi.fn().mockResolvedValue(
        namedTuple([1000, 7, ethers.constants.AddressZero, 47, 48], {
          poolSize_: BigNumber.from(1000),
          loansCount_: BigNumber.from(7),
          maxBorrower_: ethers.constants.AddressZero,
          pendingInflator_: BigNumber.from(47),
          pendingInterestFactor_: BigNumber.from(48)
        })
      ),
      poolUtilizationInfo: vi.fn().mockResolvedValue(
        namedTuple([10, 11, 12, 13], {
          poolMinDebtAmount_: BigNumber.from(10),
          poolCollateralization_: BigNumber.from(11),
          poolActualUtilization_: BigNumber.from(12),
          poolTargetUtilization_: BigNumber.from(13)
        })
      ),
      poolReservesInfo: vi.fn().mockResolvedValue(
        namedTuple([14, 15, 16, 49, 50], {
          reserves_: BigNumber.from(14),
          claimableReserves_: BigNumber.from(15),
          claimableReservesRemaining_: BigNumber.from(16),
          auctionPrice_: BigNumber.from(49),
          timeRemaining_: BigNumber.from(50)
        })
      ),
      borrowFeeRate: vi.fn().mockResolvedValue(BigNumber.from(19)),
      depositFeeRate: vi.fn().mockResolvedValue(BigNumber.from(20)),
      lenderInterestMargin: vi.fn().mockResolvedValue(BigNumber.from(51))
    };

    mockBaseProvider();
    vi.spyOn(ERC721Pool__factory, "connect").mockReturnValue(pool as never);
    vi.spyOn(PoolInfoUtils__factory, "connect").mockReturnValue(poolInfoUtils as never);

    const adapter = new AjnaAdapter(runtime);
    vi.spyOn(adapter as never, "resolveInspectablePoolContext").mockResolvedValue({
      kind: "erc721-pool",
      poolAddress,
      quoteAddress,
      collateralAddress,
      subsetHash
    });
    vi.spyOn(adapter as never, "readSymbol").mockResolvedValue(null);

    const result = await adapter.inspectPool({
      network: "base",
      poolAddress,
      detailLevel: "full"
    });

    expect(result.poolKind).toBe("erc721-pool");
    expect(result.subsetHash).toBe(subsetHash);
    expect(result.full?.config.collateralScale).toBeNull();
    expect(result.full?.config.quoteTokenScale).toBe("1000000");
    expect(result.full?.totals.pledgedCollateral).toBe("46");
  });

  it("returns ERC721 bucket inspection without collateral dust", async () => {
    const poolAddress = "0x0000000000000000000000000000000000000500";
    const subsetHash = "0x93e3b87db48beb11f82ff978661ba6e96f72f582300e9724191ab4b5d7964364";
    const poolInfoUtils = {
      bucketInfo: vi.fn().mockResolvedValue(
        namedTuple([52, 53, 54, 55, 56, 57], {
          price_: BigNumber.from(52),
          quoteTokens_: BigNumber.from(53),
          collateral_: BigNumber.from(54),
          bucketLP_: BigNumber.from(55),
          scale_: BigNumber.from(56),
          exchangeRate_: BigNumber.from(57)
        })
      )
    };

    mockBaseProvider();
    vi.spyOn(PoolInfoUtils__factory, "connect").mockReturnValue(poolInfoUtils as never);

    const adapter = new AjnaAdapter(runtime);
    vi.spyOn(adapter as never, "resolveInspectablePoolContext").mockResolvedValue({
      kind: "erc721-pool",
      poolAddress,
      quoteAddress: "0x0000000000000000000000000000000000000501",
      collateralAddress: "0x0000000000000000000000000000000000000502",
      subsetHash
    });

    const result = await adapter.inspectBucket({
      network: "base",
      poolAddress,
      bucketIndex: 4500
    });

    expect(result).toEqual({
      network: "base",
      poolKind: "erc721-pool",
      poolAddress,
      subsetHash,
      bucketIndex: 4500,
      bucket: {
        price: "52",
        quoteTokens: "53",
        collateral: "54",
        bucketLP: "55",
        scale: "56",
        exchangeRate: "57",
        collateralDust: null
      }
    });
  });

  it("returns ERC721 borrower token ids in position inspection", async () => {
    const poolAddress = "0x0000000000000000000000000000000000000600";
    const owner = "0x0000000000000000000000000000000000000601";
    const pool = {
      debtInfo: vi.fn().mockResolvedValue([BigNumber.from(61), BigNumber.from(62), BigNumber.from(63), BigNumber.from(64)]),
      getBorrowerTokenIds: vi.fn().mockResolvedValue([BigNumber.from(7), BigNumber.from(9)])
    };
    const poolInfoUtils = {
      borrowerInfo: vi.fn().mockResolvedValue(
        namedTuple([61, 62, 63, 64], {
          debt_: BigNumber.from(61),
          collateral_: BigNumber.from(62),
          t0Np_: BigNumber.from(63),
          thresholdPrice_: BigNumber.from(64)
        })
      )
    };

    mockBaseProvider();
    vi.spyOn(ERC721Pool__factory, "connect").mockReturnValue(pool as never);
    vi.spyOn(PoolInfoUtils__factory, "connect").mockReturnValue(poolInfoUtils as never);

    const adapter = new AjnaAdapter(runtime);
    vi.spyOn(adapter as never, "resolveInspectablePoolContext").mockResolvedValue({
      kind: "erc721-pool",
      poolAddress,
      quoteAddress: "0x0000000000000000000000000000000000000602",
      collateralAddress: "0x0000000000000000000000000000000000000603",
      subsetHash: null
    });

    const result = await adapter.inspectPosition({
      network: "base",
      poolAddress,
      owner,
      positionType: "borrower"
    });

    expect(result).toMatchObject({
      poolKind: "erc721-pool",
      poolAddress,
      collateralTokenIds: ["7", "9"],
      debt: "61",
      collateral: "62"
    });
  });

  it("falls back to bytes32 token symbols when string decoding is not available", async () => {
    const adapter = new AjnaAdapter(runtime);
    const provider = {
      call: vi
        .fn()
        .mockResolvedValue(
          ethers.utils.defaultAbiCoder.encode(["bytes32"], [ethers.utils.formatBytes32String("MKR")])
        )
    };

    await expect(
      (adapter as never).readSymbol("0x0000000000000000000000000000000000000999", provider as never)
    ).resolves.toBe("MKR");
  });
});
