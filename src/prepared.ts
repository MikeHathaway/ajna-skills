import { ethers } from "ethers";

import { canonicalize } from "./json.js";
import { AjnaSkillError, invariant } from "./errors.js";
import type { PreparedAction, PreparedTransaction, RuntimeConfig } from "./types.js";

type UnsignedPreparedAction = Omit<
  PreparedAction,
  "digest" | "signature" | "signatureStatus" | "signatureReason"
>;

type PreparedActionSignaturePayload = {
  preparedVersion: number;
  kind: PreparedAction["kind"];
  network: PreparedAction["network"];
  actorAddress: string;
  poolAddress: string;
  startingNonce: number;
  expiresAt: string;
  digest: string;
};

type Eip712Types = Record<string, Array<{ name: string; type: string }>>;

const PREPARED_ACTION_EIP712_DOMAIN = {
  name: "Ajna Prepared Action",
  version: "1"
} as const;

export const PREPARED_ACTION_EIP712_TYPES: Eip712Types = {
  PreparedAction: [
    { name: "preparedVersion", type: "uint256" },
    { name: "kind", type: "string" },
    { name: "network", type: "string" },
    { name: "actorAddress", type: "address" },
    { name: "poolAddress", type: "address" },
    { name: "startingNonce", type: "uint256" },
    { name: "expiresAt", type: "string" },
    { name: "digest", type: "bytes32" }
  ]
};

export async function finalizePreparedAction(
  unsigned: UnsignedPreparedAction,
  runtime: RuntimeConfig
): Promise<PreparedAction> {
  const digest = computePreparedDigest(unsigned);
  const typedDomain = buildPreparedActionSignatureDomain(unsigned.chainId);
  const typedPayload = buildPreparedActionSignaturePayload(unsigned, digest);
  const signer = runtime.signerPrivateKey
    ? new ethers.Wallet(runtime.signerPrivateKey)
    : undefined;

  let signature: string | null = null;
  let signatureStatus: PreparedAction["signatureStatus"] = "unsigned";
  let signatureReason: PreparedAction["signatureReason"] = null;

  if (signer && sameAddress(signer.address, unsigned.actorAddress)) {
    signature = await signer._signTypedData(typedDomain, PREPARED_ACTION_EIP712_TYPES, typedPayload);
    signatureStatus = "signed";
  } else if (signer) {
    signatureReason = "signer_mismatch";
  } else {
    signatureReason = "missing_signer";
  }

  return {
    ...unsigned,
    digest,
    signature,
    signatureStatus,
    signatureReason
  };
}

export function computePreparedDigest(unsigned: UnsignedPreparedAction): string {
  return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(canonicalize(unsigned)));
}

export function buildPreparedActionSignatureDomain(chainId: number): ethers.TypedDataDomain {
  return {
    ...PREPARED_ACTION_EIP712_DOMAIN,
    chainId
  };
}

export function buildPreparedActionSignaturePayload(
  action: Pick<
    UnsignedPreparedAction,
    "version" | "kind" | "network" | "actorAddress" | "poolAddress" | "startingNonce" | "expiresAt"
  >,
  digest: string
): PreparedActionSignaturePayload {
  return {
    preparedVersion: action.version,
    kind: action.kind,
    network: action.network,
    actorAddress: action.actorAddress,
    poolAddress: action.poolAddress,
    startingNonce: action.startingNonce,
    expiresAt: action.expiresAt,
    digest
  };
}

export function validatePreparedAction(
  preparedAction: PreparedAction,
  runtime: RuntimeConfig
): void {
  invariant(preparedAction.version === 1, "INVALID_PREPARED_VERSION", "Unsupported prepared action version");
  invariant(
    preparedAction.transactions.length > 0,
    "EMPTY_PREPARED_ACTION",
    "Prepared action must contain at least one transaction"
  );
  invariant(
    Number.isInteger(preparedAction.startingNonce) && preparedAction.startingNonce >= 0,
    "INVALID_PREPARED_NONCE",
    "Prepared action starting nonce must be a non-negative integer",
    {
      startingNonce: preparedAction.startingNonce
    }
  );

  const unsigned: UnsignedPreparedAction = {
    version: preparedAction.version,
    kind: preparedAction.kind,
    network: preparedAction.network,
    chainId: preparedAction.chainId,
    actorAddress: preparedAction.actorAddress,
    startingNonce: preparedAction.startingNonce,
    poolAddress: preparedAction.poolAddress,
    quoteAddress: preparedAction.quoteAddress,
    collateralAddress: preparedAction.collateralAddress,
    createdAt: preparedAction.createdAt,
    expiresAt: preparedAction.expiresAt,
    transactions: preparedAction.transactions,
    metadata: preparedAction.metadata
  };

  const expectedDigest = computePreparedDigest(unsigned);
  const typedDomain = buildPreparedActionSignatureDomain(preparedAction.chainId);
  const typedPayload = buildPreparedActionSignaturePayload(unsigned, expectedDigest);
  invariant(
    expectedDigest === preparedAction.digest,
    "PREPARED_DIGEST_MISMATCH",
    "Prepared action digest does not match payload"
  );

  invariant(
    Date.now() <= new Date(preparedAction.expiresAt).getTime(),
    "PREPARED_ACTION_EXPIRED",
    "Prepared action has expired",
    { expiresAt: preparedAction.expiresAt }
  );

  invariant(runtime.executeSignerAddress, "MISSING_SIGNER", "Execution requires AJNA_SIGNER_PRIVATE_KEY");
  invariant(
    sameAddress(runtime.executeSignerAddress, preparedAction.actorAddress),
    "SIGNER_MISMATCH",
    "Configured signer does not match prepared actor address",
    {
      signer: runtime.executeSignerAddress,
      actorAddress: preparedAction.actorAddress
    }
  );
  invariant(
    preparedAction.signature,
    "UNSIGNED_PREPARED_ACTION",
    "Prepared action was not signed by the execution signer"
  );
  invariant(
    preparedAction.signatureStatus === "signed",
    "UNSIGNED_PREPARED_ACTION",
    "Prepared action was not signed by the execution signer",
    {
      signatureStatus: preparedAction.signatureStatus,
      signatureReason: preparedAction.signatureReason
    }
  );

  const recovered = ethers.utils.verifyTypedData(
    typedDomain,
    PREPARED_ACTION_EIP712_TYPES,
    typedPayload,
    preparedAction.signature
  );

  invariant(
    sameAddress(recovered, preparedAction.actorAddress),
    "INVALID_PREPARED_SIGNATURE",
    "Prepared action signature does not recover to actor address"
  );
}

export function txSummaryHash(transactions: PreparedTransaction[]): string {
  return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(canonicalize(transactions)));
}

function sameAddress(left: string, right: string): boolean {
  try {
    return ethers.utils.getAddress(left) === ethers.utils.getAddress(right);
  } catch (error) {
    throw new AjnaSkillError("INVALID_ADDRESS", "Address comparison failed", {
      left,
      right,
      cause: error instanceof Error ? error.message : String(error)
    });
  }
}
