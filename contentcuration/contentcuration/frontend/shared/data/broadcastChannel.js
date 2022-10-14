import { APP_ID } from './constants';

const { BroadcastChannel } = require('broadcast-channel');

// N.B. channels do not subscribe to messages that
// they send, so if you want to listen to all messages
// sent on a channel, even from the same window
// you have to create a new channel object instance.
export function createChannel(id = APP_ID) {
  return new BroadcastChannel(id);
}

const channel = createChannel();

export default channel;
