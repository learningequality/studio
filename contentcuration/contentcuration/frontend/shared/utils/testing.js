import { Session } from 'shared/data/resources';

export function resetJestGlobal() {
  // This global object is bootstraped into channel_edit.html and is
  // assumed by the frontend code for it
  global.window.CHANNEL_EDIT_GLOBAL = {
    channel_id: '',
    channel_error: '',
  };
}

export async function mockChannelScope(channel_id) {
  // Function to allow setting the channel scope for use in testing
  // When we have upgraded to Jest 29, we can change this logic to
  // make a mock property instead of doing this swap in and out.
  Session._oldCurrentChannelId = Session.currentChannelId;
  Session.currentChannelId = channel_id;
  await Session.setChannelScope();
}

export async function resetMockChannelScope() {
  // Function to undo the above
  // when we have done the above suggested change, we can just reset the mock here.
  await Session.clearChannelScope();
  Session.currentChannelId = Session._oldCurrentChannelId;
  delete Session._oldCurrentChannelId;
}
