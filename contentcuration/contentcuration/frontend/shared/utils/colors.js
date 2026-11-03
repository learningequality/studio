import { themePalette, themeTokens } from 'kolibri-design-system/lib/styles/theme';
import { ContentKindsNames } from 'shared/leUtils/ContentKinds';

/**
 * Returns the KDS background color for a content node kind.
 * Falls back to a neutral grey for unknown/unsupported kinds.
 *
 * @param {string} kind - content node kind (e.g. 'video', 'topic')
 * @returns {string} color value
 */
export function getContentKindColor(kind) {
  const palette = themePalette();
  const tokens = themeTokens();
  const colors = {
    [ContentKindsNames.TOPIC]: palette.grey.v_400,
    [ContentKindsNames.VIDEO]: tokens.watch,
    [ContentKindsNames.AUDIO]: tokens.listen,
    [ContentKindsNames.DOCUMENT]: tokens.read,
    [ContentKindsNames.SLIDESHOW]: tokens.read,
    [ContentKindsNames.EXERCISE]: tokens.practice,
    [ContentKindsNames.H5P]: tokens.explore,
    [ContentKindsNames.HTML5]: tokens.explore,
    [ContentKindsNames.ZIM]: tokens.explore,
  };
  return colors[kind] || palette.grey.v_400;
}
