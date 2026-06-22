import defineInteraction from '../defineInteraction';
import { QtiInteraction, QuestionType, BaseType, Cardinality } from '../../constants';
import ChoiceInteractionEditor from './ChoiceInteractionEditor.vue';

/**
 * Choice interaction plugin — handles both single-select (max-choices="1")
 * and multi-select (max-choices > 1) via the same <qti-choice-interaction> element.
 */
export default defineInteraction({
  /** Registry key — matches the QTI 3.0 interaction element tag name. */
  type: QtiInteraction.CHOICE,

  /** Block-level interaction: occupies its own paragraph in the item body. */
  placement: 'block',

  /**
   * All QuestionType values this descriptor can render.
   * Allows the registry to resolve a descriptor from a selected question type
   * without re-parsing XML.
   */
  questionTypes: [QuestionType.SINGLE_SELECT, QuestionType.MULTI_SELECT],

  /** Vue component rendered inside InteractionSection when this descriptor owns the block. */
  editorComponent: ChoiceInteractionEditor,

  /**
   * Types this plugin can absorb when the author switches interaction type.
   */
  convertsFrom: [],

  /**
   * Returns true when this descriptor owns the given interaction element.
   * @param {Element} el
   */
  matches(el) {
    return el.tagName.toLowerCase() === QtiInteraction.CHOICE;
  },

  /**
   * Derives the UI-facing question type from the interaction element.
   * Reads max-choices: '1' → singleSelect, anything else → multiSelect.
   * @param {Element} el
   * @returns {string} One of QuestionType
   */
  getQuestionType(el) {
    return el.getAttribute('max-choices') === '1'
      ? QuestionType.SINGLE_SELECT
      : QuestionType.MULTI_SELECT;
  },

  /**
   * Defines the structural schema for the response declaration of this interaction.
   * Returns baseType and cardinality, which can depend on the selected questionType.
   *
   * @param {string} questionType
   * @returns {{ baseType: string, cardinality: string }}
   */
  getDeclarationSchema(questionType) {
    return {
      baseType: BaseType.IDENTIFIER,
      cardinality:
        questionType === QuestionType.SINGLE_SELECT ? Cardinality.SINGLE : Cardinality.MULTIPLE,
    };
  },

  /**
   * Extracts a structured state object from the interaction element.
   * Stub — full parsing is a future task.
   * @returns {object}
   */
  parse() {
    return {};
  },

  /**
   * Validates the interaction state and returns an array of error strings.
   * Stub — full validation is a future task.
   * @returns {string[]}
   */
  validate() {
    return [];
  },
});
