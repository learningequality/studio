import { render } from '@testing-library/vue';
import Vue from 'vue';
import VueRouter from 'vue-router';
import KIcon from 'kolibri-design-system/lib/KIcon';
import StudioContentNodeIcon from '../StudioContentNodeIcon.vue';
import { getContentKindColor } from 'shared/utils/colors';
import { getContentKindIcon } from 'shared/utils/icons';

const renderComponent = (props = {}) =>
  render(StudioContentNodeIcon, { props, routes: new VueRouter() });

const renderIcon = icon => render(KIcon, { props: { icon }, routes: new VueRouter() });

function iconShape(container) {
  const paths = [...container.querySelectorAll('svg path')].map(path => path.getAttribute('d'));
  expect(paths.length).toBeGreaterThan(0);
  return paths.join('|');
}

describe('StudioContentNodeIcon', () => {
  it.each(['topic', 'video', 'audio', 'exercise', 'document', 'slideshow', 'html5', 'h5p', 'zim'])(
    'renders the %s icon on its content-kind background',
    kind => {
      const { container } = renderComponent({ kind });
      const chip = container.querySelector('.studio-content-node-icon');

      expect(chip).toHaveStyle({ backgroundColor: getContentKindColor(kind) });
      expect(iconShape(container)).toBe(iconShape(renderIcon(getContentKindIcon(kind)).container));
    },
  );

  it('uses the html5 glyph for h5p', () => {
    const h5p = iconShape(renderComponent({ kind: 'h5p' }).container);
    const html5 = iconShape(renderComponent({ kind: 'html5' }).container);
    const video = iconShape(renderComponent({ kind: 'video' }).container);

    expect(h5p).toBe(html5);
    expect(h5p).not.toBe(video);
  });

  it('renders the error icon for an unsupported kind', () => {
    const { container } = renderComponent({ kind: 'unsupported' });
    const chip = container.querySelector('.studio-content-node-icon');

    expect(chip).toHaveStyle({ backgroundColor: getContentKindColor('unsupported') });
    expect(iconShape(container)).toBe(iconShape(renderIcon('error').container));
  });

  it('does not swallow a missing icon mapping', () => {
    const errorHandler = jest.fn();
    const previous = Vue.config.errorHandler;
    Vue.config.errorHandler = errorHandler;

    try {
      renderComponent({ kind: 'missing' });

      expect(errorHandler).toHaveBeenCalled();
      expect(errorHandler.mock.calls[0][0]).toEqual(
        expect.objectContaining({ message: 'Icon not found for content kind: missing' }),
      );
    } finally {
      Vue.config.errorHandler = previous;
    }
  });

  it('is marked to be captured as an image in PDF exports', () => {
    const { container } = renderComponent({ kind: 'video' });
    expect(container.querySelector('[capture-as-image]')).toBeInTheDocument();
  });
});
