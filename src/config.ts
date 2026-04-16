import { ethers } from "ethers";

import { NETWORK_DEFAULTS } from "./constants.js";
import { AjnaSkillError } from "./errors.js";
import type { AjnaNetwork, AjnaSkillMode, RuntimeConfig, RuntimeNetworkConfig } from "./types.js";

export function loadRuntimeConfig(): RuntimeConfig {
  const mode = loadMode();
  const signerPrivateKey = process.env.AJNA_SIGNER_PRIVATE_KEY;
  const executeSignerAddress = signerPrivateKey
    ? new ethers.Wallet(signerPrivateKey).address
    : undefined;
  const prepareSignerAddress = signerPrivateKey && mode !== "inspect"
    ? new ethers.Wallet(signerPrivateKey).address
    : undefined;

  return {
    mode,
    signerPrivateKey,
    executeSignerAddress: mode === "execute" ? executeSignerAddress : prepareSignerAddress,
    unsafeUnsupportedActionsEnabled: loadBooleanEnv("AJNA_ENABLE_UNSAFE_SDK_CALLS"),
    networks: {
      ...(buildNetworkConfig("base") ? { base: buildNetworkConfig("base") } : {}),
      ...(buildNetworkConfig("ethereum") ? { ethereum: buildNetworkConfig("ethereum") } : {})
    }
  };
}

function loadMode(): AjnaSkillMode {
  const raw = (process.env.AJNA_SKILLS_MODE ?? "inspect").toLowerCase();
  if (raw === "inspect" || raw === "prepare" || raw === "execute") {
    return raw;
  }

  throw new AjnaSkillError("INVALID_MODE", "AJNA_SKILLS_MODE must be inspect, prepare, or execute", {
    received: raw
  });
}

function buildNetworkConfig(network: AjnaNetwork): RuntimeNetworkConfig | undefined {
  const preset = NETWORK_DEFAULTS[network];
  const rpcUrl =
    process.env[`AJNA_RPC_URL_${network.toUpperCase()}`] ??
    (network === "ethereum" ? process.env.AJNA_RPC_URL_ETHEREUM : undefined) ??
    process.env.AJNA_RPC_URL;

  if (!rpcUrl) {
    return undefined;
  }

  return {
    ...preset,
    rpcUrl
  };
}

function loadBooleanEnv(name: string): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}
