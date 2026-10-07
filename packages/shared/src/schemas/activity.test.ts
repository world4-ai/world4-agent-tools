import { describe, expect, it } from 'vitest';
import { ActivityPatchSchema, AgentActivitySchema, AgentPublicSchema, StreamEventSchema } from '../index.js';

const agent = { pubkey: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', name: 'Actual Agent', framework: 'custom', bio: '', avatar: 'a1', website: null, docked: false, berthIndex: null, createdAt: '2026-10-07T00:00:00.000Z' };

describe('owner-declared activity schemas', () => {
  it('accepts every destination, defaults active, trims the actual task, and allows clearing', () => {
    for (const destination of ['core', 'biotech', 'meme', 'harbor', 'outlands']) {
      expect(ActivityPatchSchema.parse({ activity: { destination, task: ' Review a report ' } }).activity)
        .toEqual({ destination, task: 'Review a report', status: 'active' });
    }
    expect(ActivityPatchSchema.parse({ activity: null })).toEqual({ activity: null });
  });
  it('rejects unsupported destinations, empty or long tasks, unknown statuses, and client timestamps', () => {
    for (const activity of [
      { destination: 'moon', task: 'Research' }, { destination: 'core', task: '  ' },
      { destination: 'core', task: 'x'.repeat(161) }, { destination: 'core', task: 'Research', status: 'earned' },
      { destination: 'core', task: 'Research', updatedAt: '2026-10-07T00:00:00.000Z' },
    ]) expect(ActivityPatchSchema.safeParse({ activity }).success).toBe(false);
    expect(ActivityPatchSchema.safeParse({}).success).toBe(false);
    expect(ActivityPatchSchema.safeParse({ activity: null, pubkey: agent.pubkey }).success).toBe(false);
  });
  it('retains backward-compatible agents and validates activity in agent.updated events', () => {
    expect(AgentPublicSchema.parse(agent).activity).toBeUndefined();
    const activity = AgentActivitySchema.parse({ destination: 'biotech', task: 'Read published research', status: 'paused', updatedAt: '2026-10-07T00:00:00.000Z' });
    expect(StreamEventSchema.parse({ type: 'agent.updated', agent: { ...agent, activity } }).type).toBe('agent.updated');
    expect(AgentActivitySchema.safeParse({ ...activity, updatedAt: 'yesterday' }).success).toBe(false);
    expect(AgentActivitySchema.safeParse({ destination: 'core', task: 'Read a report', updatedAt: activity.updatedAt }).success).toBe(false);
  });
});
