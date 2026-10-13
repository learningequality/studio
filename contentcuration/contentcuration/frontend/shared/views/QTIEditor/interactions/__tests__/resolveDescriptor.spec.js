import { parseItem } from '../../serialization/parseItem';
import { assembleItemXml } from '../../serialization/assembleItem';
import { QtiInteraction, ValidationError } from '../../constants';
import { isSupportedItem, resolveDescriptor } from '../resolveDescriptor';
import {
  CHOICE_ITEM_DOCUMENT_WITH_STIMULUS,
  CHOICE_SINGLE_SELECT_XML,
  FREE_RESPONSE_ITEM_DOCUMENT,
  INLINE_CHOICE_ITEM_DOCUMENT,
  MATCH_THREE_SETS_XML,
  MULTI_INTERACTION_ITEM_DOCUMENT,
  MULTI_TEXT_ENTRY_ITEM_DOCUMENT,
  ORDERING_ITEM_DOCUMENT_NO_PROMPT,
  TEXT_ENTRY_ITEM_DOCUMENT_SHARED_PARAGRAPH,
  TEXT_ENTRY_ITEM_DOCUMENT_TRAILING_CONTENT,
  TWO_INTERACTIONS_DOCUMENT,
  UNDESCRIBED_INTERACTION,
  UNRECOGNIZED_INTERACTION_ITEM_DOCUMENT,
  VALID_ASSOCIATE_ITEM_DOCUMENT,
  VALID_CHOICE_ITEM_DOCUMENT,
  VALID_MATCH_ITEM_DOCUMENT,
} from '../../utils/testingFixtures';

const UNDESCRIBED_XML = `<${UNDESCRIBED_INTERACTION} response-identifier="RESPONSE"/>`;
const TEXT_ENTRY_PARAGRAPH = '<p><qti-text-entry-interaction response-identifier="RESPONSE"/></p>';

const interactionsOf = document => parseItem(document).interactions;
const isSupported = document => {
  const { interactions, itemBodyXml } = parseItem(document);
  return isSupportedItem(interactions, itemBodyXml);
};
const withBody = (document, body) =>
  document.replace(
    /<qti-item-body>[\s\S]*<\/qti-item-body>/,
    `<qti-item-body>${body}</qti-item-body>`,
  );
const CONVERTED_TEXT_ENTRY_DOCUMENT = withBody(
  FREE_RESPONSE_ITEM_DOCUMENT,
  `<div><p>Q?</p>${TEXT_ENTRY_PARAGRAPH}</div>`,
);

const save = document => {
  const item = parseItem(document);
  const [{ bodyXml, responseDeclarations }] = item.interactions;
  const { descriptor, questionType } = resolveDescriptor(bodyXml, responseDeclarations);
  const interaction = descriptor.buildXML(
    descriptor.parse(bodyXml, responseDeclarations),
    questionType,
  );
  return assembleItemXml({ ...item, ...interaction });
};

describe('resolveDescriptor', () => {
  it('resolves no descriptor for an interaction nothing is registered for', () => {
    expect(resolveDescriptor(UNDESCRIBED_XML, [])).toEqual({
      descriptor: null,
      questionType: null,
      error: null,
    });
  });

  it('resolves no descriptor for an empty body', () => {
    expect(resolveDescriptor('', []).descriptor).toBeNull();
  });

  it('resolves the descriptor of a recognized interaction', () => {
    const { descriptor, error } = resolveDescriptor(CHOICE_SINGLE_SELECT_XML, []);
    expect(descriptor.type).toBe(QtiInteraction.CHOICE);
    expect(error).toBeNull();
  });

  it('keeps the descriptor when its question type cannot be read', () => {
    const { descriptor, error } = resolveDescriptor(MATCH_THREE_SETS_XML, []);
    expect(descriptor.type).toBe(QtiInteraction.MATCH);
    expect(error).toBe(ValidationError.PARSE_ERROR);
  });

  it('resolves no descriptor for malformed XML', () => {
    expect(resolveDescriptor('<unclosed', [])).toMatchObject({
      descriptor: null,
      error: ValidationError.PARSE_ERROR,
    });
  });
});

describe('isSupportedItem', () => {
  it.each([
    ['no interactions', []],
    ['two choice interactions', interactionsOf(MULTI_INTERACTION_ITEM_DOCUMENT)],
    ['a choice and a text entry', interactionsOf(TWO_INTERACTIONS_DOCUMENT)],
    ['an interaction with no descriptor', interactionsOf(UNRECOGNIZED_INTERACTION_ITEM_DOCUMENT)],
    ['an interaction with no editor', interactionsOf(INLINE_CHOICE_ITEM_DOCUMENT)],
    ['several text entries in one body', interactionsOf(MULTI_TEXT_ENTRY_ITEM_DOCUMENT)],
    [
      'an interaction whose question type cannot be read',
      [{ bodyXml: MATCH_THREE_SETS_XML, responseDeclarations: [] }],
    ],
  ])('rejects %s', (_, interactions) => {
    expect(isSupportedItem(interactions)).toBe(false);
  });

  it.each([
    ['one choice interaction', VALID_CHOICE_ITEM_DOCUMENT],
    ['a match interaction', VALID_MATCH_ITEM_DOCUMENT],
    ['a text entry after its prompt', FREE_RESPONSE_ITEM_DOCUMENT],
  ])('accepts %s', (_, document) => {
    expect(isSupported(document)).toBe(true);
  });

  describe('body content beside a block interaction', () => {
    it.each([
      ['a stimulus before it', CHOICE_ITEM_DOCUMENT_WITH_STIMULUS],
      [
        'text after it',
        VALID_CHOICE_ITEM_DOCUMENT.replace('</qti-item-body>', 'See below.</qti-item-body>'),
      ],
      [
        'CDATA text before it',
        VALID_CHOICE_ITEM_DOCUMENT.replace(
          '<qti-item-body>',
          '<qti-item-body><![CDATA[Read the passage.]]>',
        ),
      ],
      [
        'an image after it',
        VALID_CHOICE_ITEM_DOCUMENT.replace(
          '</qti-item-body>',
          '<img src="a.png"/></qti-item-body>',
        ),
      ],
    ])('rejects %s', (_, document) => {
      expect(isSupported(document)).toBe(false);
    });

    it('rejects an interaction inside a wrapper element', () => {
      const [{ bodyXml }] = interactionsOf(VALID_CHOICE_ITEM_DOCUMENT);
      expect(isSupported(withBody(VALID_CHOICE_ITEM_DOCUMENT, `<div>${bodyXml}</div>`))).toBe(
        false,
      );
    });

    it('rejects a no-break space beside it', () => {
      expect(
        isSupported(VALID_CHOICE_ITEM_DOCUMENT.replace('<qti-item-body>', '<qti-item-body>&#160;')),
      ).toBe(false);
    });

    it('accepts whitespace and comments around it', () => {
      const [{ bodyXml }] = interactionsOf(VALID_CHOICE_ITEM_DOCUMENT);
      expect(
        isSupported(withBody(VALID_CHOICE_ITEM_DOCUMENT, `\n <!-- note -->\n${bodyXml}\n`)),
      ).toBe(true);
    });
  });

  describe('body content around a text entry', () => {
    it.each([
      ['a paragraph shared with other content', TEXT_ENTRY_ITEM_DOCUMENT_SHARED_PARAGRAPH],
      [
        'a paragraph shared with CDATA text',
        FREE_RESPONSE_ITEM_DOCUMENT.replace(
          '<p><qti-text-entry-interaction',
          '<p><![CDATA[Answer:]]><qti-text-entry-interaction',
        ),
      ],
      ['content after its paragraph', TEXT_ENTRY_ITEM_DOCUMENT_TRAILING_CONTENT],
      [
        'content after its paragraph within a wrapper',
        CONVERTED_TEXT_ENTRY_DOCUMENT.replace('/></p></div>', '/></p><p>More.</p></div>'),
      ],
      [
        'content after the wrapper of its paragraph',
        CONVERTED_TEXT_ENTRY_DOCUMENT.replace('/></p></div>', '/></p></div><p>More.</p>'),
      ],
      [
        'no paragraph of its own',
        FREE_RESPONSE_ITEM_DOCUMENT.replace(
          /<p><qti-text-entry-interaction ([^>]*)\/><\/p>/,
          '<qti-text-entry-interaction $1/>',
        ),
      ],
      [
        'a paragraph with an attribute',
        FREE_RESPONSE_ITEM_DOCUMENT.replace(
          '<p><qti-text-entry-interaction',
          '<p dir="rtl"><qti-text-entry-interaction',
        ),
      ],
      [
        'a paragraph inside a table',
        withBody(
          FREE_RESPONSE_ITEM_DOCUMENT,
          `<table><tr><td>Q?</td><td>${TEXT_ENTRY_PARAGRAPH}</td></tr></table>`,
        ),
      ],
      [
        'a paragraph inside a list',
        withBody(
          FREE_RESPONSE_ITEM_DOCUMENT,
          `<ol><li>Q?</li><li>${TEXT_ENTRY_PARAGRAPH}</li></ol>`,
        ),
      ],
      [
        'a paragraph inside a wrapper with an attribute',
        CONVERTED_TEXT_ENTRY_DOCUMENT.replace('<div>', '<div dir="rtl">'),
      ],
      [
        'a wrapper after the prompt',
        withBody(FREE_RESPONSE_ITEM_DOCUMENT, `<p>Q?</p><div>${TEXT_ENTRY_PARAGRAPH}</div>`),
      ],
    ])('rejects %s', (_, document) => {
      expect(isSupported(document)).toBe(false);
    });

    it.each([
      [
        'its paragraph',
        FREE_RESPONSE_ITEM_DOCUMENT.replace(
          '<p><qti-text-entry-interaction',
          '<p xmlns:m="http://www.w3.org/1998/Math/MathML"><qti-text-entry-interaction',
        ),
      ],
      [
        'the wrapper of its paragraph',
        CONVERTED_TEXT_ENTRY_DOCUMENT.replace(
          '<div>',
          '<div xmlns:m="http://www.w3.org/1998/Math/MathML">',
        ),
      ],
    ])('accepts namespace declarations on %s', (_, document) => {
      expect(isSupported(document)).toBe(true);
    });
  });

  describe('attributes on the item body', () => {
    it.each([
      ['dir', 'dir="rtl"'],
      ['xml:lang', 'xml:lang="ar"'],
      ['class', 'class="x"'],
    ])('rejects a choice item whose body has %s', (_, attribute) => {
      expect(
        isSupported(
          VALID_CHOICE_ITEM_DOCUMENT.replace('<qti-item-body>', `<qti-item-body ${attribute}>`),
        ),
      ).toBe(false);
    });

    it('rejects a text entry item whose body has an attribute', () => {
      expect(
        isSupported(
          FREE_RESPONSE_ITEM_DOCUMENT.replace('<qti-item-body>', '<qti-item-body dir="rtl">'),
        ),
      ).toBe(false);
    });

    it('accepts namespace declarations on the body', () => {
      expect(
        isSupported(
          VALID_CHOICE_ITEM_DOCUMENT.replace(
            '<qti-item-body>',
            '<qti-item-body xmlns:m="http://www.w3.org/1998/Math/MathML">',
          ),
        ),
      ).toBe(true);
    });
  });

  describe('an item the editor has saved', () => {
    const textEntryAfter = prompt =>
      withBody(FREE_RESPONSE_ITEM_DOCUMENT, `${prompt}${TEXT_ENTRY_PARAGRAPH}`);

    it.each([
      ['a choice interaction', VALID_CHOICE_ITEM_DOCUMENT],
      ['an ordering interaction', ORDERING_ITEM_DOCUMENT_NO_PROMPT],
      ['an associate interaction', VALID_ASSOCIATE_ITEM_DOCUMENT],
      ['a match interaction', VALID_MATCH_ITEM_DOCUMENT],
      ['a text entry after a plain prompt', FREE_RESPONSE_ITEM_DOCUMENT],
      ['a text entry with no prompt', textEntryAfter('')],
      ['a text entry inside the converted wrapper', CONVERTED_TEXT_ENTRY_DOCUMENT],
      ['a text entry after an image', textEntryAfter('<p><img src="a.png" alt=""/></p>')],
      [
        'a text entry after MathML',
        textEntryAfter('<p><math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi></math></p>'),
      ],
      ['a text entry after a right-to-left prompt', textEntryAfter('<p dir="rtl">Q?</p>')],
      ['a text entry after a list', textEntryAfter('<ul><li>One</li><li>Two</li></ul>')],
    ])('stays editable with %s, after one save and two', (_, document) => {
      const once = save(document);
      expect(isSupported(once)).toBe(true);
      expect(isSupported(save(once))).toBe(true);
    });
  });
});
