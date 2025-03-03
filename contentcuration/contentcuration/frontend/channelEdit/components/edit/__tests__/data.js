import find from 'lodash/find';
import { LicensesList } from 'shared/leUtils/Licenses';
import contentNode from 'frontend/channelEdit/vuex/contentNode';
import storeFactory from 'shared/vuex/baseStore';

import fileUploadsModule from 'shared/vuex/file';

export const editableFields = [
  'language',
  'title',
  'description',
  'license',
  'license_description',
  'copyright_holder',
  'author',
  'role_visibility',
  'aggregator',
  'provider',
];

const specialPermissions = find(LicensesList, { is_custom: true });
export function generateNode(props = {}) {
  const data = {};
  editableFields.forEach(f => {
    data[f] = Math.random().toString(36).substring(7);
  });

  const extra_fields = {
    mastery_model: 'do_all',
    randomize: false,
  };

  return {
    id: Math.random().toString(36).substring(7),
    kind: 'topic',
    prerequisite: [],
    is_prerequisite_of: [],
    metadata: { resource_size: 0 },
    extra_fields: extra_fields,
    tags: {},
    ancestors: [],
    ...data,
    ...props,
    license: specialPermissions.id,
    language: 'en-PT',
    role_visibility: 'coach',
  };
}

export const DEFAULT_TOPIC = generateNode({ kind: 'topic' });
export const DEFAULT_TOPIC2 = generateNode({ kind: 'topic' });
export const DEFAULT_VIDEO = generateNode({ kind: 'video' });
export const DEFAULT_EXERCISE = generateNode({ kind: 'exercise' });
export const DEFAULT_EXERCISE2 = generateNode({ kind: 'exercise' });

export const mockFunctions = {
  saveNodes: jest.fn(),
  removeNode: jest.fn(),
  copyNodes: jest.fn(),
  loadNodes: jest.fn(),
};

export const localStore = storeFactory({
  modules: {
    file: fileUploadsModule,
    contentNode,
  },
});
