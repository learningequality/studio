import { CHANGE_TYPES } from '../constants';
import { ChangeDispatcher, ChangeStream, resourceCounts } from '../applyRemoteChanges';
import Deferred from 'shared/utils/deferred';
import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
import { RolesNames } from 'shared/leUtils/Roles';

function tick() {
  return new Promise(resolve => {
    setTimeout(resolve, 0);
  });
}

describe('ChangeStream', () => {
  let dispatchers;
  let changeStream;

  beforeEach(() => {
    dispatchers = [
      {
        apply: jest.fn(() => Promise.resolve()),
      },
      {
        apply: jest.fn(() => Promise.resolve()),
      },
    ];
    changeStream = new ChangeStream(dispatchers);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with the provided dispatchers', () => {
      expect(changeStream._dispatchers).toBe(dispatchers);
    });

    it('should create a WritableStream instance', () => {
      changeStream.init();
      expect(changeStream._stream).toBeDefined();
    });

    it('should create a writer for the stream', () => {
      changeStream.init();
      expect(changeStream._writer).toBeDefined();
    });
  });

  describe('write', () => {
    let writeSpy;

    beforeEach(() => {
      dispatchers = [];
      for (let i = 0; i < 2; i++) {
        const deferred = new Deferred();
        const dispatcher = {
          deferred,
          apply: jest.fn(() => deferred.promise()),
        };
        dispatchers.push(dispatcher);
      }
      changeStream = new ChangeStream(dispatchers);
      changeStream.init();
      writeSpy = jest.spyOn(changeStream._writer, 'write');
    });

    it('should acquire a lock and await the writer ready promise', async () => {
      const changes = [{ id: 1 }, { id: 2 }];
      const result = changeStream.write(changes);
      const resultDeferred = Deferred.fromPromise(result);

      await tick();

      // All changes should be written to the stream sink
      expect(writeSpy.mock.calls).toHaveLength(2);
      expect(writeSpy).toHaveBeenCalledWith(changes[0]);
      expect(writeSpy).toHaveBeenCalledWith(changes[1]);

      // the write should be awaiting the dispatcher's apply
      expect(dispatchers[0].apply).toHaveBeenCalledWith(changes[0]);
      expect(dispatchers[1].apply).not.toHaveBeenCalledWith(changes[0]);

      // The result should not be resolved yet, until all dispatchers have applied
      expect(resultDeferred.isFulfilled).toBe(false);

      for (const dispatcher of dispatchers) {
        dispatcher.deferred.resolve();
      }

      // Should resolve, otherwise it'll hit the Jest timeout
      await result;
    });
  });

  describe('doWrite', () => {
    it('should apply the change to each dispatcher', async () => {
      const change = { id: 1 };
      await changeStream.doWrite(change);

      for (const dispatcher of dispatchers) {
        expect(dispatcher.apply).toHaveBeenCalledWith(change);
      }
    });
  });
});

describe('ChangeDispatcher', () => {
  let changeDispatcher;

  beforeEach(() => {
    changeDispatcher = new ChangeDispatcher();
  });

  describe('apply', () => {
    it('should call applyCreate if change type is CREATED and applyCreate is defined', async () => {
      const change = { type: CHANGE_TYPES.CREATED };
      const applyCreateResult = 'create result';
      changeDispatcher.applyCreate = jest.fn().mockResolvedValue(applyCreateResult);

      const result = await changeDispatcher.apply(change);

      expect(changeDispatcher.applyCreate).toHaveBeenCalledWith(change);
      expect(result).toBe(applyCreateResult);
    });

    it('should call applyUpdate if change type is UPDATED and applyUpdate is defined', async () => {
      const change = { type: CHANGE_TYPES.UPDATED };
      const applyUpdateResult = 'update result';
      changeDispatcher.applyUpdate = jest.fn().mockResolvedValue(applyUpdateResult);

      const result = await changeDispatcher.apply(change);

      expect(changeDispatcher.applyUpdate).toHaveBeenCalledWith(change);
      expect(result).toBe(applyUpdateResult);
    });

    it('should call applyDelete if change type is DELETED and applyDelete is defined', async () => {
      const change = { type: CHANGE_TYPES.DELETED };
      const applyDeleteResult = 'delete result';
      changeDispatcher.applyDelete = jest.fn().mockResolvedValue(applyDeleteResult);

      const result = await changeDispatcher.apply(change);

      expect(changeDispatcher.applyDelete).toHaveBeenCalledWith(change);
      expect(result).toBe(applyDeleteResult);
    });

    it('should call applyMove if change type is MOVED and applyMove is defined', async () => {
      const change = { type: CHANGE_TYPES.MOVED };
      const applyMoveResult = 'move result';
      changeDispatcher.applyMove = jest.fn().mockResolvedValue(applyMoveResult);

      const result = await changeDispatcher.apply(change);

      expect(changeDispatcher.applyMove).toHaveBeenCalledWith(change);
      expect(result).toBe(applyMoveResult);
    });

    it('should call applyCopy if change type is COPIED and applyCopy is defined', async () => {
      const change = { type: CHANGE_TYPES.COPIED };
      const applyCopyResult = 'copy result';
      changeDispatcher.applyCopy = jest.fn().mockResolvedValue(applyCopyResult);

      const result = await changeDispatcher.apply(change);

      expect(changeDispatcher.applyCopy).toHaveBeenCalledWith(change);
      expect(result).toBe(applyCopyResult);
    });

    it('should call applyPublish if change type is PUBLISHED and applyPublish is defined', async () => {
      const change = { type: CHANGE_TYPES.PUBLISHED };
      const applyPublishResult = 'publish result';
      changeDispatcher.applyPublish = jest.fn().mockResolvedValue(applyPublishResult);

      const result = await changeDispatcher.apply(change);

      expect(changeDispatcher.applyPublish).toHaveBeenCalledWith(change);
      expect(result).toBe(applyPublishResult);
    });

    it('should call applyUpdateDescendants if change type is UPDATED_DESCENDANTS and applyUpdateDescendants is defined', async () => {
      const change = { type: CHANGE_TYPES.UPDATED_DESCENDANTS };
      const applyUpdateDescendantsResult = 'update descendants result';
      changeDispatcher.applyUpdateDescendants = jest
        .fn()
        .mockResolvedValue(applyUpdateDescendantsResult);

      const result = await changeDispatcher.apply(change);

      expect(changeDispatcher.applyUpdateDescendants).toHaveBeenCalledWith(change);
      expect(result).toBe(applyUpdateDescendantsResult);
    });
  });
});

describe('ResourceCounts', () => {
  describe('_applyDiff', () => {
    it('should return the correct diff when changedNode is a folder and multiplier is 1', () => {
      const changedNode = {
        kind: ContentKindsNames.TOPIC,
        total_count: 10,
        resource_count: 5,
        coach_count: 3,
      };
      const multiplier = 1;
      const ancestor = {
        total_count: 100,
        resource_count: 50,
        coach_count: 30,
      };

      const diff = resourceCounts._applyDiff(changedNode, multiplier, ancestor);

      expect(diff.total_count).toBe(110); // (1 * 10) + 100
      expect(diff.resource_count).toBe(55); // (1 * 5) + 50
      expect(diff.coach_count).toBe(33); // (1 * 3) + 30
    });

    it('should return the correct diff when changedNode is a folder and multiplier is -1', () => {
      const changedNode = {
        kind: ContentKindsNames.TOPIC,
        total_count: 10,
        resource_count: 5,
        coach_count: 3,
      };
      const multiplier = -1;
      const ancestor = {
        total_count: 100,
        resource_count: 50,
        coach_count: 30,
      };

      const diff = resourceCounts._applyDiff(changedNode, multiplier, ancestor);

      expect(diff.total_count).toBe(90); // (-1 * 10) + 100
      expect(diff.resource_count).toBe(45); // (-1 * 5) + 50
      expect(diff.coach_count).toBe(27); // (-1 * 3) + 30
    });

    it('should return the correct diff when changedNode is not a folder and counts are 0', () => {
      const changedNode = {
        kind: ContentKindsNames.AUDIO,
        total_count: 0,
        resource_count: 0,
        coach_count: 0,
        role_visibility: RolesNames.LEARNER,
      };
      const multiplier = 1;
      const ancestor = {
        total_count: 50,
        resource_count: 20,
        coach_count: 10,
      };

      const diff = resourceCounts._applyDiff(changedNode, multiplier, ancestor);

      expect(diff.total_count).toBe(51); // 1 + 50
      expect(diff.resource_count).toBe(21); // 1 + 20
      expect(diff.coach_count).toBe(10); // No change
    });

    it('should return the correct diff when changedNode is not a folder but coach content', () => {
      const changedNode = {
        kind: ContentKindsNames.AUDIO,
        total_count: 0,
        resource_count: 0,
        coach_count: 0,
        role_visibility: RolesNames.COACH,
      };
      const multiplier = -1;
      const ancestor = {
        total_count: 50,
        resource_count: 20,
        coach_count: 10,
      };

      const diff = resourceCounts._applyDiff(changedNode, multiplier, ancestor);

      expect(diff.total_count).toBe(49); // 50 - 1
      expect(diff.resource_count).toBe(19); // 20 - 1
      expect(diff.coach_count).toBe(9); // 10 - 1
    });
  });
});
