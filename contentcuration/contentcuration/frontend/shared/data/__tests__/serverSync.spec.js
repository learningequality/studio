import { queueChange, debouncedSyncChanges } from '../serverSync';
import { CreatedChange } from '../changes';
import db from '../db';
import { Session, Task } from 'shared/data/resources';
import client from 'shared/client';
import { CHANGES_TABLE, CURRENT_USER, TABLE_NAMES } from 'shared/data/constants';
import { mockChannelScope, resetMockChannelScope } from 'shared/utils/testing';

async function makeChange(key, server_rev) {
  const rev = await new CreatedChange({
    key: String(key),
    table: TABLE_NAMES.CONTENTNODE,
    obj: { a: 1, b: 2 },
  }).saveChange();
  if (server_rev) {
    await db[CHANGES_TABLE].update(rev, { server_rev });
  }
  return rev;
}

describe('Debounce behaviour', () => {
  beforeEach(async () => {
    await Session.table.put({ id: 0, CURRENT_USER });
    client.post.mockReset();
    await mockChannelScope('test-123');
  });

  afterEach(async () => {
    await resetMockChannelScope();
  });

  it('should debounce sync changes', async () => {
    // Call queueChange multiple times quickly
    const change1 = await makeChange(1);
    const change2 = await makeChange(2);
    const change3 = await makeChange(3);

    queueChange(change1);
    queueChange(change2);
    queueChange(change3);

    // Wait for a short duration
    await debouncedSyncChanges();
    // Check that client.post was called only once
    expect(client.post).toHaveBeenCalledTimes(1);
  });
});

describe('ServerSync tests', () => {
  beforeEach(async () => {
    await Session.table.put({ id: 0, CURRENT_USER });
    client.post.mockReset();
    await mockChannelScope('test-123');
  });

  afterEach(async () => {
    await resetMockChannelScope();
    await db[CHANGES_TABLE].clear();
  });

  it('should handle allowed responses', async () => {
    const change1 = await makeChange(1);
    const change2 = await makeChange(2);
    const change3 = await makeChange(3);

    const allowed = [
      { rev: change1, server_rev: 100 },
      { rev: change2, server_rev: 200 },
      { rev: change3, server_rev: 300 },
    ];
    // Mock the client.post response for this specific test
    client.post.mockResolvedValue({
      data: {
        disallowed: [],
        allowed,
        returned: [],
        errors: [],
        successes: [],
        maxRevs: [],
        tasks: [],
      },
    });

    await debouncedSyncChanges();

    // Check that client.post was called only once
    expect(client.post).toHaveBeenCalledTimes(1);
    for (const allow of allowed) {
      const change = await db[CHANGES_TABLE].get(allow.rev);
      expect(change.server_rev).toEqual(allow.server_rev);
    }
  });
  it('should handle disallowed responses', async () => {
    const change1 = await makeChange(1);
    const change2 = await makeChange(2);
    const change3 = await makeChange(3);

    const disallowed = [{ rev: change1 }, { rev: change2 }, { rev: change3 }];

    client.post.mockResolvedValue({
      data: {
        disallowed,
        allowed: [],
        returned: [],
        errors: [],
        successes: [],
        maxRevs: [],
        tasks: [],
      },
    });

    await debouncedSyncChanges();

    expect(client.post).toHaveBeenCalledTimes(1);
    for (const disallow of disallowed) {
      const change = await db[CHANGES_TABLE].get(disallow.rev);
      expect(change.disallowed).toBe(true);
    }
  });

  it('should handle errors responses', async () => {
    const change1 = await makeChange(1, 100);
    const change2 = await makeChange(2, 200);
    const change3 = await makeChange(3, 300);

    const errors = [
      { rev: change1, server_rev: 100, errored: true },
      { rev: change2, server_rev: 200, errored: true },
      { rev: change3, server_rev: 300, errored: true },
    ];

    client.post.mockResolvedValue({
      data: {
        disallowed: [],
        allowed: [],
        returned: [],
        errors,
        successes: [],
        maxRevs: [],
        tasks: [],
      },
    });

    await debouncedSyncChanges();

    expect(client.post).toHaveBeenCalledTimes(1);
    for (const error of errors) {
      const change = await db[CHANGES_TABLE].get(error.rev);
      expect(change.errored).toBe(true);
    }
  });

  it('should handle successes responses', async () => {
    const change1 = await makeChange(1, 100);
    const change2 = await makeChange(2, 200);
    const change3 = await makeChange(3, 300);

    const successes = [
      { rev: change1, server_rev: 100 },
      { rev: change2, server_rev: 200 },
      { rev: change3, server_rev: 300 },
    ];

    client.post.mockResolvedValue({
      data: {
        disallowed: [],
        allowed: [],
        returned: [],
        errors: [],
        successes,
        maxRevs: [],
        tasks: [],
      },
    });

    await debouncedSyncChanges();

    expect(client.post).toHaveBeenCalledTimes(1);
    for (const s of successes) {
      const change = await db[CHANGES_TABLE].get(s.rev);
      expect(change).not.toBeDefined();
    }
  });

  it('should handle tasks responses', async () => {
    const tasks = [
      {
        task_id: 'task1',
        progress: 0,
        status: 'PENDING',
        channel_id: 'aaaaaaaaaaaaaaaaa-bbbbbbbbbbbbb-ccccccccccccc',
      },
      {
        task_id: 'task2',
        progress: 0,
        status: 'PENDING',
        channel_id: 'aaaaaaaaaaaaaaaaa-bbbbbbbbbbbbb-ccccccccccccc',
      },
      {
        task_id: 'task3',
        progress: 0,
        status: 'PENDING',
        channel_id: 'aaaaaaaaaaaaaaaaa-bbbbbbbbbbbbb-ccccccccccccc',
      },
    ];

    client.post.mockResolvedValue({
      data: {
        disallowed: [],
        allowed: [],
        returned: [],
        errors: [],
        successes: [],
        maxRevs: [],
        tasks,
      },
    });

    await debouncedSyncChanges();

    expect(client.post).toHaveBeenCalledTimes(1);
    for (const task of tasks) {
      const dbTask = await Task.get(task.task_id);
      expect(dbTask.status).toEqual(task.status);
    }
  });
});
