/**
 * Convert images markdown to HTML
 *
 * Example
 *
 * "![alt-text](${placeholder}/checksum.ext =100x200)"
 *
 * will be converted to
 *
 * "<img src='path/to/checksum.ext' alt='alt-text' width="100" height="200">"
 *
 */
import { IMAGE_PLACEHOLDER, CLASS_IMG_FIELD } from '../../constants';

const IMAGE_REGEX = /!\[([^\]]*)]\(([^/]+\/([^\s]+))(?:\s=([0-9.]+)x([0-9.]+))*\)/g;

export default markdown => {
  const matches = [...markdown.matchAll(IMAGE_REGEX)];
  matches.forEach(match => {
    const imgMarkdown = match[0];
    const description = match[1];
    const filePathWithPlaceholder = match[2];
    const fileNameWithExtension = match[3];
    const width = match[4];
    const height = match[5];

    const imagePath = `/content/storage/${fileNameWithExtension[0]}/${fileNameWithExtension[1]}`;
    const src = filePathWithPlaceholder.replace(IMAGE_PLACEHOLDER, imagePath);
    const checksum = fileNameWithExtension.split('.')[0];
    markdown = markdown.replace(
      imgMarkdown,
      `<img
        alt="${description}"
        src="${src}"
        width="${width || 'auto'}"
        height="${height || 'auto'}"
        class="${CLASS_IMG_FIELD}"
        data-checksum="${checksum}"
      />`
    );
  });

  return markdown;
};
