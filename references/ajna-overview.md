# Ajna Overview

Use this file when you need more protocol context than `SKILL.md` should carry.

## Core mental model

- Ajna is a permissionless lending protocol with no external price oracles.
- A pool is defined by a quote token and a collateral asset.
- Lenders choose price buckets. Borrowers borrow against available quote
  liquidity in the pool.
- Bucket selection is not cosmetic. It affects where liquidity sits and how a
  lender participates.

## Pool types

### ERC20 pools

- Collateral is an ERC20 token.
- This v1 skill's explicit `prepare-lend` and `prepare-borrow` commands target
  ERC20 pools.

### ERC721 pools

- Collateral is an NFT collection or subset.
- Subset pools are defined by a token-id subset hash, not just a collection
  address.
- This skill supports creating ERC721 pools and preparing ERC721 approvals, but
  not first-class ERC721 lend/borrow flows yet.

## Buckets

A bucket is a discrete price level inside an Ajna pool. Relevant bucket reads:

- `bucketIndex`: the discrete price index you are targeting
- `price`: normalized bucket price
- `quoteTokens`: quote liquidity currently sitting in the bucket
- `collateral`: collateral sitting in the bucket
- `bucketLP`: LP balance at that bucket
- `exchangeRate`: LP exchange rate for the bucket
- `collateralDust`: residual collateral dust

Practical rule: if a user wants to lend at a specific bucket, inspect that
bucket first instead of relying only on pool-wide summary data.

## Realistic operating flows

### Create a new pool

1. Prepare and execute pool creation.
2. Capture `resolvedPoolAddress`.
3. Inspect the new pool.
4. Seed quote liquidity before expecting borrow activity.

### Lend into an ERC20 pool

1. Inspect the pool.
2. Inspect the target bucket.
3. Prepare lend.
4. Review the prepared payload.
5. Execute.
6. Re-inspect the bucket or lender position.

### Borrow from an ERC20 pool

1. Inspect the pool in full mode.
2. Inspect the borrower position if one already exists.
3. Confirm the pool actually has usable quote liquidity.
4. Prepare borrow.
5. Review and execute.
6. Re-inspect the borrower position.

### Unsupported Ajna-native action

1. Use the first-class command if one exists.
2. Use `prepare-unsupported-ajna-action` only if the operator explicitly wants
   an unsupported Ajna-native call.
3. Prefer built-in `contractKind` ABI resolution over custom ABI fragments.
4. Verify the resulting onchain state with an explicit read after execution.

## Units and scaling

- Inputs are big-integer strings, not human-friendly decimal strings.
- In this repo, Ajna action fixtures for lend and borrow use WAD precision.
- Funding transfers used only to seed fork-test wallets use token-native units.
- If there is any doubt about scaling, check the exact command examples in
  `README.md` and do not improvise decimal conversion from memory.

## Common mistakes

- Treating pool creation as equivalent to pool usability.
- Forgetting that ERC20 and ERC721 pools have different behavior and setup.
- Lending or borrowing without first checking bucket or pool state.
- Reusing a prepared payload after the signer nonce moved.
- Assuming a mined transaction means the economic result was the intended one.

## Skill boundary

This skill is intentionally narrow:

- explicit read commands for common Ajna state
- explicit prepare commands for common writes
- one reviewed execution path
- one gated advanced escape hatch for unsupported Ajna-native calls

It is not a generic wallet tool, deployment tool, or portfolio optimizer.
