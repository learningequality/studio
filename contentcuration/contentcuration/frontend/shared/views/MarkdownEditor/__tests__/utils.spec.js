import { clearNodeFormat } from '../MarkdownEditor/utils';

const htmlStringToFragment = htmlString => {
  const template = document.createElement('template');
  template.innerHTML = htmlString;

  return template.content;
};

const fragmentToHtmlString = fragment => {
  let htmlString = '';

  fragment.childNodes.forEach(childNode => {
    if (childNode.nodeType === childNode.TEXT_NODE) {
      htmlString += childNode.textContent;
    } else {
      htmlString += childNode.outerHTML;
    }
  });

  return htmlString;
};

describe('clearNodeFormat', () => {
  it('clears all tags by default', () => {
    const fragment = htmlStringToFragment(
      '<i>Wh</i>at <b>co<i>lo</i>r is </b>th<i>e <b>sky</b></i>'
    );

    const clearedFragment = clearNodeFormat({ node: fragment });

    expect(fragmentToHtmlString(clearedFragment)).toBe('What color is the sky');
  });

  it('does not clear format that should be ignored - tag selector', () => {
    const fragment = htmlStringToFragment(
      '<i>Wh</i>at <b>co<i>lo</i>r is </b>th<i>e <b>sky</b></i>'
    );
    const ignore = ['b'];

    const clearedFragment = clearNodeFormat({ node: fragment, ignore });

    expect(fragmentToHtmlString(clearedFragment)).toBe('What <b>color is </b>the <b>sky</b>');
  });

  it('does not clear format that should be ignored - class selector', () => {
    const fragment = htmlStringToFragment(
      '<i>Wh</i>at <b>co<i class="keep">lo</i>r is </b>th<i class="keep">e <b>sky</b></i>'
    );
    const ignore = ['.keep'];

    const clearedFragment = clearNodeFormat({ node: fragment, ignore });

    expect(fragmentToHtmlString(clearedFragment)).toBe(
      'What co<i class="keep">lo</i>r is th<i class="keep">e sky</i>'
    );
  });
});
