import { resolveImageSrcs, toStoredImageSrcs } from '../TipTapEditor/utils/imageSrc';

const CHECKSUM = '83ab37e959e03fec7be3e1bf834cb169';
const FILENAME = `${CHECKSUM}.jpg`;
const STORAGE_URL = `/content/storage/8/3/${FILENAME}`;

describe('resolveImageSrcs', () => {
  it('turns a stored filename into its storage URL', () => {
    expect(resolveImageSrcs(`<img src="${FILENAME}" alt="a" />`)).toBe(
      `<img src="${STORAGE_URL}" alt="a" />`,
    );
  });

  it('keeps the rest of the tag as it was', () => {
    expect(resolveImageSrcs(`<p>text <img alt="" src='${FILENAME}' width="550"/> more</p>`)).toBe(
      `<p>text <img alt="" src='${STORAGE_URL}' width="550"/> more</p>`,
    );
  });

  it('resolves every image in the content', () => {
    const html = `<img src="${FILENAME}"><img src="${FILENAME}">`;
    expect(resolveImageSrcs(html)).toBe(`<img src="${STORAGE_URL}"><img src="${STORAGE_URL}">`);
  });

  it('leaves an already resolved src alone', () => {
    expect(resolveImageSrcs(`<img src="${STORAGE_URL}">`)).toBe(`<img src="${STORAGE_URL}">`);
  });

  it('leaves a src that is not a checksum filename alone', () => {
    const html = '<img src="data:image/png;base64,AAA"><img src="https://example.com/a.png">';
    expect(resolveImageSrcs(html)).toBe(html);
  });

  it('ignores a src outside an img tag', () => {
    const html = `<video src="${FILENAME}"></video>`;
    expect(resolveImageSrcs(html)).toBe(html);
  });

  it('returns empty content unchanged', () => {
    expect(resolveImageSrcs('')).toBe('');
  });
});

describe('toStoredImageSrcs', () => {
  it('reduces a storage URL to the filename that gets stored', () => {
    expect(toStoredImageSrcs(`<img src="${STORAGE_URL}" alt="a" />`)).toBe(
      `<img src="${FILENAME}" alt="a" />`,
    );
  });

  it('leaves an already stored src alone', () => {
    expect(toStoredImageSrcs(`<img src="${FILENAME}">`)).toBe(`<img src="${FILENAME}">`);
  });

  it('leaves a src that is not a checksum filename alone', () => {
    const html = '<img src="data:image/png;base64,AAA"><img src="https://example.com/a.png">';
    expect(toStoredImageSrcs(html)).toBe(html);
  });

  it('is the inverse of resolveImageSrcs', () => {
    const html = `<p><img src="${FILENAME}" alt="a" width="550" height="364" /></p>`;
    expect(toStoredImageSrcs(resolveImageSrcs(html))).toBe(html);
  });
});
