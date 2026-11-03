import { changedSettings } from '../settings';

describe('changedSettings', () => {
  const defaults = { shuffle: false, showAnswerCount: true };

  it('gives the settings changed from the value they start at, with their values', () => {
    expect(changedSettings({ shuffle: true, showAnswerCount: true }, defaults)).toEqual({
      shuffle: true,
    });
  });

  it('gives nothing for settings left as they start', () => {
    expect(changedSettings({ shuffle: false, showAnswerCount: true }, defaults)).toEqual({});
  });

  it('looks only at the settings it is given defaults for', () => {
    const state = { shuffle: false, showAnswerCount: true, orientation: 'horizontal' };
    expect(changedSettings(state, defaults)).toEqual({});
  });
});
