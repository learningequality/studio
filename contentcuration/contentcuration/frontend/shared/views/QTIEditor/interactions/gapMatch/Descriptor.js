import { QtiInteraction, QuestionType, BaseType, Cardinality } from '../../constants';
import { contentChildrenOf } from '../../serialization/xml';
import { InteractionDescriptor } from '../InteractionDescriptor';
import { parseGapMatchInteraction, buildGapMatchInteractionXML } from './parse';
import { validateGapMatchInteraction } from './validation';
import {
  exportGapMatchContent,
  getGapMatchConversionFormat,
  importGapMatchContent,
} from './convert';

class GapMatchInteractionDescriptor extends InteractionDescriptor {
  constructor() {
    super({
      type: QtiInteraction.GAP_MATCH,
      questionTypes: [QuestionType.GAP_MATCH],
    });
  }

  /** @param {Element} bodyEl */
  isSupportedBody(bodyEl) {
    if (!super.isSupportedBody(bodyEl)) return false;
    const [interactionEl] = contentChildrenOf(bodyEl);
    return (
      !interactionEl.hasAttribute('min-associations') &&
      !interactionEl.querySelector('qti-gap-img, [match-group]')
    );
  }

  getQuestionType() {
    return QuestionType.GAP_MATCH;
  }

  getTypeOptions(tr) {
    return [
      {
        value: QuestionType.GAP_MATCH,
        label: tr.gapMatchLabel$(),
        description: tr.gapMatchDescription$(),
      },
    ];
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

  /**
   * @returns {import('../../conversion').ConversionFormat}
   */
  getConversionFormat() {
    return getGapMatchConversionFormat();
  }

  /**
   * @param {import('./parse').GapMatchState} state
   * @returns {import('../../conversion').ConvertibleContent}
   */
  exportContent(state) {
    return exportGapMatchContent(state);
  }

  /**
   * @param {import('../../conversion').ConvertibleContent} content
   * @returns {import('./parse').GapMatchState}
   */
  importContent(content) {
    return importGapMatchContent(content);
  }
}

export const gapMatchInteractionDescriptor = new GapMatchInteractionDescriptor();
