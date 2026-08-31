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

/**
 * Tab into the component under test, entering backwards from a sentinel after it.
 *
 * Tabbing forward from the start of the document stops on the CSRF input the
 * shared Jest setup leaves at the top of the body.
 *
 * @param {import('@testing-library/user-event').UserEvent} user
 */
export async function tabIn(user) {
  const sentinel = document.body.appendChild(document.createElement('button'));
  sentinel.focus();
  await user.tab({ shift: true });
  sentinel.remove();
}
