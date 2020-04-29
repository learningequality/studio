import { createTranslator } from 'utils/i18n';

const titleStrings = createTranslator('TitleStrings', {
  defaultTitle: 'Kolibri Studio',
  catalogTitle: 'Kolibri Content Library Catalog',
  tabTitle: '{title} - {site}',
});

export function updateTabTitle(title) {
  let siteName = titleStrings(window.libraryMode ? 'catalogTitle' : 'defaultTitle');
  if (title) {
    document.title = titleStrings('tabTitle')
      .replace('{title}', title)
      .replace('{site}', siteName);
  } else {
    document.title = siteName;
  }
}
