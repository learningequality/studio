import pick from 'lodash/pick';
import { ContentLevel, ConversionLoss } from '../constants';
import { descriptors } from '../interactions/descriptors';
import { answersHaveContent, carryAnswers } from './answers';
import { hasContent } from './content';
import { carryPassage, foldPassage, passageHasContent } from './passage';

/**
 * Changing a question's type: carrying what the question holds into the type the author
 * picked, and naming what that would remove or change, so the author can confirm first.
 *
 * Each descriptor exports its state into neutral *facets* and imports from them; nothing
 * here knows any interaction's state. A facet only moves between types that take it, so
 * content only moves within a family of similar types: answer lists, pairs, or passages.
 * Everything a type doesn't take is a loss, so a new interaction that implements none of
 * this still keeps the question and warns before anything else goes.
 */

/**
 * Distractors (wrong options) travel inside the facet of the answers they go with:
 * `pairs.distractors` and `passage.distractors`. So they only carry over to a type that
 * takes those answers, and are removed with them otherwise. An associate distractor never
 * ends up in a gap match pool, for example. Answer lists have no separate distractors: a
 * wrong option is an item not marked correct.
 *
 * @typedef {object} ConvertibleContent
 * @property {string} prompt - The question's HTML
 * @property {import('./answers').AnswerList} [answers]
 * @property {{ items: Array<{ source: string, target: string }>, distractors: string[] }} [pairs]
 *   Rich HTML, each pair from its source to its target
 * @property {import('./passage').Passage} [passage]
 * @property {Object<string, *>} [settings] - The settings the author changed from the value
 *   each starts at, by name, and their values. One kept on each answer is changed when it is
 *   for any of them; the answers carry their own.
 */

/**
 * @typedef {object} ConversionFormat - The facets a question type takes
 * @property {import('./answers').AnswerFormat} [answers]
 * @property {boolean} [pairs]
 * @property {{ contentLevel: string }} [passage] - `contentLevel` is the ContentLevel: how
 *   much markup the type's blank answers, options and distractors can hold
 * @property {Object<string, *>} [settings] - Each setting the type keeps, by name, and the
 *   value it starts at: the ones its author can change, and any it always has on, such as an
 *   ordering question's shuffle
 */

// Declaration order, which ConversionLoss documents as the order the author reads them in.
const LOSS_ORDER = Object.values(ConversionLoss);

function pairsHaveContent({ items, distractors }) {
  const has = content => hasContent(content, ContentLevel.RICH);
  return items.some(({ source, target }) => has(source) || has(target)) || distractors.some(has);
}

/**
 * Carry content into the facets a question type takes.
 *
 * @param {ConvertibleContent} content
 * @param {ConversionFormat} format
 * @returns {{ carried: ConvertibleContent, losses: string[] }} `losses` are ConversionLoss
 *   codes, each once, in the order the author is told about them
 */
export function carryContent(content, format) {
  const losses = new Set();
  const carried = { prompt: content.prompt ?? '' };

  if (content.answers) {
    if (format.answers) {
      const result = carryAnswers(content.answers, format.answers);
      carried.answers = result.answers;
      result.losses.forEach(loss => losses.add(loss));
    } else if (answersHaveContent(content.answers)) {
      losses.add(ConversionLoss.ANSWERS_REMOVED);
    }
  }

  if (content.pairs) {
    if (format.pairs) {
      carried.pairs = content.pairs;
    } else if (pairsHaveContent(content.pairs)) {
      losses.add(ConversionLoss.ANSWERS_REMOVED);
    }
  }

  if (content.passage) {
    if (format.passage) {
      const result = carryPassage(content.passage, format.passage);
      carried.passage = result.passage;
      result.losses.forEach(loss => losses.add(loss));
    } else if (passageHasContent(content.passage)) {
      // The passage is often the whole question, so it stays, as part of the question.
      carried.prompt = foldPassage(carried.prompt, content.passage.html);
      losses.add(ConversionLoss.PASSAGE_ADDED_TO_QUESTION);
    }
  }

  // Settings travel on their own, so one carries to a type that has it even when the
  // answers it applied to don't.
  if (content.settings) {
    const kept = Object.keys(format.settings ?? {});
    carried.settings = pick(content.settings, kept);
    if (Object.keys(content.settings).some(setting => !kept.includes(setting))) {
      losses.add(ConversionLoss.SETTINGS_REMOVED);
    }
  }

  return { carried, losses: LOSS_ORDER.filter(loss => losses.has(loss)) };
}

function descriptorFor(questionType) {
  const descriptor = descriptors.find(d => d.questionTypes.includes(questionType));
  if (!descriptor) {
    throw new Error(`No interaction authors question type ${questionType}`);
  }
  return descriptor;
}

/**
 * Convert an interaction to another question type.
 *
 * Pure: nothing changes until the caller uses the result, so it can be run to find the
 * losses before asking the author, and again once they confirm.
 *
 * @param {object} options
 * @param {{ bodyXml: string, responseDeclarations: string[] }} options.interaction
 * @param {string} options.fromType - The QuestionType the interaction is now
 * @param {string} options.toType - The QuestionType to convert it to
 * @returns {{
 *   interaction: { bodyXml: string, responseDeclarations: string[] },
 *   losses: string[],
 * }} `losses` are ConversionLoss codes, empty when nothing would be lost
 */
export function convertInteraction({ interaction, fromType, toType }) {
  const from = descriptorFor(fromType);
  const to = descriptorFor(toType);
  const state = from.parse(interaction.bodyXml, interaction.responseDeclarations);
  const content = from.exportContent(state, fromType);
  const { carried, losses } = carryContent(content, to.getConversionFormat(toType));
  return {
    interaction: to.buildXML(to.importContent(carried, toType), toType),
    losses,
  };
}
