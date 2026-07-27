import { QtiInteraction, QuestionType, BaseType, Cardinality } from '../../constants';
import { parseXML } from '../../serialization/parseItem';
import { parseTextEntryInteraction, buildTextEntryInteractionXML } from './parse';
import { validateTextEntryInteraction } from './validation';

/**
 * Owns all text-entry-specific interaction logic: schema, parse, buildXML, validate.
 *
 * placement: 'inline' — signals to parseItem that the whole <qti-item-body>
 * should be passed as bodyXml rather than just the interaction element, so
 * parse() can recover the prompt from body siblings.
 */
class TextEntryInteractionDescriptor {
  constructor() {
    this.type = QtiInteraction.TEXT_ENTRY;
    this.placement = 'inline';
    this.questionTypes = [
      QuestionType.NUMERIC,
      QuestionType.TEXT_ENTRY,
      QuestionType.FREE_RESPONSE,
    ];
    this.editorComponent = null;
    this.convertsFrom = [];
  }

  /** @param {Element} el */
  matches(el) {
    if (el.tagName.toLowerCase() === QtiInteraction.TEXT_ENTRY) return true;
    return !!el.querySelector(QtiInteraction.TEXT_ENTRY);
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
   *
   * For numeric, cardinality is derived from the current answer count so the
   * declaration stays correct as answers are added/removed.
   *
   * @param {string} questionType
   * @param {TextEntryState|null} [state]
   * @returns {{ baseType: string, cardinality: string }}
   */
  getResponseDeclarationSchema(questionType, state = null) {
    // Both freeResponse and textEntry use base-type string, cardinality single.
    // The presence or absence of <qti-correct-response> is determined by
    // buildTextEntryInteractionXML based on answers.length, not the schema.
    if (questionType === QuestionType.FREE_RESPONSE || questionType === QuestionType.TEXT_ENTRY) {
      return { baseType: BaseType.STRING, cardinality: Cardinality.SINGLE };
    }
    // NUMERIC: cardinality depends on how many acceptable answers are defined.
    const answerCount = state?.answers?.length ?? 0;
    return {
      baseType: BaseType.FLOAT,
      cardinality: answerCount > 1 ? Cardinality.MULTIPLE : Cardinality.SINGLE,
    };
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
   * @returns {{ bodyXml: string, responseDeclarations: string[] }}
   */
  buildXML(state, questionType) {
    return buildTextEntryInteractionXML(
      state,
      questionType,
      this.getResponseDeclarationSchema(questionType, state),
    );
  }

  /**
   * @param {TextEntryState} state
   * @param {string} questionType
   * @returns {Array<{ code: string, id?: string }>}
   */
  validate(state, questionType) {
    return validateTextEntryInteraction(state, questionType);
  }
}

/** Singleton — safe to import from any file in the textEntry module tree. */
export const textEntryInteractionDescriptor = new TextEntryInteractionDescriptor();
