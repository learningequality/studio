import { render } from '@testing-library/vue';
import VueRouter from 'vue-router';
import useKLiveRegion from 'kolibri-design-system/lib/composables/useKLiveRegion';
import ValidationMessage from '../index.vue';

const renderWarnings = texts =>
  render(
    {
      render: h =>
        h(
          'div',
          texts.map(text => h(ValidationMessage, { props: { warning: true }, key: text }, text)),
        ),
    },
    { routes: new VueRouter() },
  );

const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));

describe('ValidationMessage', () => {
  beforeAll(() => {
    useKLiveRegion()._mountLiveRegion();
  });

  it('announces every warning that appears at once', async () => {
    renderWarnings(['Too many pairs.', 'Too many distractors.']);
    await nextFrame();
    expect(window.politeRegionEl).toHaveTextContent('Too many pairs.');
    expect(window.politeRegionEl).toHaveTextContent('Too many distractors.');
  });

  it('does not announce a warning removed before it is read', async () => {
    renderWarnings(['Too many rows.']).unmount();
    renderWarnings(['Too many options.']);
    await nextFrame();
    expect(window.politeRegionEl).not.toHaveTextContent('Too many rows.');
    expect(window.politeRegionEl).toHaveTextContent('Too many options.');
  });

  it('is not talked over by an order announcement queued for the next frame', async () => {
    requestAnimationFrame(() => useKLiveRegion().sendPoliteMessage('Current order: 1. A'));
    renderWarnings(['Too many options.']);
    await nextFrame();
    expect(window.politeRegionEl).toHaveTextContent('Too many options.');
  });
});
