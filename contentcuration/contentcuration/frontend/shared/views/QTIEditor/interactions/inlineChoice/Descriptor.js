import { QtiInteraction, QuestionType, BaseType, Cardinality, Placement } from '../../constants';
import { InteractionDescriptor } from '../InteractionDescriptor';
import { parseInlineChoiceInteraction, buildInlineChoiceInteractionXML } from './parse';
import { validateInlineChoiceInteraction } from './validation';

/**
 * Owns all inline-choice-specific interaction logic: schema, parse, buildXML, validate.
 *
 * Inline placement means parse() is handed the whole <qti-item-body> rather than just the
 * interaction element, so it can recover the prompt and passage from the body.
 */
class InlineChoiceInteractionDescriptor extends InteractionDescriptor {
  constructor() {
    super({
      type: QtiInteraction.INLINE_CHOICE,
      questionTypes: [QuestionType.INLINE_CHOICE],
      placement: Placement.INLINE,
    });
  }

  getTypeOptions(tr) {
    return [
      {
        value: QuestionType.INLINE_CHOICE,
        label: tr.inlineChoiceLabel$(),
        description: tr.inlineChoiceDescription$(),
      },
    ];
  }

  matches(el) {
    if (el.tagName.toLowerCase() === QtiInteraction.INLINE_CHOICE) return true;
    return Boolean(el.querySelector(QtiInteraction.INLINE_CHOICE));
  }

  /**
   * parse() reads every body: elements it wrote as the question go back to the question, and
   * everything else is the passage. Another interaction in the body would be its own block,
   * which isSupportedItem already rejects.
   *
   * @returns {boolean}
   */
  isSupportedBody() {
    return true;
  }

  getQuestionType() {
    return QuestionType.INLINE_CHOICE;
  }

  /** @returns {{ baseType: string, cardinality: string }} */
  getResponseDeclarationSchema() {
    return { baseType: BaseType.IDENTIFIER, cardinality: Cardinality.SINGLE };
  }

  /**
   * @param {string} bodyXml - Full `<qti-item-body>` XML string
   * @param {string[]} responseDeclarations
   * @returns {InlineChoiceState}
   */
  parse(bodyXml, responseDeclarations) {
    return parseInlineChoiceInteraction(bodyXml, responseDeclarations);
  }

  /**
   * @param {InlineChoiceState} state
   * @param {string} questionType
   * @returns {{ bodyXml: string, responseDeclarations: string[] }}
   */
  buildXML(state, questionType) {
    return buildInlineChoiceInteractionXML(
      state,
      questionType,
      this.getResponseDeclarationSchema(),
    );
  }

  /**
   * @param {InlineChoiceState} state
   * @returns {Array<{ code: string, id?: string }>}
   */
  validate(state) {
    return validateInlineChoiceInteraction(state);
  }
}

export const inlineChoiceInteractionDescriptor = new InlineChoiceInteractionDescriptor();
