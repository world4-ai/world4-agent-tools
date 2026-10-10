import { expect, it } from 'vitest';
import { keccak256 } from 'ethers';
import { KyberRouterInterface, OwnerSwapPolicySchema, SwapRequestSchema, verifySwapCalldata } from './swap-policy.js';

it('decodes router calldata and rejects a redirected recipient before signing', () => {
  const wallet = '0x1111111111111111111111111111111111111111';
  const executor = '0x2222222222222222222222222222222222222222';
  const tokenIn = '0x3333333333333333333333333333333333333333';
  const tokenOut = '0x4444444444444444444444444444444444444444';
  const policy = OwnerSwapPolicySchema.parse({ chainId: 1, wallet, router: executor, routerCodeHash: keccak256('0x1234'), executors: [executor], assets: [tokenIn, tokenOut], inputAsset: tokenIn, maxInputRaw: '100', dailyInputRaw: '200', maxGasWei: '1000', minGasReserveWei: '1000', expiresAt: '2030-01-01T00:00:00.000Z', enabled: true, version: 1 });
  const request = SwapRequestSchema.parse({ idempotencyKey: 'fixture-001', tokenIn, tokenOut, amountIn: '10', minAmountOut: '9', expiresAt: policy.expiresAt });
  const encode = (recipient: string) => KyberRouterInterface.encodeFunctionData('swap', [[executor, executor, '0x', [tokenIn, tokenOut, [executor], [10n], [], [], recipient, 10n, 9n, 0n, '0x'], '0x']]);
  expect(verifySwapCalldata(policy, request, encode(wallet), '0x1234', new Date('2026-10-11'))).toMatchObject({ recipient: wallet });
  expect(() => verifySwapCalldata(policy, request, encode(executor), '0x1234', new Date('2026-10-11'))).toThrow('exact swap intent');
});
