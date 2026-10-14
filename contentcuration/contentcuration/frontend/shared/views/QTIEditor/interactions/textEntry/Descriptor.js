import { QtiInteraction, QuestionType, BaseType, Cardinality, Placement } from '../../constants';
import { parseXML } from '../../serialization/xml';
import { InteractionDescriptor } from '../InteractionDescriptor';
import {
  parseTextEntryInteraction,
  buildTextEntryInteractionXML,
  isSupportedTextEntryBody,
} from './parse';
import { validateTextEntryInteraction } from './validation';

/**
 * Owns all text-entry-specific interaction logic: schema, parse, buildXML, validate.
 *
 * Inline placement means parse() is handed the whole <qti-item-body> rather than just the
 * interaction element, so it can recover the prompt from the body siblings.
 */
class TextEntryInteractionDescriptor extends InteractionDescriptor {
  constructor() {
    super({
      type: QtiInteraction.TEXT_ENTRY,
      questionTypes: [QuestionType.NUMERIC, QuestionType.TEXT_ENTRY, QuestionType.FREE_RESPONSE],
      placement: Placement.INLINE,
    });
    this.convertsFrom = [];
  }

  getTypeOptions(tr) {
    return [
      {
        value: QuestionType.NUMERIC,
        label: tr.numericLabel$(),
        description: tr.numericDescription$(),
      },
      {
        value: QuestionType.TEXT_ENTRY,
        label: tr.textEntryLabel$(),
        description: tr.textEntryDescription$(),
      },
      {
        value: QuestionType.FREE_RESPONSE,
        label: tr.freeResponseLabel$(),
        description: tr.freeResponseDescription$(),
      },
    ];
  }

  /** @param {Element} el */
  matches(el) {
    if (el.tagName.toLowerCase() === QtiInteraction.TEXT_ENTRY) return true;
    return !!el.querySelector(QtiInteraction.TEXT_ENTRY);
  }

  /** @param {Element} bodyEl */
  isSupportedBody(bodyEl) {
    return isSupportedTextEntryBody(bodyEl);
  }

  /**
   * Reads base-type from the response declaration to determine question type.
   *
   * @param {Element} _el - unused; present to match the descriptor interface
   * @param {string[]} [responseDeclarations]
   * @returns {string}
   */
  getQuestionType(_el, responseDeclarations = []) {
    if (!responseDeclarations.length) return QuestionType.FREE_RESPONSE;

    try {
      const doc = parseXML(responseDeclarations[0]);
      const root = doc.documentElement;
      const baseType = root.getAttribute('base-type');

      if (baseType === BaseType.FLOAT) return QuestionType.NUMERIC;

      // base-type string: if a <qti-correct-response> is present the author
      // expects a specific answer (TEXT_ENTRY); otherwise it is open-ended.
      const hasCorrectResponse = !!root.querySelector('qti-correct-response');
      return hasCorrectResponse ? QuestionType.TEXT_ENTRY : QuestionType.FREE_RESPONSE;
    } catch {
      return QuestionType.FREE_RESPONSE;
    }
  }

  /**
   * Returns the response declaration schema for the given question type.
   * Always single-cardinality: accepted answers are scored by a
   * <qti-mapping>, not by a multiple-cardinality response.
   *
   * @param {string} questionType
   * @returns {{ baseType: string, cardinality: string }}
   */
  getResponseDeclarationSchema(questionType) {
    const baseType = questionType === QuestionType.NUMERIC ? BaseType.FLOAT : BaseType.STRING;
    return { baseType, cardinality: Cardinality.SINGLE };
  }

  /**
   * @param {string} bodyXml - Full `<qti-item-body>` XML string
   * @param {string[]} responseDeclarations
   * @returns {TextEntryState}
   */
  parse(bodyXml, responseDeclarations) {
    return parseTextEntryInteraction(bodyXml, responseDeclarations);
  }

  /**
   * @param {TextEntryState} state
   * @param {string} questionType
   * @param {{ language?: string }} [options]
   * @returns {{ bodyXml: string, responseDeclarations: string[] }}
   */
  buildXML(state, questionType, options) {
    return buildTextEntryInteractionXML(
      state,
      questionType,
      this.getResponseDeclarationSchema(questionType),
      options,
    );
  }

  /**
   * @param {TextEntryState} state
   * @param {string} questionType
   * @param {{ language?: string }} [options]
   * @returns {Array<{ code: string, id?: string }>}
   */
  validate(state, questionType, options) {
    return validateTextEntryInteraction(state, questionType, options);
  }
}

/** Singleton — safe to import from any file in the textEntry module tree. */
export const textEntryInteractionDescriptor = new TextEntryInteractionDescriptor();
