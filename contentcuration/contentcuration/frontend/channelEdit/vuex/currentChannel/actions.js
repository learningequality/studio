import client from 'shared/client';

export function loadChannelSize(context, rootId) {
  return client.get(window.Urls.get_total_size(rootId)).then(response => {
    return response.data && response.data.size;
  });
}

export function loadCurrentChannelStagingDiff(context) {
  const payload = { channel_id: context.state.currentChannelId };

  return client.post(window.Urls.get_staged_diff(), payload).then(response => {
    context.commit('SAVE_CURRENT_CHANNEL_STAGING_DIFF', response.data);
  });
}

export function publishChannel(context, version_notes) {
  let payload = {
    channel_id: context.state.currentChannelId,
    version_notes,
  };
  return client.post(window.Urls.publish_channel(), payload).then(response => {
    context.dispatch('task/startTask', { task: response.data }, { root: true });
  });
}

export function syncChannel(context, syncChennelPostData) {
  return client.post(window.Urls.sync_channel(), syncChennelPostData).then(response => {
    context.dispatch('task/startTask', { task: response.data }, { root: true });
  });
}
