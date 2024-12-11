function generateUrl(baseUrl, { url, origin, port } = {}) {
  let urlObject = new URL(baseUrl, origin || window.location.origin);
  if (port) {
    urlObject.port = port;
  }
  if (url) {
    urlObject = new URL(url, urlObject);
  }
  return urlObject.href;
}

const urls = {
  hashi() {
    if (!this.__hashiUrl) {
      throw new ReferenceError('Hashi Url is not defined');
    }
    return generateUrl(this.__hashiUrl, {
      origin: this.__zipContentOrigin,
      port: this.__zipContentPort,
    });
  },
  zipContentUrl(fileId, extension, embeddedFilePath = '') {
    const filename = `${fileId}.${extension}`;
    if (!this.__zipContentUrl) {
      throw new ReferenceError('Zipcontent Url is not defined');
    }
    return generateUrl(this.__zipContentUrl, {
      url: `${filename}/${embeddedFilePath}`,
      origin: this.__zipContentOrigin,
      port: this.__zipContentPort,
    });
  },
  storageUrl(fileId, extension) {
    const filename = `${fileId}.${extension}`;
    if (!this.__contentUrl) {
      throw new ReferenceError('Zipcontent Url is not defined');
    }
    return generateUrl(this.__contentUrl, { url: `${filename[0]}/${filename[1]}/${filename}` });
  },
};

export default urls;
