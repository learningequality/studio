import { render } from '@testing-library/vue';
import VueRouter from 'vue-router';
import StudioContentNodeIcon from '../StudioContentNodeIcon.vue';

const renderComponent = (props = {}) =>
  render(StudioContentNodeIcon, { props, routes: new VueRouter() });

describe('StudioContentNodeIcon', () => {
  it.each(['topic', 'video', 'audio', 'exercise', 'document', 'slideshow', 'html5', 'zim'])(
    'renders an icon for %s',
    kind => {
      const { container } = renderComponent({ kind });
      expect(container.querySelector('svg')).toBeInTheDocument();
    },
  );

  it('renders nothing for an unsupported kind', () => {
    const { container } = renderComponent({ kind: 'unsupported' });
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });

  it('is marked to be captured as an image in PDF exports', () => {
    const { container } = renderComponent({ kind: 'video' });
    expect(container.querySelector('[capture-as-image]')).toBeInTheDocument();
  });
});
