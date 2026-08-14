import { QtiInteraction, QuestionType, BaseType, Cardinality, Placement } from '../../constants';
import { parseXML } from '../../serialization/xml';
import { InteractionDescriptor } from '../InteractionDescriptor';
import { parseTextEntryInteraction, buildTextEntryInteractionXML } from './parse';
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
   * Cardinality is derived from answer count for NUMERIC and TEXT_ENTRY so it
   * stays in sync as answers are added or removed.
   *
   * @param {string} questionType
   * @param {TextEntryState|null} [state]
   * @returns {{ baseType: string, cardinality: string }}
   */
  getResponseDeclarationSchema(questionType, state = null) {
    if (questionType === QuestionType.FREE_RESPONSE) {
      return { baseType: BaseType.STRING, cardinality: Cardinality.SINGLE };
    }
    const answerCount = state?.answers?.length ?? 0;
    const cardinality = answerCount > 1 ? Cardinality.MULTIPLE : Cardinality.SINGLE;
    if (questionType === QuestionType.TEXT_ENTRY) {
      return { baseType: BaseType.STRING, cardinality };
    }
    return { baseType: BaseType.FLOAT, cardinality };
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
