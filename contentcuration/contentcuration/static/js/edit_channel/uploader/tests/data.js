import find from 'lodash/find';
import Constants from 'edit_channel/constants';
import contentNode from 'frontend/channelEdit/vuex/contentNode';
import storeFactory from 'shared/vuex/baseStore';

import fileUploadsModule from 'frontend/channelEdit/vuex/file';

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

let specialPermissions = find(Constants.Licenses, { is_custom: true });
export function generateNode(props = {}) {
  let data = {};
  editableFields.forEach(f => {
    data[f] = Math.random()
      .toString(36)
      .substring(7);
  });

  let extra_fields = {
    mastery_model: 'do_all',
    randomize: false,
  };

  return {
    id: Math.random()
      .toString(36)
      .substring(7),
    kind: 'topic',
    prerequisite: [],
    is_prerequisite_of: [],
    files: [{ id: 'file', preset: { id: 'preset' } }],
    metadata: { resource_size: 0 },
    assessment_items: [],
    extra_fields: extra_fields,
    tags: [],
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
