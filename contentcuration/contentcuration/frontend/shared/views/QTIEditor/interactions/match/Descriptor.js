import { QtiInteraction, QuestionType, BaseType, Cardinality } from '../../constants';
import { InteractionDescriptor } from '../InteractionDescriptor';
import { parseMatchInteraction, buildMatchInteractionXML, hasTwoMatchSets } from './parse';
import { validateMatchInteraction } from './validation';

/**
 * Owns all match-specific interaction logic: schema, parse, buildXML, and validate.
 */
export class MatchInteractionDescriptor extends InteractionDescriptor {
  constructor() {
    super({
      type: QtiInteraction.MATCH,
      questionTypes: [QuestionType.MATCH],
    });
    this.convertsFrom = [];
  }

  getTypeOptions(tr) {
    return [
      {
        value: QuestionType.MATCH,
        label: tr.matchLabel$(),
        description: tr.matchDescription$(),
      },
    ];
  }

  /**
   * Match always has exactly one question type. Throws on a shape the editor cannot
   * represent, which resolveDescriptor reports as a parse error.
   *
   * @param {Element} el
   * @returns {string}
   */
  getQuestionType(el) {
    if (!hasTwoMatchSets(el)) {
      throw new Error('qti-match-interaction must have exactly two qti-simple-match-set');
    }
    return QuestionType.MATCH;
  }

  /**
   * @returns {{ baseType: string, cardinality: string }}
   */
  getResponseDeclarationSchema() {
    return {
      baseType: BaseType.DIRECTED_PAIR,
      cardinality: Cardinality.MULTIPLE,
    };
  }

  /**
   * Parse <qti-match-interaction> body XML + response declarations → MatchState.
   *
   * @param {string} bodyXml
   * @param {string[]} responseDeclarations
   * @returns {object} MatchState
   */
  parse(bodyXml, responseDeclarations) {
    return parseMatchInteraction(bodyXml, responseDeclarations);
  }

  /**
   * Serialize MatchState → { bodyXml, responseDeclarations }.
   *
   * @param {object} state - MatchState
   * @param {string} questionType
   * @returns {{ bodyXml: string, responseDeclarations: string[] }}
   */
  buildXML(state, questionType) {
    return buildMatchInteractionXML(state, questionType, this.getResponseDeclarationSchema());
  }

  /**
   * Validate MatchState → ValidationError[].
   *
   * @param {object} state - MatchState
   * @returns {Array<{ code: string, id?: string, index?: number, text?: string }>}
   */
  validate(state) {
    return validateMatchInteraction(state);
  }
}

/** Singleton — safe to import from any file in the match module tree. */
export const matchInteractionDescriptor = new MatchInteractionDescriptor();
