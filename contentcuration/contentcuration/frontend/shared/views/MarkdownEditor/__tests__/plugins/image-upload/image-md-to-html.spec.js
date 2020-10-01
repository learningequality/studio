import imageMdToHtml from '../../../plugins/image-upload/image-md-to-html';

describe('imageMdToHtml', () => {
  it('converts images markdown to html', () => {
    const input = `
      First image: ![](\${☣ CONTENTSTORAGE}/checksum.ext =100x200)
      Second image: ![Second image](\${☣ CONTENTSTORAGE}/94ffaf.png)
    `;

    expect(imageMdToHtml(input)).toBe(`
      First image: <img
        alt=""
        src="/content/storage/c/h/checksum.ext"
        width="100"
        height="200"
        class="image-field"
        data-checksum="checksum"
      />
      Second image: <img
        alt="Second image"
        src="/content/storage/9/4/94ffaf.png"
        width="auto"
        height="auto"
        class="image-field"
        data-checksum="94ffaf"
      />
    `);
  });
});
