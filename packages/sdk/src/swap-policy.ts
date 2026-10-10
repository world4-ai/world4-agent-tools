import { Interface, getAddress, keccak256 } from 'ethers';
import { z } from 'zod';

const Address = z.string().transform(value => getAddress(value));
const Uint = z.string().regex(/^(0|[1-9]\d*)$/).max(78);
export const OwnerSwapPolicySchema = z.object({ chainId: z.literal(1), wallet: Address, router: Address,
  routerCodeHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/), executors: z.array(Address).min(1), assets: z.array(Address).min(2),
  maxInputRaw: Uint, dailyInputRaw: Uint, inputAsset: Address, maxGasWei: Uint, minGasReserveWei: Uint,
  expiresAt: z.string().datetime(), enabled: z.boolean(), version: z.number().int().positive() }).strict();
export type OwnerSwapPolicy = z.infer<typeof OwnerSwapPolicySchema>;
export const SwapRequestSchema = z.object({ idempotencyKey: z.string().min(8).max(100), tokenIn: Address, tokenOut: Address,
  amountIn: Uint.refine(value => BigInt(value) > 0n), minAmountOut: Uint.refine(value => BigInt(value) > 0n),
  expiresAt: z.string().datetime() }).strict();
export type SwapRequest = z.infer<typeof SwapRequestSchema>;
const description = '(address srcToken,address dstToken,address[] srcReceivers,uint256[] srcAmounts,address[] feeReceivers,uint256[] feeAmounts,address dstReceiver,uint256 amount,uint256 minReturnAmount,uint256 flags,bytes permit)';
export const KyberRouterInterface = new Interface([
  `function swap((address callTarget,address approveTarget,bytes targetData,${description} desc,bytes clientData) execution) payable returns(uint256,uint256)`,
  `function swapGeneric((address callTarget,address approveTarget,bytes targetData,${description} desc,bytes clientData) execution) payable returns(uint256,uint256)`,
]);
export class SwapPolicyError extends Error {}
export function verifySwapCalldata(policy: OwnerSwapPolicy, request: SwapRequest, data: string, code: string, now: Date) {
  if (!policy.enabled || Date.parse(policy.expiresAt) <= now.getTime() || Date.parse(request.expiresAt) <= now.getTime()) throw new SwapPolicyError('Policy or request expired/disabled');
  if (request.tokenIn !== policy.inputAsset || !policy.assets.includes(request.tokenOut) || request.tokenIn === request.tokenOut || BigInt(request.amountIn) > BigInt(policy.maxInputRaw)) throw new SwapPolicyError('Asset or input amount exceeds owner mandate');
  if (keccak256(code).toLowerCase() !== policy.routerCodeHash.toLowerCase()) throw new SwapPolicyError('Router bytecode differs from owner pin');
  const transaction = KyberRouterInterface.parseTransaction({ data });
  if (!transaction || !['swap', 'swapGeneric'].includes(transaction.name)) throw new SwapPolicyError('Unsupported router function');
  const execution = transaction.args[0]; const desc = execution.desc;
  if (!policy.executors.includes(getAddress(execution.callTarget)) || !policy.executors.includes(getAddress(execution.approveTarget))) throw new SwapPolicyError('Executor outside owner allowlist');
  if (getAddress(desc.srcToken) !== request.tokenIn || getAddress(desc.dstToken) !== request.tokenOut || getAddress(desc.dstReceiver) !== policy.wallet || BigInt(desc.amount) !== BigInt(request.amountIn) || BigInt(desc.minReturnAmount) < BigInt(request.minAmountOut)) throw new SwapPolicyError('Calldata violates exact swap intent');
  if (desc.permit !== '0x' || desc.feeReceivers.length || desc.feeAmounts.length || BigInt(desc.flags) !== 0n) throw new SwapPolicyError('Permits, fees and special flags are not authorized');
  const receivers = z.array(Address).parse(Array.from(desc.srcReceivers));
  const amounts = z.array(z.bigint()).parse(Array.from(desc.srcAmounts));
  if (receivers.length !== amounts.length || !receivers.length || receivers.some(value => !policy.executors.includes(value)) || amounts.reduce((sum, value) => sum + value, 0n) !== BigInt(request.amountIn)) throw new SwapPolicyError('Input distribution outside owner allowlist');
  return { data, recipient: policy.wallet, amountIn: request.amountIn, minAmountOut: request.minAmountOut };
}
