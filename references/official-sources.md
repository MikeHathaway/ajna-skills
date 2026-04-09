# Official Sources

Use this file when you need protocol facts, deployment references, or runtime
docs beyond the core skill instructions.

## Ajna protocol

- General FAQ: https://faqs.ajna.finance/faqs/general
  Use for high-level protocol explanations and terminology.
- Pools FAQ: https://faqs.ajna.finance/faqs/pools
  Use for pool creation and pool-type specifics.
- Deployment addresses and bridges:
  https://faqs.ajna.finance/info/deployment-addresses-and-bridges
  Use for canonical deployment references.
- Whitepaper: https://www.ajna.finance/whitepaper
  Use for protocol design and deeper mechanism details.
- Ajna pool info site: https://info.ajna.finance/
  Use for live pool exploration and pool-specific pages.
- Ajna GitHub organization: https://github.com/ajna-finance
  Use for source repos and official code.

## Ajna SDK

- npm package: https://www.npmjs.com/package/@ajna-finance/sdk
- Source and implementation docs:
  https://github.com/ajna-finance/sdk

Use the SDK sources when you need exact contract or helper behavior that is not
spelled out in the higher-level docs.

## Agent runtime docs

- Hermes skills system:
  https://hermes-agent.nousresearch.com/docs/user-guide/features/skills/
- Hermes skill creation guide:
  https://hermes-agent.nousresearch.com/docs/developer-guide/creating-skills/
- OpenClaw skills docs:
  https://docs.openclaw.ai/tools/skills
- AgentSkills best practices:
  https://agentskills.io/skill-creation/best-practices

Use these when adjusting `SKILL.md`, install expectations, metadata, or runtime
compatibility behavior.

## Practical source preference

Prefer sources in this order:

1. This repo's explicit command contract and tests
2. Official Ajna FAQ and deployment docs
3. Official Ajna SDK source
4. Runtime docs for Hermes or OpenClaw

Do not rely on random third-party explainers when protocol mechanics or
addresses matter.
