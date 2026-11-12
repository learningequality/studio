import { getContentKindIcon } from '../icons';

describe('getContentKindIcon', () => {
  it.each([
    ['topic', 'topic'],
    ['video', 'video'],
    ['audio', 'audio'],
    ['slideshow', 'slideshow'],
    ['exercise', 'exercise'],
    ['document', 'document'],
    ['html5', 'html5'],
    ['h5p', 'html5'],
    ['zim', 'html5'],
    ['unsupported', 'error'],
  ])('maps %s to %s', (kind, icon) => {
    expect(getContentKindIcon(kind)).toBe(icon);
  });

  it('uses the empty-topic icon only when a topic is empty', () => {
    expect(getContentKindIcon('topic', true)).toBe('emptyTopic');
    expect(getContentKindIcon('h5p', true)).toBe('html5');
  });

  it('throws when a kind has no mapping', () => {
    expect(() => getContentKindIcon('missing')).toThrow('Icon not found for content kind: missing');
  });
});
