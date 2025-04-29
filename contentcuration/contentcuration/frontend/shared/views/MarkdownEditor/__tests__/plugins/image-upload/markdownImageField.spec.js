import Vue from 'vue';
import { registerMarkdownImageField } from 'shared/views/MarkdownEditor/plugins/image-upload/MarkdownImageField';

// we need to mock the component's style import for the element to successfully register in jsdom
jest.mock('./style.css', () => '');

let imageEl;
const imageMd = '![](${☣ CONTENTSTORAGE}/checksum.jpg =100x200)';

describe('MarkdownImageField custom element', () => {
  beforeAll(() => {
    document.body.innerHTML = `
        <span is="markdown-image-field">${imageMd}</span>
      `;
    imageEl = document.querySelector('span[is="markdown-image-field"]');
    registerMarkdownImageField();
  });

  test('renders some image markdown as an `img` element', async done => {
    await window.customElements.whenDefined('markdown-image-field');
    const innerImgEl = imageEl.shadowRoot.querySelector('img');
    expect(innerImgEl.getAttribute('src')).toBe('/content/storage/c/h/checksum.jpg');

    expect(innerImgEl.getAttribute('width')).toBe('100');
    done();
  });

  it('can update its markdown upon resizing', async done => {
    await window.customElements.whenDefined('markdown-image-field');
    const imageVueComponent = imageEl.getVueInstance();
    imageVueComponent.image.width = 5000000;
    imageVueComponent.image.height = 1;

    const expectedMd = '![](${☣ CONTENTSTORAGE}/checksum.jpg =5000000x1)';
    imageVueComponent.exportParamsToMarkdown();

    await Vue.nextTick();
    await Vue.nextTick(); // wait another tick for prop to update

    expect(imageEl.innerHTML).toBe(expectedMd);
    expect(imageVueComponent.markdown).toBe(expectedMd);

    done();
  });
});
