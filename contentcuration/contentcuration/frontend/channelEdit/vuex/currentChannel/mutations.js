export function SAVE_CURRENT_CHANNEL_STAGING_DIFF(state, payload) {
  // convert staging diff API response to a more suitable format
  // (can be removed after API is updated)
  const fieldsMap = {
    'Date/Time Created': 'date_created',
    'Ricecooker Version': 'ricecooker_version',
    'File Size': 'file_size_in_bytes',
    '# of Topics': 'count_topics',
    '# of Videos': 'count_videos',
    '# of Audios': 'count_audios',
    '# of Exercises': 'count_exercises',
    '# of Documents': 'count_documents',
    '# of HTML5 Apps': 'count_html5_apps',
    '# of Slideshows': 'count_slideshows',
    '# of H5Ps': 'count_h5ps',
    '# of Questions': 'count_questions',
    '# of Subtitles': 'count_subtitles',
  };

  const stagingDiff = {};
  Object.keys(fieldsMap).forEach(fieldName => {
    const field = payload.find(item => item.field === fieldName);

    let live = field.live;
    let staged = field.staged;

    // API should be updated to return empty values
    if (fieldName === 'Date/Time Created') {
      if (live === 'Not Available') {
        live = '';
      }
      if (staged === 'Not Available') {
        staged = '';
      }
    }
    if (fieldName === 'Ricecooker Version') {
      if (live === '---') {
        live = '';
      }
      if (staged === '---') {
        staged = '';
      }
    }

    stagingDiff[fieldsMap[fieldName]] = { live, staged };
  });

  // API should be updated to return total resources count
  let countResources = {};
  ['live', 'staged'].forEach(key => {
    countResources[key] =
      stagingDiff.count_videos[key] +
      stagingDiff.count_audios[key] +
      stagingDiff.count_exercises[key] +
      stagingDiff.count_documents[key] +
      stagingDiff.count_html5_apps[key] +
      stagingDiff.count_slideshows[key] +
      stagingDiff.count_h5ps[key];
  });
  stagingDiff['count_resources'] = countResources;

  state.currentChannelStagingDiff = stagingDiff;
}
