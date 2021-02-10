import { Store } from 'vuex';
import merge from 'lodash/merge';

import { ClipboardNodeFlag } from '../constants';
import { getSelectionState } from '../getters';
import clipboard from '../';
import { uuid4 } from 'shared/data/resources';

function createClipboardNode(channelId, legacy = false) {
  const extra_fields = legacy ? {} : { [ClipboardNodeFlag]: true };

  return {
    id: uuid4(),
    source_node_id: uuid4(),
    source_channel_id: channelId,
    extra_fields,
  };
}

function createStore(overrides = {}) {
  return new Store(
    merge(
      {},
      {
        modules: {
          clipboard,
        },
      },
      overrides
    )
  );
}

describe('clipboard.getters', () => {
  describe('getSelectionState', () => {
    let store = null;

    beforeEach(() => {
      store = new Store({
        modules: {
          clipboard: {
            ...clipboard,
            getters: {},
          },
        },
      });
    });
    afterEach(() => {});
  });
});
