import { ethers } from "ethers";
import { describe, expect, it } from "vitest";

import {
  PREPARED_ACTION_EIP712_TYPES,
  buildPreparedActionSignatureDomain,
  buildPreparedActionSignaturePayload,
  validatePreparedAction
} from "../src/prepared.js";
import { buildPreparedFixture } from "./helpers/prepared.js";
import { buildTestRuntime } from "./helpers/runtime.js";

describe("prepared action integrity", () => {
  it("signs and validates when signer matches actor", async () => {
    const wallet = ethers.Wallet.createRandom();
    const runtime = buildTestRuntime({
      mode: "execute",
      signerPrivateKey: wallet.privateKey,
      executeSignerAddress: wallet.address
    });

    const prepared = await buildPreparedFixture(wallet, { startingNonce: 7 }, runtime);

    expect(prepared.signature).toBeTruthy();
    expect(prepared.signatureStatus).toBe("signed");
    expect(prepared.signatureReason).toBeNull();
    expect(
      ethers.utils.verifyTypedData(
        buildPreparedActionSignatureDomain(prepared.chainId),
        PREPARED_ACTION_EIP712_TYPES,
        buildPreparedActionSignaturePayload(prepared, prepared.digest),
        prepared.signature as string
      )
    ).toBe(wallet.address);
    expect(() => validatePreparedAction(prepared, runtime)).not.toThrow();
  });

  it("rejects tampered payloads", async () => {
    const wallet = ethers.Wallet.createRandom();
    const runtime = buildTestRuntime({
      mode: "execute",
      signerPrivateKey: wallet.privateKey,
      executeSignerAddress: wallet.address
    });

    const prepared = await buildPreparedFixture(
      wallet,
      {
        kind: "borrow",
        startingNonce: 11
      },
      runtime
    );

    const tampered = {
      ...prepared,
      metadata: {
        ...prepared.metadata,
        amount: "999"
      }
    };

    expect(() => validatePreparedAction(tampered, runtime)).toThrow(/digest/i);
  });

  it("rejects legacy signMessage signatures for prepared payloads", async () => {
    const wallet = ethers.Wallet.createRandom();
    const runtime = buildTestRuntime({
      mode: "execute",
      signerPrivateKey: wallet.privateKey,
      executeSignerAddress: wallet.address
    });

    const prepared = await buildPreparedFixture(wallet, { startingNonce: 3 }, runtime);
    const legacySigned = {
      ...prepared,
      signature: await wallet.signMessage(ethers.utils.arrayify(prepared.digest))
    };

    expect(() => validatePreparedAction(legacySigned, runtime)).toThrow(/signature/i);
  });

  it("marks prepared payloads as unsigned when no matching signer is available", async () => {
    const wallet = ethers.Wallet.createRandom();
    const runtime = buildTestRuntime({
      mode: "prepare",
      networks: {}
    });

    const prepared = await buildPreparedFixture(wallet, { startingNonce: 1 }, runtime);

    expect(prepared.signature).toBeNull();
    expect(prepared.signatureStatus).toBe("unsigned");
    expect(prepared.signatureReason).toBe("missing_signer");
  });
});
