import { QtiInteraction, QuestionType, BaseType, Cardinality } from '../../constants';
import { parseOrderingInteraction, buildOrderingInteractionXML } from './parse';
import { validateOrderingInteraction } from './validate';

/**
 * Owns all ordering-specific interaction logic: schema, parse, buildXML, and validate.
 */
export class OrderingInteractionDescriptor {
  constructor({ editorComponent = null } = {}) {
    this.type = QtiInteraction.ORDER;
    this.placement = 'block';
    this.questionTypes = [QuestionType.ORDERING];
    this.editorComponent = editorComponent;
    this.convertsFrom = [];
  }

  getTypeOptions(tr) {
    return [
      {
        value: QuestionType.ORDERING,
        label: tr.orderingLabel$(),
        description: tr.orderingDescription$(),
      },
    ];
  }

  /** @param {Element} el */
  matches(el) {
    return el.tagName.toLowerCase() === QtiInteraction.ORDER;
  }

  /**
   * Ordering always has exactly one question type.
   *
   * @returns {string}
   */
  getQuestionType() {
    return QuestionType.ORDERING;
  }

  /**
   * @returns {{ baseType: string, cardinality: string }}
   */
  getResponseDeclarationSchema() {
    return {
      baseType: BaseType.IDENTIFIER,
      cardinality: Cardinality.ORDERED,
    };
  }

  /**
   * Parse <qti-order-interaction> body XML + response declarations → OrderingState.
   *
   * @param {string} bodyXml
   * @param {string[]} responseDeclarations
   * @returns {object} OrderingState
   */
  parse(bodyXml, responseDeclarations) {
    return parseOrderingInteraction(bodyXml, responseDeclarations);
  }

  /**
   * Serialize OrderingState → { bodyXml, responseDeclarations }.
   *
   * @param {object} state - OrderingState
   * @param {string} questionType
   * @returns {{ bodyXml: string, responseDeclarations: string[] }}
   */
  buildXML(state, questionType) {
    return buildOrderingInteractionXML(state, questionType, this.getResponseDeclarationSchema());
  }

  /**
   * Validate OrderingState → ValidationError[].
   *
   * @param {object} state - OrderingState
   * @returns {Array<{ code: string, id?: string }>}
   */
  validate(state) {
    return validateOrderingInteraction(state);
  }
}

/** Singleton — safe to import from any file in the ordering module tree. */
export const orderingInteractionDescriptor = new OrderingInteractionDescriptor();
