import globalThis from 'shared/utils/globalThis';

const urls = {};

if (globalThis.Urls) {
  Object.assign(urls, globalThis.Urls);
}

export default urls;
