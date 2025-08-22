/**
 * Utilities related to Kolibri Public API
 *
 * We don't need to put requests to these APIs behind Vuex or IndexedDB caching because the APIs are
 * already cached by cloudflare and by extension, the browser too.
 * Let the browser do the caching for us.
 *
 * See bottom of file for '@typedef's
 */
import isString from 'lodash/isString';
import isFunction from 'lodash/isFunction';
import { RolesNames } from 'shared/leUtils/Roles';
import { findLicense } from 'shared/utils/helpers';
import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
import client from 'shared/client';
import urls from 'shared/urls';

/**
 * Assumes obj[key] is an array of strings
 * @param {string} key
 * @param {object} obj
 * @return {object}
 * @private
 */
function _convertMetadataLabel(key, obj) {
  const converted = {};
  for (const labelKey of obj[key]) {
    converted[labelKey] = true;
  }
  return converted;
}

/**
 * @see MPTTModel for explanation of this calculation
 * @param obj
 * @return {number}
 */
const total_count = obj =>
  obj['kind'] === ContentKindsNames.TOPIC ? (obj['rght'] - obj['lft'] - 1) / 2 : 1;

const CONTENT_NODE_FIELD_MAP = {
  // `destination field`: `source field` or value producing function
  node_id: 'id',
  content_id: 'content_id',
  channel_id: 'channel_id',
  title: 'title',
  description: 'description',
  kind: 'kind',
  author: 'author',
  provider: 'provider',
  aggregator: 'aggregator',
  suggested_duration: 'duration',
  lft: 'lft',
  changed: () => false,
  published: () => true,
  complete: () => true,
  has_updated_descendants: () => false,
  has_new_descendants: () => false,
  learning_activities: _convertMetadataLabel.bind({}, 'learning_activities'),
  grade_levels: _convertMetadataLabel.bind({}, 'grade_levels'),
  accessibility_labels: _convertMetadataLabel.bind({}, 'accessibility_labels'),
  categories: _convertMetadataLabel.bind({}, 'categories'),
  resource_types: _convertMetadataLabel.bind({}, 'resource_types'),
  tags: _convertMetadataLabel.bind({}, 'tags'),
  extra_fields: obj => {
    const options = obj['options'];
    let randomize = true;

    if (obj['kind'] === ContentKindsNames.EXERCISE) {
      const assessmentMetadata = obj['assessmentmetadata'];
      if (!options['completion_criteria'] && assessmentMetadata['mastery_model']) {
        options['completion_criteria'] = {
          model: 'mastery',
          threshold: {
            // TODO: remove JSON.parse, since we shouldn't be receiving strings from the API
            mastery_model: isString(assessmentMetadata['mastery_model'])
              ? JSON.parse(assessmentMetadata['mastery_model'])
              : assessmentMetadata['mastery_model'],
          },
        };
      }
      randomize = Boolean(assessmentMetadata['randomize']);
    }
    return {
      options,
      randomize,
    };
  },
  role_visibility: obj => (obj['coach_content'] ? RolesNames.COACH : RolesNames.LEARNER),
  license: obj => findLicense(obj['license_name']),
  license_description: 'license_description',
  copyright_holder: 'license_owner',
  coach_count: 'num_coach_contents',

  total_count,
  language: obj => obj['lang']['id'],
  thumbnail_src: obj =>
    obj['thumbnail'] ? new URL(obj['thumbnail'], window.location.origin).toString() : null,
  thumbnail_encoding: () => '{}',

  // unavailable in public API
  resource_count: total_count, // fake it, assume all nodes are resources
  // 'root_id': 'root_id',
};

/**
 * Convert a content node from the public API into a content node for the Studio frontend
 * @param {string} id - the actual ID of the node on Studio's side
 * @param {string} root_id - the root content node ID
 * @param {string} parent - the parent's ID
 * @param {PublicContentNode} publicNode
 * @return {{id}}
 */
export function convertContentNodeResponse(id, root_id, parent, publicNode) {
  const contentNode = {
    // the public API does not return the actual id, but 'node_id' as the id, so this requires
    // us to know what the actual id is
    id,
    // The public API returns the channel ID as the root_id
    root_id,
    // the public API does not return the actual id, but 'node_id' as the id
    parent,
  };

  // Convert the response node into a content node
  for (const [key, fieldMapper] of Object.entries(CONTENT_NODE_FIELD_MAP)) {
    if (isFunction(fieldMapper)) {
      contentNode[key] = fieldMapper(publicNode);
    } else {
      contentNode[key] = publicNode[fieldMapper];
    }
  }

  // If the parent is the channel, then set the parent to the root_id
  if (publicNode.parent === publicNode.channel_id) {
    contentNode.parent = root_id;
  }

  // Add the channel name to the content node
  const ancestors = publicNode.ancestors || [];
  const channel = ancestors.find(ancestor => ancestor.id === publicNode.channel_id);
  contentNode.channel_name = channel ? channel.title : '';

  return contentNode;
}

/**
 * Get a channel from the public API
 * @param {String} channelId
 * @return {Promise<PublicChannelMetadata>}
 */
export function getChannel(channelId) {
  return client.get(urls.publicchannel_detail(channelId)).then(response => response.data);
}

/**
 * Get a content node from the public API
 * @param {String} nodeId
 * @return {Promise<PublicContentNode>}
 */
export function getContentNode(nodeId) {
  return client.get(urls.publiccontentnode_detail(nodeId)).then(response => response.data);
}

/**
 * @typedef {Object} PublicFile
 * @property {string} id
 * @property {string} contentnode
 * @property {string} preset
 * @property {string} lang
 * @property {boolean} supplementary
 * @property {boolean} thumbnail
 * @property {number} priority
 * @property {number} file_size
 * @property {string} checksum
 * @property {string} extension
 */

/**
 * @typedef {Object} PublicContentNode
 * @property {string} id
 * @property {string} content_id
 * @property {string} channel_id
 * @property {string} parent
 * @property {string} title
 * @property {string} description
 * @property {string} kind
 * @property {string} author
 * @property {string} provider
 * @property {string} aggregator
 * @property {number} duration
 * @property {number} lft
 * @property {number} rght
 * @property {string[]} learning_activities
 * @property {string[]} grade_levels
 * @property {string[]} accessibility_labels
 * @property {string[]} categories
 * @property {string[]} resource_types
 * @property {string[]} tags
 * @property {boolean} coach_content
 * @property {string} options - JSON string
 * @property {string} thumbnail - storage URL path
 * @property {string} license_name
 * @property {string} license_description
 * @property {string} license_owner
 * @property {number} num_coach_contents
 * @property {{id: string, lang_name: string, lang_code: string, lang_direction: string}} lang
 * @property {PublicFile[]} files
 */

/**
 * @typedef {Object} PublicChannelMetadata
 * @property {string} id
 * @property {string} root
 * @property {string} name
 * @property {string} description
 * @property {string} thumbnail - data URI
 * @property {string[]} included_languages
 * @property {string} lang_code
 * @property {string} lang_name
 * @property {string} author
 * @property {boolean} public
 * @property {number} published_size
 * @property {number} num_coach_contents
 * @property {number} total_resource_count
 * @property {number} version
 * @property {string} last_published
 * @property {string} last_updated
 *
 */
