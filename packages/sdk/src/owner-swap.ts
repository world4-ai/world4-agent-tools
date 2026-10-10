import { Interface, JsonRpcProvider, Transaction, Wallet, getAddress } from 'ethers';
import { z } from 'zod';
import { OwnerSwapPolicySchema, SwapPolicyError, SwapRequestSchema, verifySwapCalldata, type OwnerSwapPolicy, type SwapRequest } from './swap-policy.js';
import { withSwapJournal, type SwapExecution } from './swap-journal.js';

const Erc20 = new Interface(['function allowance(address,address) view returns(uint256)', 'function balanceOf(address) view returns(uint256)']);
export type OwnerSwapOptions = { readonly wallet: Wallet; readonly provider: JsonRpcProvider; readonly journalPath: string;
  readonly loadPolicy: () => Promise<OwnerSwapPolicy>; readonly now?: () => Date };
export class OwnerSwapAdapter {
  constructor(private readonly options: OwnerSwapOptions) {}
  async execute(input: SwapRequest, calldata: string): Promise<SwapExecution> {
    const request = SwapRequestSchema.parse(input); const { wallet, provider } = this.options;
    return withSwapJournal(this.options.journalPath, wallet.address, async (journal, save) => {
      const existing = journal.executions.find(item => item.request.idempotencyKey === request.idempotencyKey);
      if (existing) {
        if (JSON.stringify(existing.request) !== JSON.stringify(request)) throw new SwapPolicyError('Idempotency key reused for a different swap');
        return existing;
      }
      const now = this.options.now?.() ?? new Date();
      const policy = OwnerSwapPolicySchema.parse(await this.options.loadPolicy());
      if (policy.wallet !== wallet.address || (await provider.getNetwork()).chainId !== 1n) throw new SwapPolicyError('Owner wallet or network differs from mandate');
      const code = await provider.getCode(policy.router);
      verifySwapCalldata(policy, request, calldata, code, now);
      const reservations = journal.executions.filter(item => item.status !== 'failed' &&
        (item.status !== 'confirmed' || item.createdAt.slice(0, 10) === now.toISOString().slice(0, 10)));
      if (reservations.some(item => item.request.tokenIn !== policy.inputAsset)) throw new SwapPolicyError('Input asset cannot change while incompatible reservations remain');
      const reserved = reservations.reduce((sum, item) => sum + BigInt(item.request.amountIn), 0n);
      if (reserved + BigInt(request.amountIn) > BigInt(policy.dailyInputRaw)) throw new SwapPolicyError('Daily input budget exhausted');
      const allowanceResult = await provider.call({ to: request.tokenIn, data: Erc20.encodeFunctionData('allowance', [wallet.address, policy.router]) });
      const allowance = z.bigint().parse(Erc20.decodeFunctionResult('allowance', allowanceResult)[0]);
      if (allowance < BigInt(request.amountIn)) throw new SwapPolicyError('Owner must separately grant a bounded token allowance');
      const balanceResult = await provider.call({ to: request.tokenIn, data: Erc20.encodeFunctionData('balanceOf', [wallet.address]) });
      if (z.bigint().parse(Erc20.decodeFunctionResult('balanceOf', balanceResult)[0]) < BigInt(request.amountIn)) throw new SwapPolicyError('Insufficient input token balance');
      const transaction = { to: policy.router, from: wallet.address, data: calldata, value: 0n };
      await provider.call(transaction);
      const gasLimit = (await provider.estimateGas(transaction)) * 120n / 100n;
      const fee = await provider.getFeeData();
      if (fee.maxFeePerGas === null || fee.maxPriorityFeePerGas === null) throw new SwapPolicyError('EIP-1559 fee data unavailable');
      const gasBudget = gasLimit * fee.maxFeePerGas;
      if (gasBudget > BigInt(policy.maxGasWei) || (await provider.getBalance(wallet.address)) < gasBudget + BigInt(policy.minGasReserveWei)) throw new SwapPolicyError('Gas limit or ETH reserve violated');
      const latestPolicy = OwnerSwapPolicySchema.parse(await this.options.loadPolicy());
      if (JSON.stringify(latestPolicy) !== JSON.stringify(policy)) throw new SwapPolicyError('Owner mandate changed during preparation');
      verifySwapCalldata(latestPolicy, request, calldata, await provider.getCode(policy.router), this.options.now?.() ?? new Date());
      const nonce = await provider.getTransactionCount(wallet.address, 'pending');
      const signedTransaction = await wallet.signTransaction({ ...transaction, chainId: 1, type: 2, nonce, gasLimit,
        maxFeePerGas: fee.maxFeePerGas, maxPriorityFeePerGas: fee.maxPriorityFeePerGas });
      const hash = Transaction.from(signedTransaction).hash;
      if (!hash) throw new SwapPolicyError('Signed transaction hash unavailable');
      const execution: SwapExecution = { request, policyVersion: policy.version, createdAt: now.toISOString(), status: 'prepared',
        hash, signedTransaction, blockHash: null, gasCostWei: null };
      journal.executions.push(execution); await save();
      // Persist the exact signed bytes before network I/O; ambiguous broadcasts stay reserved.
      await provider.broadcastTransaction(signedTransaction);
      execution.status = 'submitted'; await save(); return execution;
    });
  }
  async reconcile(idempotencyKey: string): Promise<SwapExecution> {
    const { provider, wallet } = this.options;
    return withSwapJournal(this.options.journalPath, wallet.address, async (journal, save) => {
      const execution = journal.executions.find(item => item.request.idempotencyKey === idempotencyKey);
      if (!execution) throw new SwapPolicyError('Execution not found');
      if ((await provider.getNetwork()).chainId !== 1n) throw new SwapPolicyError('Wrong network');
      const receipt = await provider.getTransactionReceipt(execution.hash);
      if (!receipt) {
        if (execution.status === 'confirmed' || execution.status === 'failed') { execution.status = 'submitted'; execution.blockHash = null; await save(); }
        return execution;
      }
      const block = await provider.getBlock(receipt.blockNumber);
      if (block?.hash !== receipt.blockHash || await receipt.confirmations() < 12) {
        execution.status = 'submitted'; execution.blockHash = null; await save(); return execution;
      }
      execution.status = receipt.status === 1 ? 'confirmed' : 'failed'; execution.blockHash = receipt.blockHash;
      execution.gasCostWei = (receipt.gasUsed * receipt.gasPrice).toString(); await save(); return execution;
    });
  }
  async rebroadcast(idempotencyKey: string): Promise<SwapExecution> {
    const { provider, wallet } = this.options;
    return withSwapJournal(this.options.journalPath, wallet.address, async (journal, save) => {
      const execution = journal.executions.find(item => item.request.idempotencyKey === idempotencyKey);
      if (!execution || execution.status !== 'prepared') throw new SwapPolicyError('Only an ambiguous prepared transaction may be rebroadcast');
      const policy = OwnerSwapPolicySchema.parse(await this.options.loadPolicy());
      const transaction = Transaction.from(execution.signedTransaction);
      if (policy.version !== execution.policyVersion || transaction.from !== wallet.address || transaction.to !== policy.router || transaction.chainId !== 1n || (await provider.getNetwork()).chainId !== 1n) throw new SwapPolicyError('Execution mandate changed');
      verifySwapCalldata(policy, execution.request, transaction.data, await provider.getCode(policy.router), this.options.now?.() ?? new Date());
      await provider.broadcastTransaction(execution.signedTransaction);
      execution.status = 'submitted'; await save(); return execution;
    });
  }
}

export async function buildKyberSwap(request: SwapRequest, policy: OwnerSwapPolicy, fetchImpl: typeof fetch = fetch): Promise<string> {
  const parsed = SwapRequestSchema.parse(request); const owner = OwnerSwapPolicySchema.parse(policy);
  const query = new URLSearchParams({ tokenIn: parsed.tokenIn, tokenOut: parsed.tokenOut, amountIn: parsed.amountIn });
  const routeResponse = await fetchImpl(`https://aggregator-api.kyberswap.com/ethereum/api/v1/routes?${query}`, { signal: AbortSignal.timeout(10_000) });
  if (!routeResponse.ok) throw new SwapPolicyError('Kyber route unavailable');
  const route = z.object({ code: z.literal(0), data: z.object({ routerAddress: z.string(), routeSummary: z.object({ tokenIn: z.string(), tokenOut: z.string(), amountIn: z.string() }).passthrough() }) }).parse(await routeResponse.json());
  if (getAddress(route.data.routerAddress) !== owner.router || getAddress(route.data.routeSummary.tokenIn) !== parsed.tokenIn || getAddress(route.data.routeSummary.tokenOut) !== parsed.tokenOut || route.data.routeSummary.amountIn !== parsed.amountIn) throw new SwapPolicyError('Kyber route differs from requested assets/router');
  const response = await fetchImpl('https://aggregator-api.kyberswap.com/ethereum/api/v1/route/build', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ routeSummary: route.data.routeSummary, sender: owner.wallet, recipient: owner.wallet, slippageTolerance: 0 }), signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new SwapPolicyError('Kyber calldata build unavailable');
  return z.object({ code: z.literal(0), data: z.object({ data: z.string().regex(/^0x[0-9a-fA-F]+$/) }) }).parse(await response.json()).data.data;
}
