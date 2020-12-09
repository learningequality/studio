import client from 'shared/client';
import logEvent from 'shared/analytics/tagManager';
import applyChanges from 'shared/data/applyRemoteChanges';
import { Channel } from 'shared/data/resources';

let pageLoadEventFired = false;

export function loadChannel(context, { staging = false } = {}) {
  return context
    .dispatch('channel/loadChannel', context.state.currentChannelId, { root: true })
    .then(channel => {
      if (!pageLoadEventFired) {
        pageLoadEventFired = true;
        logEvent({
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
        });
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
  return Channel.getStagedDiff(context.state.currentChannelId)
    .then(response => {
      context.commit('SAVE_CURRENT_CHANNEL_STAGING_DIFF', response.data.stats);
    })
    .catch(error => {
      // Diff is being generated, so try again in 5 seconds
      if (error.response && error.response.status === 302) {
        context.commit('SAVE_CURRENT_CHANNEL_STAGING_DIFF', null);
        setTimeout(() => {
          loadCurrentChannelStagingDiff(context);
        }, 5000);
      }
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
  return Channel.publish(context.state.currentChannelId, version_notes);
}

export function stopPublishing(context) {
  return Channel.clearPublish(context.state.currentChannelId).then(() => {
    const publishTask = context.rootGetters['task/publishTaskForChannel'](
      context.state.currentChannelId
    );
    return publishTask
      ? context.dispatch('task/deleteTask', publishTask, { root: true })
      : Promise.resolve();
  });
}
