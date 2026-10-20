import { QtiInteraction, QuestionType, BaseType, Cardinality } from '../../constants';
import { InteractionDescriptor } from '../InteractionDescriptor';
import { parseGapMatchInteraction, buildGapMatchInteractionXML } from './parse';
import { validateGapMatchInteraction } from './validation';

class GapMatchInteractionDescriptor extends InteractionDescriptor {
  constructor() {
    super({
      type: QtiInteraction.GAP_MATCH,
      questionTypes: [QuestionType.GAP_MATCH],
    });
  }

  getQuestionType() {
    return QuestionType.GAP_MATCH;
  }

  getResponseDeclarationSchema() {
    return {
      baseType: BaseType.DIRECTED_PAIR,
      cardinality: Cardinality.MULTIPLE,
    };
  }

  parse(bodyXml, responseDeclarations) {
    return parseGapMatchInteraction(bodyXml, responseDeclarations);
  }

  buildXML(state, questionType) {
    return buildGapMatchInteractionXML(state, questionType, this.getResponseDeclarationSchema());
  }

  validate(state) {
    return validateGapMatchInteraction(state);
  }
}

export const gapMatchInteractionDescriptor = new GapMatchInteractionDescriptor();
