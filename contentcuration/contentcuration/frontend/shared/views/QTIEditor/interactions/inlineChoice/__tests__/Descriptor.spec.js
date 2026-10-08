import { inlineChoiceInteractionDescriptor as descriptor } from '../Descriptor';
import { resolveDescriptor } from '../../resolveDescriptor';
import { parseItem } from '../../../serialization/parseItem';
import { parseXML } from '../../../serialization/xml';
import { QtiInteraction, QuestionType } from '../../../constants';

const toEl = xml => parseXML(xml).documentElement;

const DROPDOWN = (id, choice) =>
  `<qti-inline-choice-interaction response-identifier="${id}"><qti-inline-choice identifier="${choice}">a</qti-inline-choice></qti-inline-choice-interaction>`;

const BODY = `<qti-item-body><p>Pick ${DROPDOWN('r1', 'c1')}</p></qti-item-body>`;

const SENTINEL_BODY = `<qti-item-body><p>Question</p><p><qti-inline-choice-interaction response-identifier="studio_sentinel" data-studio-sentinel=""><qti-inline-choice identifier="studio_sentinel"/></qti-inline-choice-interaction></p></qti-item-body>`;

describe('inlineChoiceInteractionDescriptor', () => {
  describe('matches', () => {
    it('matches the interaction element itself', () => {
      expect(descriptor.matches(toEl(DROPDOWN('r1', 'c1')))).toBe(true);
    });

    it('matches an item body that contains the interaction', () => {
      expect(descriptor.matches(toEl(BODY))).toBe(true);
    });

    it('matches a body holding only the sentinel', () => {
      expect(descriptor.matches(toEl(SENTINEL_BODY))).toBe(true);
    });

    it('does not match a choice interaction', () => {
      expect(descriptor.matches(toEl('<qti-choice-interaction max-choices="1"/>'))).toBe(false);
    });
  });

  describe('resolveDescriptor', () => {
    it('resolves an item body with a dropdown', () => {
      const result = resolveDescriptor(BODY, []);
      expect(result.descriptor).toBe(descriptor);
      expect(result.questionType).toBe(QuestionType.INLINE_CHOICE);
    });

    it('resolves a sentinel-only body', () => {
      expect(resolveDescriptor(SENTINEL_BODY, []).descriptor).toBe(descriptor);
    });

    it('leaves choice and text entry bodies with their own descriptors', () => {
      const choice = resolveDescriptor(
        '<qti-choice-interaction response-identifier="r" max-choices="1"/>',
        [],
      );
      const text = resolveDescriptor(
        '<qti-item-body><p><qti-text-entry-interaction response-identifier="r"/></p></qti-item-body>',
        [],
      );
      expect(choice.descriptor.type).toBe(QtiInteraction.CHOICE);
      expect(text.descriptor.type).toBe(QtiInteraction.TEXT_ENTRY);
    });
  });

  it('yields one interaction carrying every dropdown declaration in body order', () => {
    const decl = id =>
      `<qti-response-declaration identifier="${id}" cardinality="single" base-type="identifier"/>`;
    const item = `<qti-assessment-item identifier="i" title="t">${decl('r2')}${decl('r1')}<qti-item-body><p>${DROPDOWN('r1', 'c1')} and ${DROPDOWN('r2', 'c2')}</p></qti-item-body></qti-assessment-item>`;

    const { interactions } = parseItem(item);

    expect(interactions).toHaveLength(1);
    expect(
      interactions[0].responseDeclarations.map(d => toEl(d).getAttribute('identifier')),
    ).toEqual(['r1', 'r2']);
  });
});
