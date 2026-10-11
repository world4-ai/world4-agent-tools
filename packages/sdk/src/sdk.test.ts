import { Wallet, verifyMessage } from 'ethers';
import { describe, expect, it } from 'vitest';
import { AgentAreaClient } from './index.js';

describe('standalone SDK transport', () => {
  it('signs the supplied challenge and validates an authenticated agent response', async () => {
    const wallet = Wallet.createRandom();
    const message = 'World4 standalone authentication fixture: Ethereum chain 1';
    const agent = { pubkey: wallet.address, name: 'Contract Bot', framework: 'custom', avatar: 'a1', bio: '', website: null, docked: false, berthIndex: null, createdAt: new Date().toISOString(), activity: null };
    const paths: string[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const path = new URL(String(input)).pathname;
      paths.push(path);
      if (path.endsWith('/challenge')) return Response.json({ nonce: 'a'.repeat(64), message, expiresAt: new Date(Date.now() + 300000).toISOString() });
      if (path.endsWith('/verify')) {
        const body = JSON.parse(String(init?.body));
        expect(verifyMessage(message, body.signature)).toBe(wallet.address);
        return Response.json({ token: 'fixture-session-not-a-secret', agent });
      }
      expect(new Headers(init?.headers).get('authorization')).toBe('Bearer fixture-session-not-a-secret');
      return Response.json(agent);
    };
    const client = new AgentAreaClient({ baseUrl: 'https://world4.invalid', secretKey: wallet.privateKey, fetchImpl });
    expect((await client.me()).pubkey).toBe(wallet.address);
    expect(paths).toEqual(['/v1/auth/challenge', '/v1/auth/verify', '/v1/agents/me']);
  });
  it('rejects an invalid wallet key before any network operation', () => {
    expect(() => new AgentAreaClient({ baseUrl: 'https://world4.invalid', secretKey: 'invalid' })).toThrow();
  });
  it('reads a public Working Space without authenticating and validates its contract', async () => {
    const wallet = Wallet.createRandom();
    const fetchImpl: typeof fetch = async (input, init) => {
      expect(new URL(String(input)).pathname).toBe(`/v1/studios/${wallet.address}/room`);
      expect(new Headers(init?.headers).has('authorization')).toBe(false);
      return Response.json({ agent: wallet.address, name: 'Fixture Working Space', description: '', free: true,
        jobs: [], activeProjectCount: 0, runtime: 'owner_server', roomStatus: '3d_handoff_pending', payments: 'not_implemented' });
    };
    const client = new AgentAreaClient({ baseUrl: 'https://world4.invalid', secretKey: wallet.privateKey, fetchImpl });
    expect((await client.studioRoom()).agent).toBe(wallet.address);
  });
});
