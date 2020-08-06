import client from 'shared/client';
import applyChanges from 'shared/data/applyRemoteChanges';

let pageLoadEventFired = false;

export function loadChannel(context, { staging = false } = {}) {
  return context
    .dispatch('channel/loadChannel', context.state.currentChannelId, { root: true })
    .then(channel => {
      if (!pageLoadEventFired) {
        pageLoadEventFired = true;
        context.dispatch(
          'logTagEvent',
          {
            currentChannel: {
              id: channel.id,
              name: channel.id,
              lastPublished: channel.last_published,
              isPublic: channel.public,
              allowEdit: channel.edit,
              staging,
              // Skipping this field for now as we don't have this info on the frontend by default
              // hasEditors:
            },
          },
          { root: true }
        );
      }
      return channel;
    });
}

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

export function deployCurrentChannel(context) {
  let payload = {
    channel_id: context.state.currentChannelId,
  };
  return client.post(window.Urls.activate_channel(), payload).then(response => {
    applyChanges(response.data.changes);
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
