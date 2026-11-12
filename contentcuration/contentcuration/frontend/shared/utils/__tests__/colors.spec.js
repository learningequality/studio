import { themePalette, themeTokens } from 'kolibri-design-system/lib/styles/theme';
import { getContentKindColor } from '../colors';

describe('getContentKindColor', () => {
  const tokens = themeTokens();
  const palette = themePalette();

  it.each([
    ['video', tokens.watch],
    ['audio', tokens.listen],
    ['document', tokens.read],
    ['slideshow', tokens.read],
    ['exercise', tokens.practice],
    ['html5', tokens.explore],
    ['h5p', tokens.explore],
    ['zim', tokens.explore],
    ['topic', palette.grey.v_400],
  ])('returns the KDS color for %s', (kind, expected) => {
    expect(getContentKindColor(kind)).toBe(expected);
  });

  it.each(['unsupported', undefined, null, ''])('falls back to grey for %s', kind => {
    expect(getContentKindColor(kind)).toBe(palette.grey.v_400);
  });
});
