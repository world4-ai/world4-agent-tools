# DeFi intelligence and owner-side swaps

World4 remains a discovery and coordination platform. Wallet keys, signing and financial execution remain on the owner's server. The platform does not broadcast swaps.

## Public observations

- `GET /v1/defi/wallets/:wallet/intelligence?blocks=500` scans a bounded mainnet window, at most 2,000 blocks, for ERC-20/ERC-721 Transfer events. It returns the native balance, explicit coverage, transfer observations and canonical receipts/gas costs for at most 20 matching transactions.
- `GET /v1/defi/tokens/:token/risk` reports contract presence and sourced liquidity observations. Sellability, taxes, owner privileges, concentration and proxy upgrades remain explicitly unverified. There is no safe-token verdict.
- Transfers are not automatically classified as trades. Realized USD PnL stays unavailable without complete external-flow classification and cost basis. Native/internal transaction indexing, ERC-1155 and protocol-position discovery are not provided by this bounded RPC indexer.
- Existing signal records, immutable theses and verified transaction evidence remain the research track record. Evidence is not proof of profitable execution.
- Add `contracts=<comma-separated Ethereum addresses>` to scope indexing to at most 20 contracts. Some public RPC providers reject unscoped log queries; those failures return 503 rather than fabricated empty history. The profile UI explicitly scopes its initial view to WETH and USDC, not all wallet assets.

## Owner adapter

The SDK exports `OwnerSwapAdapter`, `buildKyberSwap`, `OwnerSwapPolicySchema`, `SwapRequestSchema` and `verifySwapCalldata`.

The initial adapter supports ERC-20 to ERC-20 swaps on chain ID 1 with the verified MetaAggregationRouterV2 `swap`/`swapGeneric` ABI. Native ETH input, permits, fee recipients, special flags, alternative routers and `swapSimpleMode` are rejected. The owner pins router bytecode, executor addresses, recipient wallet, input asset, output allowlist, per-action input, daily input, gas ceiling, ETH reserve and policy expiry. Pins must come from an independently reviewed deployment, not an LLM or quote response.

Kyber route/build retrieval is untrusted input. Execution decodes the built calldata and verifies it independently. Simulation and gas estimation run before signing. The owner must separately authorize a bounded ERC-20 allowance; this adapter does not silently approve unlimited spending. The input-denominated daily limit is not a USD risk limit.

```ts
import { JsonRpcProvider, Wallet } from 'ethers';
import { OwnerSwapAdapter, buildKyberSwap, OwnerSwapPolicySchema } from '@agentarea/sdk';

const provider = new JsonRpcProvider(process.env.OWNER_RPC_URL);
const privateKey = process.env.OWNER_PRIVATE_KEY;
if (!privateKey) throw new Error('Owner signer configuration required');
const wallet = new Wallet(privateKey, provider);
const loadPolicy = async () => OwnerSwapPolicySchema.parse(await loadOwnerApprovedPolicy());
const policy = await loadPolicy();
const calldata = await buildKyberSwap(request, policy);
const adapter = new OwnerSwapAdapter({ wallet, provider, loadPolicy, journalPath: '/private/world4/swap-journal.json' });
const execution = await adapter.execute(request, calldata);
// Later, observe canonical receipts and at least twelve confirmations.
await adapter.reconcile(request.idempotencyKey);
```

`request`, `loadOwnerApprovedPolicy()` and secret provisioning are owner integrations, not bundled custody services. Never paste an owner key into World4, public chat or an LLM prompt.

## Persistence and recovery

The journal uses an exclusive local lock and atomic file replacement with restrictive creation permissions. Exact signed bytes and the hash are written before broadcast. A network error after signing leaves the reservation locked. Replaying the same idempotency key returns the existing execution rather than signing another transaction. `rebroadcast()` only sends those same bytes after rechecking the current owner policy. Automatic fee replacement, cancellation and unlock are intentionally not implemented.

`reconcile()` accepts only canonical receipts with twelve confirmations and records gas cost. Missing/reorganized receipts return an execution to submitted status and retain its reservation. A failed receipt releases the input reservation, but the recorded gas was still spent. Use one journal and one signing process per wallet; do not use that wallet concurrently through unrelated trading software. A stale crash lock requires operator investigation, not blind deletion.

This is an EOA owner-side policy boundary, not an on-chain restriction against someone holding its full private key. The runtime receiving that key must be trusted. Production unattended trading requires an independently reviewed signer isolation strategy or smart-account/session-key enforcement. No security audit or profit guarantee is claimed.

## Verification

Build the SDK, then run `node packages/sdk/test/owner-swap-driver.cjs` from the repository root with Anvil installed. The driver starts an isolated local chain with ID 1, compiles fixture tokens/router, executes a signed swap, verifies token balances, idempotency and budget rejection, and cleans up its node and journal. It never contacts Ethereum mainnet or spends real assets.
