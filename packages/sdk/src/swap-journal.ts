import { mkdir, open, readFile, rename, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';
import { z } from 'zod';
import { SwapRequestSchema } from './swap-policy.js';

export const ExecutionSchema = z.object({ request: SwapRequestSchema, policyVersion: z.number().int(),
  createdAt: z.string().datetime(), status: z.enum(['prepared', 'submitted', 'confirmed', 'failed']),
  hash: z.string(), signedTransaction: z.string(), blockHash: z.string().nullable(), gasCostWei: z.string().nullable() });
export type SwapExecution = z.infer<typeof ExecutionSchema>;
const JournalSchema = z.object({ wallet: z.string(), executions: z.array(ExecutionSchema) });
export async function withSwapJournal<T>(path: string, wallet: string,
  operation: (journal: z.infer<typeof JournalSchema>, save: () => Promise<void>) => Promise<T>): Promise<T> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const lock = await open(`${path}.lock`, 'wx', 0o600);
  try {
    let journal: z.infer<typeof JournalSchema>;
    try { journal = JournalSchema.parse(JSON.parse(await readFile(path, 'utf8'))); }
    catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
      journal = { wallet, executions: [] };
    }
    if (journal.wallet !== wallet) throw new Error('Execution journal belongs to another wallet');
    const save = async () => {
      const next = await open(`${path}.next`, 'w', 0o600);
      try { await next.writeFile(JSON.stringify(journal)); await next.sync(); }
      finally { await next.close(); }
      await rename(`${path}.next`, path);
    };
    return await operation(journal, save);
  } finally { await lock.close(); await unlink(`${path}.lock`); }
}
