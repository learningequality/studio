import pick from 'lodash/pick';
import {
  Change,
  CreatedChange,
  UpdatedChange,
  DeletedChange,
  MovedChange,
  CopiedChange,
  PublishedChange,
  SyncedChange,
  DeployedChange,
  UpdatedDescendantsChange,
} from '../changes';
import {
  CHANGES_TABLE,
  CHANGE_TYPES,
  TABLE_NAMES,
  RELATIVE_TREE_POSITIONS,
  LAST_FETCHED,
  COPYING_STATUS,
  COPYING_STATUS_VALUES,
  TASK_ID,
} from 'shared/data/constants';
import db from 'shared/data/db';
import { mockChannelScope, resetMockChannelScope } from 'shared/utils/testing';

const CLIENTID = 'test-client-id';

describe('Change Types', () => {
  const channel_id = 'test-123';
  beforeEach(async () => {
    await db[CHANGES_TABLE].clear();
    await mockChannelScope(channel_id);
  });

  afterEach(async () => {
    await resetMockChannelScope();
  });

  it('should persist only the specified fields in the CreatedChange', async () => {
    const change = new CreatedChange({
      key: '1',
      table: TABLE_NAMES.CONTENTNODE,
      obj: { a: 1, b: 2 },
      source: CLIENTID,
    });
    const rev = await change.saveChange();
    const persistedChange = await db[CHANGES_TABLE].get(rev);
    expect(persistedChange).toEqual({
      channel_id,
      rev,
      ...pick(change, ['type', 'key', 'table', 'obj', 'source']),
    });
  });

  it('should persist only the specified fields in the UpdatedChange', async () => {
    const oldObj = { a: 1, b: 2 };
    const changes = { a: 1, b: 3 };
    const change = new UpdatedChange({
      key: '1',
      table: TABLE_NAMES.CONTENTNODE,
      oldObj,
      changes,
      source: CLIENTID,
    });
    const rev = await change.saveChange();
    const persistedChange = await db[CHANGES_TABLE].get(rev);
    expect(persistedChange).toEqual({
      oldObj,
      obj: changes,
      mods: { b: 3 },
      rev,
      channel_id,
      ...pick(change, ['type', 'key', 'table', 'source']),
    });
  });

  it('should save the mods as key paths in the UpdatedChange', async () => {
    const oldObj = { a: 1, b: { c: 1 } };
    const changes = { a: 1, b: { c: 2 } };
    const change = new UpdatedChange({
      key: '1',
      table: TABLE_NAMES.CONTENTNODE,
      oldObj,
      changes,
      source: CLIENTID,
    });
    const rev = await change.saveChange();
    const persistedChange = await db[CHANGES_TABLE].get(rev);
    expect(persistedChange).toEqual({
      oldObj,
      obj: changes,
      mods: { 'b.c': 2 },
      rev,
      channel_id,
      ...pick(change, ['type', 'key', 'table', 'source']),
    });
  });

  it('should save deleted mods as key paths to null in the UpdatedChange', async () => {
    const oldObj = { a: 1, b: { c: 1 } };
    const changes = { a: 1, b: {} };
    const change = new UpdatedChange({
      key: '1',
      table: TABLE_NAMES.CONTENTNODE,
      oldObj,
      changes,
      source: CLIENTID,
    });
    const rev = await change.saveChange();
    const persistedChange = await db[CHANGES_TABLE].get(rev);
    expect(persistedChange).toEqual({
      oldObj,
      obj: changes,
      mods: { 'b.c': null },
      rev,
      channel_id,
      ...pick(change, ['type', 'key', 'table', 'source']),
    });
  });

  it('should ignore updates to specific subfields in the UpdatedChange', async () => {
    const oldObj = { a: 1, b: 2 };
    const changes = {
      a: 1,
      b: 3,
      [LAST_FETCHED]: new Date(),
      [TASK_ID]: '18292183921',
      [COPYING_STATUS]: COPYING_STATUS_VALUES.COPYING,
    };
    const change = new UpdatedChange({
      key: '1',
      table: TABLE_NAMES.CONTENTNODE,
      oldObj,
      changes,
      source: CLIENTID,
    });
    const rev = await change.saveChange();
    const persistedChange = await db[CHANGES_TABLE].get(rev);
    expect(persistedChange).toEqual({
      oldObj,
      obj: { a: 1, b: 3 },
      mods: { b: 3 },
      rev,
      channel_id,
      ...pick(change, ['type', 'key', 'table', 'source']),
    });
  });

  it('should not save a change when no updates are made in the UpdatedChange', async () => {
    const oldObj = { a: 1, b: 2 };
    const changes = {
      a: 1,
      b: 2,
      [LAST_FETCHED]: new Date(),
      [TASK_ID]: '18292183921',
      [COPYING_STATUS]: COPYING_STATUS_VALUES.COPYING,
    };
    const change = new UpdatedChange({
      key: '1',
      table: TABLE_NAMES.CONTENTNODE,
      oldObj,
      changes,
      source: CLIENTID,
    });
    const rev = await change.saveChange();
    expect(rev).toBeNull();
  });

  it('should persist only the specified fields in the DeletedChange', async () => {
    const change = new DeletedChange({
      key: '1',
      table: TABLE_NAMES.CONTENTNODE,
      oldObj: { a: 1, b: 2 },
      source: CLIENTID,
    });
    const rev = await change.saveChange();
    const persistedChange = await db[CHANGES_TABLE].get(rev);
    expect(persistedChange).toEqual({
      channel_id,
      rev,
      ...pick(change, ['type', 'key', 'table', 'oldObj', 'source']),
    });
  });

  it('should persist only the specified fields in the MovedChange', async () => {
    const oldObj = { parent: '4' };
    const change = new MovedChange({
      key: '1',
      table: TABLE_NAMES.CONTENTNODE,
      target: '2',
      position: RELATIVE_TREE_POSITIONS.LAST_CHILD,
      parent: '3',
      source: CLIENTID,
      oldObj,
    });
    const rev = await change.saveChange();
    const persistedChange = await db[CHANGES_TABLE].get(rev);
    expect(persistedChange).toEqual({
      rev,
      channel_id,
      ...pick(change, ['type', 'key', 'table', 'target', 'position', 'parent', 'source', 'oldObj']),
    });
  });

  it('should persist only the specified fields in the CopiedChange', async () => {
    const change = new CopiedChange({
      key: '1',
      table: TABLE_NAMES.CONTENTNODE,
      from_key: '2',
      mods: { a: 1, b: 2 },
      target: '3',
      position: RELATIVE_TREE_POSITIONS.LAST_CHILD,
      excluded_descendants: null,
      parent: '3',
      source: CLIENTID,
    });
    const rev = await change.saveChange();
    const persistedChange = await db[CHANGES_TABLE].get(rev);
    expect(persistedChange).toEqual({
      rev,
      channel_id,
      ...pick(change, [
        'type',
        'key',
        'table',
        'from_key',
        'mods',
        'target',
        'position',
        'excluded_descendants',
        'parent',
        'source',
      ]),
    });
  });

  it('should persist only the specified fields in the PublishedChange', async () => {
    const change = new PublishedChange({
      key: '1',
      table: TABLE_NAMES.CHANNEL,
      version_notes: 'Some version notes',
      language: 'en',
      source: CLIENTID,
    });
    const rev = await change.saveChange();
    const persistedChange = await db[CHANGES_TABLE].get(rev);
    expect(persistedChange).toEqual({
      rev,
      channel_id: change.key,
      ...pick(change, ['type', 'key', 'table', 'version_notes', 'language', 'source']),
    });
  });

  it('should persist only the specified fields in the SyncedChange', async () => {
    const change = new SyncedChange({
      key: '1',
      table: TABLE_NAMES.CHANNEL,
      titles_and_descriptions: true,
      resource_details: false,
      files: true,
      assessment_items: false,
      source: CLIENTID,
    });
    const rev = await change.saveChange();
    const persistedChange = await db[CHANGES_TABLE].get(rev);
    expect(persistedChange).toEqual({
      rev,
      channel_id: change.key,
      ...pick(change, [
        'type',
        'key',
        'table',
        'titles_and_descriptions',
        'resource_details',
        'files',
        'assessment_items',
        'source',
      ]),
    });
  });

  it('should persist only the specified fields in the DeployedChange', async () => {
    const change = new DeployedChange({ key: '1', table: TABLE_NAMES.CHANNEL, source: CLIENTID });
    const rev = await change.saveChange();
    const persistedChange = await db[CHANGES_TABLE].get(rev);
    expect(persistedChange).toEqual({
      rev,
      channel_id: change.key,
      ...pick(change, ['type', 'key', 'table', 'source']),
    });
  });

  it('should persist only the specified fields in the UpdatedDescendantsChange', async () => {
    const changes = { language: 'es' };
    const change = new UpdatedDescendantsChange({
      key: '1',
      table: TABLE_NAMES.CONTENTNODE,
      oldObj: { title: 'test', language: 'en' },
      changes,
      source: CLIENTID,
    });
    const rev = await change.saveChange();
    const persistedChange = await db[CHANGES_TABLE].get(rev);

    expect(persistedChange).toEqual({
      rev,
      channel_id,
      mods: changes,
      ...pick(change, ['type', 'key', 'table', 'oldObj', 'source']),
    });
  });
});

describe('Change Types Unhappy Paths', () => {
  // Base Change
  it('should throw error when Change is instantiated without key', () => {
    expect(
      () =>
        new Change({
          table: TABLE_NAMES.CONTENTNODE,
          source: CLIENTID,
          type: CHANGE_TYPES.CREATED,
        }),
    ).toThrow(new TypeError('key is required for a Change but it was undefined'));
  });
  it('should throw error when Change is instantiated with a null key', () => {
    expect(
      () =>
        new Change({
          key: null,
          table: TABLE_NAMES.CONTENTNODE,
          source: CLIENTID,
          type: CHANGE_TYPES.CREATED,
        }),
    ).toThrow(new TypeError('key is required for a Change but it was null'));
  });

  it('should throw error when Change is instantiated without a source', () => {
    expect(
      () => new Change({ key: '1', table: TABLE_NAMES.CONTENTNODE, type: CHANGE_TYPES.CREATED }),
    ).toThrow(new ReferenceError('source should be a string, but undefined was passed instead'));
  });

  it('should throw error when Change is instantiated with a non-string source', () => {
    expect(
      () =>
        new Change({
          key: '1',
          source: 123,
          table: TABLE_NAMES.CONTENTNODE,
          type: CHANGE_TYPES.CREATED,
        }),
    ).toThrow(new ReferenceError('source should be a string, but 123 was passed instead'));
  });

  it('should throw error when Change is instantiated with invalid table', () => {
    expect(
      () => new Change({ key: '1', table: 'test', source: CLIENTID, type: CHANGE_TYPES.CREATED }),
    ).toThrow(new ReferenceError('test is not a valid table value'));
  });

  it('should throw error when Change is instantiated with a non-syncable table', () => {
    expect(
      () =>
        new Change({
          key: '1',
          table: TABLE_NAMES.SESSION,
          source: CLIENTID,
          type: CHANGE_TYPES.CREATED,
        }),
    ).toThrow(new TypeError('session is not a syncable table'));
  });

  // CreatedChange

  it('should throw error when CreatedChange is instantiated without obj', () => {
    expect(
      () => new CreatedChange({ key: '1', table: TABLE_NAMES.CONTENTNODE, source: CLIENTID }),
    ).toThrow(new TypeError('obj should be an object, but undefined was passed instead'));
  });

  it('should throw error when CreatedChange is instantiated with incorrect obj type', () => {
    expect(
      () =>
        new CreatedChange({
          key: '1',
          table: TABLE_NAMES.CONTENTNODE,
          obj: 'invalid',
          source: CLIENTID,
        }),
    ).toThrow(new TypeError('obj should be an object, but invalid was passed instead'));
  });

  // UpdatedChange
  it('should throw error when UpdatedChange is instantiated without changes', () => {
    expect(
      () => new UpdatedChange({ key: '1', table: TABLE_NAMES.CONTENTNODE, source: CLIENTID }),
    ).toThrow(new TypeError('changes should be an object, but undefined was passed instead'));
  });

  it('should throw error when UpdatedChange is instantiated with incorrect changes type', () => {
    expect(
      () =>
        new UpdatedChange({
          key: '1',
          table: TABLE_NAMES.CONTENTNODE,
          changes: 'invalid',
          source: CLIENTID,
        }),
    ).toThrow(new TypeError('changes should be an object, but invalid was passed instead'));
  });

  it('should throw error when UpdatedChange is instantiated without oldObj', () => {
    expect(
      () =>
        new UpdatedChange({
          key: '1',
          table: TABLE_NAMES.CONTENTNODE,
          changes: {},
          source: CLIENTID,
        }),
    ).toThrow(new TypeError('oldObj should be an object, but undefined was passed instead'));
  });

  it('should throw error when UpdatedChange is instantiated with incorrect oldObj type', () => {
    expect(
      () =>
        new UpdatedChange({
          key: '1',
          table: TABLE_NAMES.CONTENTNODE,
          changes: {},
          oldObj: 'invalid',
          source: CLIENTID,
        }),
    ).toThrow(new TypeError('oldObj should be an object, but invalid was passed instead'));
  });

  // DeletedChange
  it('should throw error when DeletedChange is instantiated with invalid table', () => {
    expect(() => new DeletedChange({ key: '1', table: 'test', source: CLIENTID })).toThrow(
      new ReferenceError('test is not a valid table value'),
    );
  });

  // MovedChange
  it('should throw error when MovedChange is instantiated without target', () => {
    const oldObj = { a: 1, b: 2 };
    expect(
      () =>
        new MovedChange({
          key: '1',
          table: TABLE_NAMES.CONTENTNODE,
          position: RELATIVE_TREE_POSITIONS.LAST_CHILD,
          source: CLIENTID,
          oldObj,
        }),
    ).toThrow(new TypeError('target is required for a MovedChange but it was undefined'));
  });

  it('should throw error when MovedChange is instantiated with incorrect position type', () => {
    const oldObj = { a: 1, b: { c: 1 } };
    expect(
      () =>
        new MovedChange({
          key: '1',
          table: TABLE_NAMES.CONTENTNODE,
          target: '2',
          position: 'invalid',
          source: CLIENTID,
          oldObj,
        }),
    ).toThrow(new ReferenceError('invalid is not a valid position value'));
  });

  it('should throw error when MovedChange is instantiated without parent', () => {
    const oldObj = { a: 1, b: 2, parent: 3 };
    expect(
      () =>
        new MovedChange({
          key: '1',
          table: TABLE_NAMES.CONTENTNODE,
          target: '2',
          position: RELATIVE_TREE_POSITIONS.LAST_CHILD,
          source: CLIENTID,
          oldObj,
        }),
    ).toThrow(new ReferenceError('parent is required for a MovedChange but it was undefined'));
  });

  // CopiedChange
  it('should throw error when CopiedChange is instantiated without from_key', () => {
    expect(
      () => new CopiedChange({ key: '1', table: TABLE_NAMES.CONTENTNODE, source: CLIENTID }),
    ).toThrow(new TypeError('from_key is required for a CopiedChange but it was undefined'));
  });

  it('should throw error when CopiedChange is instantiated with incorrect mods type', () => {
    expect(
      () =>
        new CopiedChange({
          key: '1',
          table: TABLE_NAMES.CONTENTNODE,
          from_key: '2',
          mods: 'invalid',
          source: CLIENTID,
        }),
    ).toThrow(new TypeError('mods should be an object, but invalid was passed instead'));
  });

  it('should throw error when CopiedChange is instantiated without target', () => {
    expect(
      () =>
        new CopiedChange({
          key: '1',
          table: TABLE_NAMES.CONTENTNODE,
          from_key: '2',
          mods: { a: 1 },
          source: CLIENTID,
        }),
    ).toThrow(new TypeError('target is required for a CopiedChange but it was undefined'));
  });

  it('should throw error when CopiedChange is instantiated with incorrect position type', () => {
    expect(
      () =>
        new CopiedChange({
          key: '1',
          table: TABLE_NAMES.CONTENTNODE,
          from_key: '2',
          mods: { a: 1 },
          target: '3',
          position: 'invalid',
          source: CLIENTID,
        }),
    ).toThrow(new ReferenceError('invalid is not a valid position value'));
  });

  it('should throw error when CopiedChange is instantiated with incorrect excluded_descendants type', () => {
    expect(
      () =>
        new CopiedChange({
          key: '1',
          table: TABLE_NAMES.CONTENTNODE,
          from_key: '2',
          mods: { a: 1 },
          target: '3',
          position: RELATIVE_TREE_POSITIONS.LAST_CHILD,
          excluded_descendants: 'invalid',
          source: CLIENTID,
        }),
    ).toThrow(
      new TypeError(
        'excluded_descendants should be an object or null, but invalid was passed instead',
      ),
    );
  });

  it('should throw error when CopiedChange is instantiated without a parent', () => {
    expect(
      () =>
        new CopiedChange({
          key: '1',
          table: TABLE_NAMES.CONTENTNODE,
          from_key: '2',
          mods: { a: 1 },
          target: '3',
          position: RELATIVE_TREE_POSITIONS.LAST_CHILD,
          excluded_descendants: null,
          source: CLIENTID,
        }),
    ).toThrow(new TypeError('parent is required for a CopiedChange but it was undefined'));
  });

  // PublishedChange
  it('should throw error when PublishedChange is instantiated without version_notes', () => {
    expect(
      () => new PublishedChange({ key: '1', table: TABLE_NAMES.CHANNEL, source: CLIENTID }),
    ).toThrow(
      new TypeError('version_notes is required for a PublishedChange but it was undefined'),
    );
  });

  it('should throw error when PublishedChange is instantiated without language', () => {
    expect(
      () =>
        new PublishedChange({
          key: '1',
          table: TABLE_NAMES.CHANNEL,
          version_notes: 'Some notes',
          source: CLIENTID,
        }),
    ).toThrow(new TypeError('language is required for a PublishedChange but it was undefined'));
  });

  // SyncedChange
  it('should throw error when SyncedChange is instantiated without titles_and_descriptions', () => {
    expect(
      () => new SyncedChange({ key: '1', table: TABLE_NAMES.CHANNEL, source: CLIENTID }),
    ).toThrow(
      new TypeError(
        'titles_and_descriptions should be a boolean, but undefined was passed instead',
      ),
    );
  });

  it('should throw error when SyncedChange is instantiated with incorrect titles_and_descriptions type', () => {
    expect(
      () =>
        new SyncedChange({
          key: '1',
          table: TABLE_NAMES.CHANNEL,
          titles_and_descriptions: 'invalid',
          source: CLIENTID,
        }),
    ).toThrow(
      new TypeError('titles_and_descriptions should be a boolean, but invalid was passed instead'),
    );
  });

  it('should throw error when SyncedChange is instantiated with incorrect resource_details type', () => {
    expect(
      () =>
        new SyncedChange({
          key: '1',
          table: TABLE_NAMES.CHANNEL,
          titles_and_descriptions: true,
          resource_details: 'invalid',
          source: CLIENTID,
        }),
    ).toThrow(
      new TypeError('resource_details should be a boolean, but invalid was passed instead'),
    );
  });

  it('should throw error when SyncedChange is instantiated with incorrect files type', () => {
    expect(
      () =>
        new SyncedChange({
          key: '1',
          table: TABLE_NAMES.CHANNEL,
          titles_and_descriptions: true,
          resource_details: false,
          files: 'invalid',
          source: CLIENTID,
        }),
    ).toThrow(new TypeError('files should be a boolean, but invalid was passed instead'));
  });

  it('should throw error when SyncedChange is instantiated with incorrect assessment_items type', () => {
    expect(
      () =>
        new SyncedChange({
          key: '1',
          table: TABLE_NAMES.CHANNEL,
          titles_and_descriptions: true,
          resource_details: false,
          files: true,
          assessment_items: 'invalid',
          source: CLIENTID,
        }),
    ).toThrow(
      new TypeError('assessment_items should be a boolean, but invalid was passed instead'),
    );
  });

  // DeployedChange
  it('should throw error when DeployedChange is instantiated without key', () => {
    expect(() => new DeployedChange({ table: TABLE_NAMES.CHANNEL, source: CLIENTID })).toThrow(
      new TypeError('key is required for a DeployedChange but it was undefined'),
    );
  });

  it('should throw error when DeployedChange is instantiated with invalid table', () => {
    expect(() => new DeployedChange({ key: '1', table: 'test', source: CLIENTID })).toThrow(
      new ReferenceError('test is not a valid table value'),
    );
  });

  // UpdatedDescendantsChange
  it('should throw error when UpdatedDescendantsChange is instantiated without changes', () => {
    expect(
      () =>
        new UpdatedDescendantsChange({
          key: '1',
          table: TABLE_NAMES.CONTENTNODE,
          source: CLIENTID,
        }),
    ).toThrow(new TypeError('changes should be an object, but undefined was passed instead'));
  });

  it('should throw error if UpdatedDescendantsChange is instantiated with a table different than CONTENTNODE', () => {
    expect(
      () =>
        new UpdatedDescendantsChange({
          key: '1',
          table: TABLE_NAMES.CHANNEL,
          changes: {},
          source: CLIENTID,
        }),
    ).toThrow();
  });
});
