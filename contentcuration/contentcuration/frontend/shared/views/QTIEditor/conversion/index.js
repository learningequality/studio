import { ContentLevel, ConversionLoss } from '../constants';
import { descriptors } from '../interactions/descriptors';
import { answersHaveContent, carryAnswers } from './answerKeys';
import { hasContent } from './content';
import { carryPassage, foldPassage, passageHasContent } from './passage';

/**
 * Changing a question's type: carrying what the question holds into the type the author
 * picked, and naming what that would remove or change, so the author can confirm first.
 *
 * Each descriptor exports its state into neutral *facets* and imports from them; nothing
 * here knows any interaction's state. A facet only moves between types that take it, so
 * content only moves within a family of similar types: answer lists, pairs, or passages.
 * Everything the new type doesn't take is reported as a loss, so converting *to* an
 * interaction that implements none of this keeps the question and warns before anything
 * else goes. Converting *from* one is not safe: it exports only the question, so the rest
 * is lost without a warning. conversion/__tests__/exportsEverything.spec.js
 * fails for such an interaction.
 */

/**
 * Distractors are not a facet of their own: they belong to the answers they are mixed in with,
 * so each family that has them keeps them in its facet (pairs, passage), and they move only
 * where those answers move. An answer list has none: a wrong choice is an item not marked
 * correct.
 *
 * @typedef {object} ConvertibleContent
 * @property {string} prompt - The question's HTML
 * @property {import('./answerKeys').AnswerList} [answers]
 * @property {{ items: Array<{ source: string, target: string }>, distractors: string[] }} [pairs]
 *   Rich HTML, each pair from its source to its target
 * @property {import('./passage').Passage} [passage]
 */

/**
 * @typedef {object} ConversionFormat - The facets a question type takes
 * @property {import('./answerKeys').AnswerFormat} [answers]
 * @property {boolean} [pairs]
 * @property {{ level: string }} [passage] - The ContentLevel its blanks' answers are at
 */

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
 * @param {string} [options.language] - The exercise language, which answers the author sees
 *   written in it (numeric ones) are exported in, as the author saw them
 * @returns {{
 *   interaction: { bodyXml: string, responseDeclarations: string[] },
 *   losses: string[],
 * }} `losses` are ConversionLoss codes, empty when nothing would be lost
 */
export function convertInteraction({ interaction, fromType, toType, language }) {
  const from = descriptorFor(fromType);
  const to = descriptorFor(toType);
  const state = from.parse(interaction.bodyXml, interaction.responseDeclarations);
  const content = from.exportContent(state, fromType, { language });
  const { carried, losses } = carryContent(content, to.getConversionFormat(toType));
  return {
    interaction: to.buildXML(to.importContent(carried, toType), toType),
    losses,
  };
}
