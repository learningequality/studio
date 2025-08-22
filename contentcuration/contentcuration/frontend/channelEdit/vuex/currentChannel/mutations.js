import { set } from 'vue';

export function SAVE_CURRENT_CHANNEL_STAGING_DIFF(state, payload) {
  if (payload._status) {
    state.currentChannelStagingDiff = payload;
    return;
  }

  // convert staging diff API response to a more suitable format
  // (can be removed after API is updated)
  const fields = [
    'date_created',
    'file_size_in_bytes',
    'count_topics',
    'count_videos',
    'count_audios',
    'count_exercises',
    'count_documents',
    'count_html5s',
    'count_slideshows',
    'count_h5ps',
    'count_questions',
    'count_subtitles',
    'ricecooker_version',
    'count_resources',
  ];

  const stagingDiff = {};
  fields.forEach(fieldName => {
    const field = payload.find(item => item.field === fieldName);

    const live = field.original;
    const staged = field.changed;

    stagingDiff[fieldName] = { live, staged };
  });
  state.currentChannelStagingDiff = stagingDiff;
}

export function SET_SELECTED_NODE_IDS(state, payload) {
  set(state, 'selectedNodeIds', Array.from(new Set(payload)));
}
