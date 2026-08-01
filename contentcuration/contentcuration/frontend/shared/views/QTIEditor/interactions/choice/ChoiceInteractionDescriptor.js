import { QtiInteraction, QuestionType, BaseType, Cardinality } from '../../constants';
import { parseXML } from '../../serialization/parseItem';
import { parseChoiceInteraction, buildChoiceInteractionXML } from './parse';
import { validateChoiceInteraction } from './validation';

/**
 * Owns all choice-specific interaction logic: schema, parse, buildXML, and validate.
 */
export class ChoiceInteractionDescriptor {
  constructor({ editorComponent = null } = {}) {
    this.type = QtiInteraction.CHOICE;
    this.placement = 'block';
    this.questionTypes = [QuestionType.SINGLE_SELECT, QuestionType.MULTI_SELECT];
    this.editorComponent = editorComponent;
    this.convertsFrom = [];
  }

  getTypeOptions(tr) {
    return [
      {
        value: QuestionType.SINGLE_SELECT,
        label: tr.singleSelectLabel$(),
        description: tr.singleChoiceDescription$(),
      },
      {
        value: QuestionType.MULTI_SELECT,
        label: tr.multiSelectLabel$(),
        description: tr.multipleSelectionDescription$(),
      },
    ];
  }

  /** @param {Element} el */
  matches(el) {
    return el.tagName.toLowerCase() === QtiInteraction.CHOICE;
  }

  /**
   * Reads cardinality from the response declaration to determine question type.
   *
   * @param {Element} el
   * @param {string[]} [responseDeclarations]
   * @returns {string}
   */
  getQuestionType(el, responseDeclarations = []) {
    if (responseDeclarations.length > 0) {
      const doc = parseXML(responseDeclarations[0]);
      const cardinality = doc.documentElement.getAttribute('cardinality');
      if (cardinality) {
        return cardinality === Cardinality.MULTIPLE
          ? QuestionType.MULTI_SELECT
          : QuestionType.SINGLE_SELECT;
      }
    }
    // Fallback to max-choices if declarations are missing or malformed
    return el.getAttribute('max-choices') === '1'
      ? QuestionType.SINGLE_SELECT
      : QuestionType.MULTI_SELECT;
  }

  /**
   * @param {string} questionType
   * @returns {{ baseType: string, cardinality: string }}
   */
  getResponseDeclarationSchema(questionType) {
    return {
      baseType: BaseType.IDENTIFIER,
      cardinality:
        questionType === QuestionType.SINGLE_SELECT ? Cardinality.SINGLE : Cardinality.MULTIPLE,
    };
  }
  /**
   * Parse <qti-choice-interaction> body XML + response declarations → ChoiceState.
   *
   * @param {string} bodyXml
   * @param {string[]} responseDeclarations
   * @returns {object} ChoiceState
   */
  parse(bodyXml, responseDeclarations) {
    return parseChoiceInteraction(bodyXml, responseDeclarations);
  }

  /**
   * Serialize ChoiceState → { bodyXml, declarations }.
   *
   * @param {object} state - ChoiceState
   * @param {string} questionType
   * @returns {{ bodyXml: string, responseDeclarations: string[] }}
   */
  buildXML(state, questionType) {
    return buildChoiceInteractionXML(
      state,
      questionType,
      this.getResponseDeclarationSchema(questionType),
    );
  }

  /**
   * Validate ChoiceState → ValidationError[].
   *
   * @param {object} state - ChoiceState
   * @param {string} questionType
   * @returns {Array<{ code: string, id?: string }>}
   */
  validate(state, questionType) {
    return validateChoiceInteraction(state, questionType);
  }
}

/** Singleton — safe to import from any file in the choice module tree. */
export const choiceInteractionDescriptor = new ChoiceInteractionDescriptor();
