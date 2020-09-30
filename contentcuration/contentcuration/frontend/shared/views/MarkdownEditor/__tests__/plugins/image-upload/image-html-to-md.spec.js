import imageHtmlToMd from '../../../plugins/image-upload/image-html-to-md';

describe('imageHtmlToMd', () => {
  it('converts images html to markdown', () => {
    const input = `
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
      />`;

    expect(imageHtmlToMd(input)).toBe(
      `First image: ![](\${☣ CONTENTSTORAGE}/checksum.ext =100x200)
      Second image: ![Second image](\${☣ CONTENTSTORAGE}/94ffaf.png)`
    );
  });
});
