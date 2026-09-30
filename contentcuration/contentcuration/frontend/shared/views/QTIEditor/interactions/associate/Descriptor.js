import { QtiInteraction, QuestionType, BaseType, Cardinality } from '../../constants';
import { InteractionDescriptor } from '../InteractionDescriptor';
import { parseAssociateInteraction, buildAssociateInteractionXML } from './parse';
import { validateAssociateInteraction } from './validation';

/**
 * Owns all associate-specific interaction logic: schema, parse, buildXML, and validate.
 */
export class AssociateInteractionDescriptor extends InteractionDescriptor {
  constructor() {
    super({
      type: QtiInteraction.ASSOCIATE,
      questionTypes: [QuestionType.ASSOCIATE],
    });
    this.convertsFrom = [];
  }

  getTypeOptions(tr) {
    return [
      {
        value: QuestionType.ASSOCIATE,
        label: tr.associateLabel$(),
        description: tr.associateDescription$(),
      },
    ];
  }

  /**
   * Associate always has exactly one question type.
   *
   * @returns {string}
   */
  getQuestionType() {
    return QuestionType.ASSOCIATE;
  }

  /**
   * @returns {{ baseType: string, cardinality: string }}
   */
  getResponseDeclarationSchema() {
    return {
      baseType: BaseType.PAIR,
      cardinality: Cardinality.MULTIPLE,
    };
  }

  /**
   * Parse <qti-associate-interaction> body XML + response declarations → AssociateState.
   *
   * @param {string} bodyXml
   * @param {string[]} responseDeclarations
   * @returns {object} AssociateState
   */
  parse(bodyXml, responseDeclarations) {
    return parseAssociateInteraction(bodyXml, responseDeclarations);
  }

  /**
   * Serialize AssociateState → { bodyXml, responseDeclarations }.
   *
   * @param {object} state - AssociateState
   * @param {string} questionType
   * @returns {{ bodyXml: string, responseDeclarations: string[] }}
   */
  buildXML(state, questionType) {
    return buildAssociateInteractionXML(state, questionType, this.getResponseDeclarationSchema());
  }

  /**
   * Validate AssociateState → ValidationError[].
   *
   * @param {object} state - AssociateState
   * @returns {Array<{ code: string, id?: string, index?: number }>}
   */
  validate(state) {
    return validateAssociateInteraction(state);
  }
}

/** Singleton — safe to import from any file in the associate module tree. */
export const associateInteractionDescriptor = new AssociateInteractionDescriptor();
