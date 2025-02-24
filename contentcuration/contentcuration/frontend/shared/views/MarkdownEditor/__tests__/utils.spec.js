import { clearNodeFormat, generateCustomConverter } from '../MarkdownEditor/utils';

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

describe('markdown conversion', () => {
  let documentCreateRange;

  beforeAll(() => {
    documentCreateRange = document.createRange;
    document.createRange = () => {
      const range = new Range();

      range.getBoundingClientRect = jest.fn();

      range.getClientRects = () => {
        return {
          item: () => null,
          length: 0,
          [Symbol.iterator]: jest.fn()
        };
      };

      return range;
    };
  });

  afterAll(() => {
    document.createRange = documentCreateRange;
  });

  it('converts image tags to markdown without escaping them', () => {
    const el = document.createElement('div');
    const CustomConvertor = generateCustomConverter(el);
    const converter = new CustomConvertor();
    const html =
      '<span is="markdown-image-field" vce-ready="" contenteditable="false" class="markdown-field-753aa86a-8159-403b-8b1c-d2b8f9504408 markdown-field-34843d46-79b8-40b4-866c-b83dc8916a47" editing="true" markdown="![](${☣ CONTENTSTORAGE}/bc1c5a86e1e46f20a6b4ee2c1bb6d6ff.png =485.453125x394)">![](${☣ CONTENTSTORAGE}/bc1c5a86e1e46f20a6b4ee2c1bb6d6ff.png =485.453125x394)</span>';

    expect(converter.toMarkdown(html)).toBe(
      '![](${☣ CONTENTSTORAGE}/bc1c5a86e1e46f20a6b4ee2c1bb6d6ff.png =485.453125x394)'
    );
  });
});
