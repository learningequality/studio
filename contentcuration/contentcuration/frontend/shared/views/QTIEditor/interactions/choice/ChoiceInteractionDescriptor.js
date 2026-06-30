import {
  QtiInteraction,
  QuestionType,
  BaseType,
  Cardinality,
  ValidationError,
} from '../../constants';
import { QTIDeclaration } from '../../serialization/qti/QTIDeclaration';
import { parseXML, getPromptHTML } from '../../serialization/parseItem';
import { buildXmlNode } from '../../serialization/assembleItem';
import CorrectResponse from '../../serialization/qti/declarations/correctResponse';
import { generateRandomSlug } from '../../utils/generateRandomSlug';

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
   * Convenience: create a blank response declaration using this descriptor's schema.
   * @param {string} questionType
   * @param {string} [identifier]
   * @returns {QTIDeclaration}
   */
  createDeclaration(questionType, identifier = 'RESPONSE') {
    return QTIDeclaration.fromInteractionDescriptor(this, questionType, identifier);
  }

  /**
   * Parse <qti-choice-interaction> body XML + response declarations → ChoiceState.
   *
   * @param {string} bodyXml
   * @param {string[]} responseDeclarations
   * @returns {object} ChoiceState
   */
  parse(bodyXml, responseDeclarations) {
    if (!bodyXml) return _defaultState();

    let root;
    try {
      root = parseXML(bodyXml).documentElement;
    } catch {
      return _defaultState();
    }

    const maxChoices = parseInt(root.getAttribute('max-choices') ?? '0', 10);
    const minChoices = parseInt(root.getAttribute('min-choices') ?? '0', 10);
    const shuffle = root.getAttribute('shuffle') === 'true';
    const orientation = root.getAttribute('orientation') ?? 'vertical';
    const prompt = getPromptHTML(root);

    const correctIds = _extractCorrectIds(responseDeclarations);

    const answers = [...root.querySelectorAll('qti-simple-choice')].map(el => ({
      id: el.getAttribute('identifier') || generateRandomSlug('choice'),
      content: el.innerHTML,
      correct: correctIds.has(el.getAttribute('identifier') ?? ''),
      fixed: el.getAttribute('fixed') === 'true',
    }));

    return { prompt, answers, maxChoices, minChoices, shuffle, orientation };
  }

  /**
   * Serialize ChoiceState → { bodyXml, declarations }.
   *
   * @param {object} state - ChoiceState
   * @param {string} questionType
   * @returns {{ bodyXml: string, declarations: string[] }}
   */
  buildXML(state, questionType) {
    const { prompt, answers, maxChoices, minChoices, shuffle, orientation } = state;

    const attrs = {
      'response-identifier': RESPONSE_IDENTIFIER,
      'max-choices': maxChoices,
      shuffle: String(shuffle),
      orientation,
    };
    if (minChoices > 0) attrs['min-choices'] = minChoices;

    const children = [];

    if (prompt) {
      children.push(buildXmlNode({ tag: 'qti-prompt', children: _parseHtmlFragment(prompt) }));
    }

    for (const answer of answers) {
      const choiceAttrs = { identifier: answer.id };
      if (answer.fixed) choiceAttrs.fixed = 'true';
      children.push(
        buildXmlNode({
          tag: 'qti-simple-choice',
          attrs: choiceAttrs,
          children: _parseHtmlFragment(answer.content),
        }),
      );
    }

    const interactionEl = buildXmlNode({ tag: 'qti-choice-interaction', attrs, children });
    const bodyXml = serializer.serializeToString(interactionEl);

    const { cardinality } = this.getDeclarationSchema(questionType);
    const declaration = new QTIDeclaration({
      identifier: RESPONSE_IDENTIFIER,
      baseType: BaseType.IDENTIFIER,
      cardinality,
      tag: 'qti-response-declaration',
    });
    const correctIds = answers.filter(a => a.correct).map(a => a.id);
    new CorrectResponse(correctIds, declaration);

    const declarationXml = serializer.serializeToString(declaration.getXML());
    return { bodyXml, declarations: [declarationXml] };
  }

  /**
   * Validate ChoiceState → ValidationError[].
   *
   * @param {object} state - ChoiceState
   * @param {string} questionType
   * @returns {Array<{ code: string, id?: string }>}
   */
  validate(state, questionType) {
    const errors = [];
    const { prompt, answers } = state;

    if (!_stripTags(prompt).trim()) {
      errors.push({ code: ValidationError.PROMPT_REQUIRED });
    }

    if (answers.length < 2) {
      errors.push({ code: ValidationError.TOO_FEW_CHOICES });
    }

    for (const answer of answers) {
      if (!_stripTags(answer.content).trim()) {
        errors.push({ code: ValidationError.EMPTY_CHOICE_CONTENT, id: answer.id });
      }
    }

    const correctCount = answers.filter(a => a.correct).length;
    if (correctCount === 0) {
      errors.push({ code: ValidationError.NO_CORRECT_ANSWER });
    } else if (questionType === QuestionType.SINGLE_SELECT && correctCount > 1) {
      errors.push({ code: ValidationError.TOO_MANY_CORRECT_ANSWERS });
    }

    return errors;
  }
}

/** Singleton — safe to import from any file in the choice module tree. */
export const choiceInteractionDescriptor = new ChoiceInteractionDescriptor();

// ---------------------------------------------------------------------------
// Module-level constants and private helpers
// ---------------------------------------------------------------------------

const serializer = new XMLSerializer();
const RESPONSE_IDENTIFIER = 'RESPONSE';

function _defaultState() {
  return {
    prompt: '',
    answers: [],
    maxChoices: 1,
    minChoices: 0,
    shuffle: false,
    orientation: 'vertical',
  };
}

function _extractCorrectIds(declarations) {
  const ids = new Set();
  for (const declXml of declarations) {
    let declEl;
    try {
      declEl = parseXML(declXml).documentElement;
    } catch {
      continue;
    }
    const declaration = QTIDeclaration.fromXML(declEl);
    const correct = declaration.correctResponse;
    if (correct) {
      for (const id of correct) ids.add(id);
      break;
    }
  }
  return ids;
}

function _parseHtmlFragment(html) {
  if (!html) return [];
  if (!html.includes('<')) return [html];
  try {
    const fragment = parseXML(`<qti-fragment>${html}</qti-fragment>`);
    return [...fragment.documentElement.childNodes];
  } catch {
    return [html];
  }
}

function _stripTags(html) {
  return (html ?? '').replace(/<[^>]*>/g, '');
}
