import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { withSwapJournal } from './swap-journal.js';

it('persists reservations and excludes simultaneous journal owners', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'world4-swap-'));
  const path = join(directory, 'journal.json');
  try {
    await withSwapJournal(path, 'wallet-a', async (journal, save) => {
      await expect(withSwapJournal(path, 'wallet-a', async () => undefined)).rejects.toThrow();
      await save();
      expect(journal.executions).toEqual([]);
    });
    await expect(withSwapJournal(path, 'wallet-b', async () => undefined)).rejects.toThrow('another wallet');
    expect(await withSwapJournal(path, 'wallet-a', async journal => journal.wallet)).toBe('wallet-a');
  } finally { await rm(directory, { recursive: true, force: true }); }
});
