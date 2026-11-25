import { render } from '@testing-library/vue';
import VueRouter from 'vue-router';
import useKLiveRegion from 'kolibri-design-system/lib/composables/useKLiveRegion';
import ValidationMessage from '../index.vue';

jest.mock('kolibri-design-system/lib/composables/useKLiveRegion');

let sendPoliteMessage;

beforeEach(() => {
  sendPoliteMessage = jest.fn();
  useKLiveRegion.mockReturnValue({ sendPoliteMessage });
});

const renderWarning = props =>
  render(ValidationMessage, {
    props: { warning: true, ...props },
    slots: { default: 'Too many options.' },
    routes: new VueRouter(),
  });

describe('ValidationMessage', () => {
  it('announces a warning politely as it appears', () => {
    renderWarning();
    expect(sendPoliteMessage).toHaveBeenCalledWith('Too many options.');
  });

  it('does not announce a warning with alert off', () => {
    renderWarning({ alert: false });
    expect(sendPoliteMessage).not.toHaveBeenCalled();
  });
});
