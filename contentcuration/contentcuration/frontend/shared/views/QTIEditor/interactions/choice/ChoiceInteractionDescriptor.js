import { QtiInteraction, QuestionType, BaseType, Cardinality } from '../../constants';
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

  /** @param {Element} el */
  matches(el) {
    return el.tagName.toLowerCase() === QtiInteraction.CHOICE;
  }

  /**
   * Reads max-choices: '1' → singleSelect, anything else → multiSelect.
   * @param {Element} el
   * @returns {string}
   */
  getQuestionType(el) {
    return el.getAttribute('max-choices') === '1'
      ? QuestionType.SINGLE_SELECT
      : QuestionType.MULTI_SELECT;
  }

  /**
   * @param {string} questionType
   * @returns {{ baseType: string, cardinality: string }}
   */
  getDeclarationSchema(questionType) {
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
   * @returns {{ bodyXml: string, declarations: string[] }}
   */
  buildXML(state, questionType) {
    return buildChoiceInteractionXML(state, questionType, this.getDeclarationSchema(questionType));
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
