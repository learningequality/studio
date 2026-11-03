import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import VueRouter from 'vue-router';
import TipTapEditor from '../TipTapEditor/TipTapEditor.vue';

async function renderImage(align) {
  const alignAttr = align ? ` data-text-align="${align}"` : '';
  render(TipTapEditor, {
    props: {
      value: `<img src="x" width="300"${alignAttr}>`,
      mode: 'edit',
      format: 'html',
      imageProcessor: { ACCEPTED_MIME_TYPES: ['image/png'] },
    },
    router: new VueRouter(),
  });
  return screen.findByRole('slider', { name: 'Resize image' });
}

async function dragRight(slider) {
  await fireEvent.mouseDown(slider, { clientX: 0 });
  await fireEvent.mouseMove(document, { clientX: 20 });
  await fireEvent.mouseUp(document);
}

describe('ImageNodeView resize', () => {
  afterEach(() => {
    delete window.isRTL;
    document.documentElement.removeAttribute('dir');
  });

  it('grows the image when dragged to the right in LTR content', async () => {
    const slider = await renderImage();

    await dragRight(slider);

    await waitFor(() => expect(slider).toHaveAttribute('aria-valuenow', '320'));
  });

  it('grows the image on ArrowRight in LTR content', async () => {
    const slider = await renderImage();

    await fireEvent.keyDown(slider, { key: 'ArrowRight' });

    await waitFor(() => expect(slider).toHaveAttribute('aria-valuenow', '310'));
  });

  it('shrinks the image when dragged to the right in RTL content', async () => {
    const slider = await renderImage();
    slider.style.direction = 'rtl';

    await dragRight(slider);

    await waitFor(() => expect(slider).toHaveAttribute('aria-valuenow', '280'));
  });

  it('grows the image on ArrowLeft in RTL content', async () => {
    const slider = await renderImage();
    slider.style.direction = 'rtl';

    await fireEvent.keyDown(slider, { key: 'ArrowLeft' });

    await waitFor(() => expect(slider).toHaveAttribute('aria-valuenow', '310'));
  });

  it('shrinks an end-aligned image when dragged to the right in LTR content', async () => {
    const slider = await renderImage('right');

    await dragRight(slider);

    await waitFor(() => expect(slider).toHaveAttribute('aria-valuenow', '280'));
  });

  it('grows an end-aligned image when dragged to the right in RTL content', async () => {
    const slider = await renderImage('right');
    slider.style.direction = 'rtl';

    await dragRight(slider);

    await waitFor(() => expect(slider).toHaveAttribute('aria-valuenow', '320'));
  });

  it('grows an end-aligned image on ArrowLeft in LTR content', async () => {
    const slider = await renderImage('right');

    await fireEvent.keyDown(slider, { key: 'ArrowLeft' });

    await waitFor(() => expect(slider).toHaveAttribute('aria-valuenow', '310'));
  });

  it('grows an end-aligned image on ArrowRight in RTL content', async () => {
    const slider = await renderImage('right');
    slider.style.direction = 'rtl';

    await fireEvent.keyDown(slider, { key: 'ArrowRight' });

    await waitFor(() => expect(slider).toHaveAttribute('aria-valuenow', '310'));
  });

  it('grows a centered image by twice the drag distance', async () => {
    const slider = await renderImage('center');

    await dragRight(slider);

    await waitFor(() => expect(slider).toHaveAttribute('aria-valuenow', '340'));
  });

  it('follows the content direction, not the page direction', async () => {
    window.isRTL = true;
    document.documentElement.dir = 'rtl';
    const slider = await renderImage();

    await dragRight(slider);

    await waitFor(() => expect(slider).toHaveAttribute('aria-valuenow', '320'));
  });
});
