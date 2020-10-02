import imageMdToHtml from '../../../plugins/image-upload/image-md-to-html';

describe('imageMdToHtml', () => {
  it('converts images markdown to html', () => {
    const input = `
      First image: ![](\${☣ CONTENTSTORAGE}/checksum.ext =100x200)
      Second image: ![Second image](\${☣ CONTENTSTORAGE}/94ffaf.png)
    `;

    expect(imageMdToHtml(input)).toBe(`
      First image: <span is='markdown-image-field'>![](\${☣ CONTENTSTORAGE}/checksum.ext =100x200)</span>
      Second image: <span is='markdown-image-field'>![Second image](\${☣ CONTENTSTORAGE}/94ffaf.png)</span>
    `);
  });
  it('handles duplicate images', () => {
    const input = `
      First image: ![](\${☣ CONTENTSTORAGE}/checksum.ext =100x200)
      First image, again: ![](\${☣ CONTENTSTORAGE}/checksum.ext =100x200)
    `;

    expect(imageMdToHtml(input)).toBe(`
      First image: <span is='markdown-image-field'>![](\${☣ CONTENTSTORAGE}/checksum.ext =100x200)</span>
      First image, again: <span is='markdown-image-field'>![](\${☣ CONTENTSTORAGE}/checksum.ext =100x200)</span>
    `);
  });
});
