import imageHtmlToMd from '../../../plugins/image-upload/image-html-to-md';

describe('imageHtmlToMd', () => {
  it('converts images html to markdown', () => {
    const input = `
      First image: <span is='markdown-image-field'>
        ![](\${☣ CONTENTSTORAGE}/checksum.ext =100x200)
      </span>
      Second image: <span is='markdown-image-field'>
        ![Second image](\${☣ CONTENTSTORAGE}/94ffaf.png)
      </span>`;

    expect(imageHtmlToMd(input)).toBe(
      `First image: ![](\${☣ CONTENTSTORAGE}/checksum.ext =100x200)
      Second image: ![Second image](\${☣ CONTENTSTORAGE}/94ffaf.png)`,
    );
  });
});
