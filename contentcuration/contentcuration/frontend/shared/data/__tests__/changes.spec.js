import pick from 'lodash/pick';
import {
  CreatedChange,
  UpdatedChange,
  DeletedChange,
  MovedChange,
  CopiedChange,
  PublishedChange,
  SyncedChange,
  DeployedChange,
} from '../changes';
import {
  CHANGES_TABLE,
  TABLE_NAMES,
  RELATIVE_TREE_POSITIONS,
  LAST_FETCHED,
  COPYING_FLAG,
  TASK_ID,
} from 'shared/data/constants';
import db from 'shared/data/db';
import { mockChannelScope, resetMockChannelScope } from 'shared/utils/testing';

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
    });
    const rev = await change.saveChange();
    const persistedChange = await db[CHANGES_TABLE].get(rev);
    expect(persistedChange).toEqual({
      channel_id,
      rev,
      ...pick(change, ['type', 'key', 'table', 'obj']),
    });
  });

  it('should persist only the specified fields in the UpdatedChange', async () => {
    const oldObj = { a: 1, b: 2 };
    const changes = { a: 1, b: 3 };
    const change = new UpdatedChange({ key: '1', table: TABLE_NAMES.CONTENTNODE, oldObj, changes });
    const rev = await change.saveChange();
    const persistedChange = await db[CHANGES_TABLE].get(rev);
    expect(persistedChange).toEqual({
      oldObj,
      obj: changes,
      mods: { b: 3 },
      rev,
      channel_id,
      ...pick(change, ['type', 'key', 'table']),
    });
  });

  it('should save the mods as key paths in the UpdatedChange', async () => {
    const oldObj = { a: 1, b: { c: 1 } };
    const changes = { a: 1, b: { c: 2 } };
    const change = new UpdatedChange({ key: '1', table: TABLE_NAMES.CONTENTNODE, oldObj, changes });
    const rev = await change.saveChange();
    const persistedChange = await db[CHANGES_TABLE].get(rev);
    expect(persistedChange).toEqual({
      oldObj,
      obj: changes,
      mods: { 'b.c': 2 },
      rev,
      channel_id,
      ...pick(change, ['type', 'key', 'table']),
    });
  });

  it('should save deleted mods as key paths to null in the UpdatedChange', async () => {
    const oldObj = { a: 1, b: { c: 1 } };
    const changes = { a: 1, b: {} };
    const change = new UpdatedChange({ key: '1', table: TABLE_NAMES.CONTENTNODE, oldObj, changes });
    const rev = await change.saveChange();
    const persistedChange = await db[CHANGES_TABLE].get(rev);
    expect(persistedChange).toEqual({
      oldObj,
      obj: changes,
      mods: { 'b.c': null },
      rev,
      channel_id,
      ...pick(change, ['type', 'key', 'table']),
    });
  });

  it('should ignore updates to specific subfields in the UpdatedChange', async () => {
    const oldObj = { a: 1, b: 2 };
    const changes = {
      a: 1,
      b: 3,
      [LAST_FETCHED]: new Date(),
      [TASK_ID]: '18292183921',
      [COPYING_FLAG]: true,
    };
    const change = new UpdatedChange({ key: '1', table: TABLE_NAMES.CONTENTNODE, oldObj, changes });
    const rev = await change.saveChange();
    const persistedChange = await db[CHANGES_TABLE].get(rev);
    expect(persistedChange).toEqual({
      oldObj,
      obj: { a: 1, b: 3 },
      mods: { b: 3 },
      rev,
      channel_id,
      ...pick(change, ['type', 'key', 'table']),
    });
  });

  it('should not save a change when no updates are made in the UpdatedChange', async () => {
    const oldObj = { a: 1, b: 2 };
    const changes = {
      a: 1,
      b: 2,
      [LAST_FETCHED]: new Date(),
      [TASK_ID]: '18292183921',
      [COPYING_FLAG]: true,
    };
    const change = new UpdatedChange({ key: '1', table: TABLE_NAMES.CONTENTNODE, oldObj, changes });
    const rev = await change.saveChange();
    expect(rev).toBeNull();
  });

  it('should persist only the specified fields in the DeletedChange', async () => {
    const change = new DeletedChange({
      key: '1',
      table: TABLE_NAMES.CONTENTNODE,
      oldObj: { a: 1, b: 2 },
    });
    const rev = await change.saveChange();
    const persistedChange = await db[CHANGES_TABLE].get(rev);
    expect(persistedChange).toEqual({
      channel_id,
      rev,
      ...pick(change, ['type', 'key', 'table', 'oldObj']),
    });
  });

  it('should persist only the specified fields in the MovedChange', async () => {
    const change = new MovedChange({
      key: '1',
      table: TABLE_NAMES.CONTENTNODE,
      target: '2',
      position: RELATIVE_TREE_POSITIONS.LAST_CHILD,
      parent: '3',
    });
    const rev = await change.saveChange();
    const persistedChange = await db[CHANGES_TABLE].get(rev);
    expect(persistedChange).toEqual({
      rev,
      channel_id,
      ...pick(change, ['type', 'key', 'table', 'target', 'position', 'parent']),
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
      ]),
    });
  });

  it('should persist only the specified fields in the PublishedChange', async () => {
    const change = new PublishedChange({
      key: '1',
      table: TABLE_NAMES.CHANNEL,
      version_notes: 'Some version notes',
      language: 'en',
    });
    const rev = await change.saveChange();
    const persistedChange = await db[CHANGES_TABLE].get(rev);
    expect(persistedChange).toEqual({
      rev,
      channel_id: change.key,
      ...pick(change, ['type', 'key', 'table', 'version_notes', 'language']),
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
      ]),
    });
  });

  it('should persist only the specified fields in the DeployedChange', async () => {
    const change = new DeployedChange({ key: '1', table: TABLE_NAMES.CHANNEL });
    const rev = await change.saveChange();
    const persistedChange = await db[CHANGES_TABLE].get(rev);
    expect(persistedChange).toEqual({
      rev,
      channel_id: change.key,
      ...pick(change, ['type', 'key', 'table']),
    });
  });
});

describe('Change Types Unhappy Paths', () => {
  // CreatedChange
  it('should throw error when CreatedChange is instantiated without obj', () => {
    expect(() => new CreatedChange({ key: '1', table: TABLE_NAMES.CONTENTNODE })).toThrow(
      new TypeError('obj should be an object, but undefined was passed instead')
    );
  });

  it('should throw error when CreatedChange is instantiated with incorrect obj type', () => {
    expect(
      () => new CreatedChange({ key: '1', table: TABLE_NAMES.CONTENTNODE, obj: 'invalid' })
    ).toThrow(new TypeError('obj should be an object, but invalid was passed instead'));
  });

  it('should throw error when CreatedChange is instantiated with a non-syncable table', () => {
    expect(() => new CreatedChange({ key: '1', table: TABLE_NAMES.SESSION, obj: {} })).toThrow(
      new TypeError('session is not a syncable table')
    );
  });

  // UpdatedChange
  it('should throw error when UpdatedChange is instantiated without changes', () => {
    expect(() => new UpdatedChange({ key: '1', table: TABLE_NAMES.CONTENTNODE })).toThrow(
      new TypeError('changes should be an object, but undefined was passed instead')
    );
  });

  it('should throw error when UpdatedChange is instantiated with incorrect changes type', () => {
    expect(
      () => new UpdatedChange({ key: '1', table: TABLE_NAMES.CONTENTNODE, changes: 'invalid' })
    ).toThrow(new TypeError('changes should be an object, but invalid was passed instead'));
  });

  it('should throw error when UpdatedChange is instantiated without oldObj', () => {
    expect(
      () => new UpdatedChange({ key: '1', table: TABLE_NAMES.CONTENTNODE, changes: {} })
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
        })
    ).toThrow(new TypeError('oldObj should be an object, but invalid was passed instead'));
  });

  // DeletedChange
  it('should throw error when DeletedChange is instantiated without key', () => {
    expect(() => new DeletedChange({ table: TABLE_NAMES.CONTENTNODE })).toThrow(
      new TypeError('key is required for a DeletedChange but it was undefined')
    );
  });

  it('should throw error when DeletedChange is instantiated with invalid table', () => {
    expect(() => new DeletedChange({ key: '1', table: 'test' })).toThrow(
      new ReferenceError('test is not a valid table value')
    );
  });

  // MovedChange
  it('should throw error when MovedChange is instantiated without target', () => {
    expect(
      () =>
        new MovedChange({
          key: '1',
          table: TABLE_NAMES.CONTENTNODE,
          position: RELATIVE_TREE_POSITIONS.LAST_CHILD,
        })
    ).toThrow(new TypeError('target is required for a MovedChange but it was undefined'));
  });

  it('should throw error when MovedChange is instantiated with incorrect position type', () => {
    expect(
      () =>
        new MovedChange({
          key: '1',
          table: TABLE_NAMES.CONTENTNODE,
          target: '2',
          position: 'invalid',
        })
    ).toThrow(new ReferenceError('invalid is not a valid position value'));
  });

  it('should throw error when MovedChange is instantiated without parent', () => {
    expect(
      () =>
        new MovedChange({
          key: '1',
          table: TABLE_NAMES.CONTENTNODE,
          target: '2',
          position: RELATIVE_TREE_POSITIONS.LAST_CHILD,
        })
    ).toThrow(new ReferenceError('parent is required for a MovedChange but it was undefined'));
  });

  // CopiedChange
  it('should throw error when CopiedChange is instantiated without from_key', () => {
    expect(() => new CopiedChange({ key: '1', table: TABLE_NAMES.CONTENTNODE })).toThrow(
      new TypeError('from_key is required for a CopiedChange but it was undefined')
    );
  });

  it('should throw error when CopiedChange is instantiated with incorrect mods type', () => {
    expect(
      () =>
        new CopiedChange({
          key: '1',
          table: TABLE_NAMES.CONTENTNODE,
          from_key: '2',
          mods: 'invalid',
        })
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
        })
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
        })
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
        })
    ).toThrow(
      new TypeError(
        'excluded_descendants should be an object or null, but invalid was passed instead'
      )
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
        })
    ).toThrow(new TypeError('parent is required for a CopiedChange but it was undefined'));
  });

  // PublishedChange
  it('should throw error when PublishedChange is instantiated without version_notes', () => {
    expect(() => new PublishedChange({ key: '1', table: TABLE_NAMES.CHANNEL })).toThrow(
      new TypeError('version_notes is required for a PublishedChange but it was undefined')
    );
  });

  it('should throw error when PublishedChange is instantiated without language', () => {
    expect(
      () =>
        new PublishedChange({
          key: '1',
          table: TABLE_NAMES.CHANNEL,
          version_notes: 'Some notes',
        })
    ).toThrow(new TypeError('language is required for a PublishedChange but it was undefined'));
  });

  // SyncedChange
  it('should throw error when SyncedChange is instantiated without titles_and_descriptions', () => {
    expect(() => new SyncedChange({ key: '1', table: TABLE_NAMES.CHANNEL })).toThrow(
      new TypeError('titles_and_descriptions should be a boolean, but undefined was passed instead')
    );
  });

  it('should throw error when SyncedChange is instantiated with incorrect titles_and_descriptions type', () => {
    expect(
      () =>
        new SyncedChange({
          key: '1',
          table: TABLE_NAMES.CHANNEL,
          titles_and_descriptions: 'invalid',
        })
    ).toThrow(
      new TypeError('titles_and_descriptions should be a boolean, but invalid was passed instead')
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
        })
    ).toThrow(
      new TypeError('resource_details should be a boolean, but invalid was passed instead')
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
        })
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
        })
    ).toThrow(
      new TypeError('assessment_items should be a boolean, but invalid was passed instead')
    );
  });

  // DeployedChange
  it('should throw error when DeployedChange is instantiated without key', () => {
    expect(() => new DeployedChange({ table: TABLE_NAMES.CHANNEL })).toThrow(
      new TypeError('key is required for a DeployedChange but it was undefined')
    );
  });

  it('should throw error when DeployedChange is instantiated with invalid table', () => {
    expect(() => new DeployedChange({ key: '1', table: 'test' })).toThrow(
      new ReferenceError('test is not a valid table value')
    );
  });
});
