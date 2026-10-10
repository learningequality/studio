import { BaseType } from '../../constants';
import { parseXML } from '../../serialization/xml';
import { InteractionDescriptor } from '../../interactions/InteractionDescriptor';
import { descriptors } from '../../interactions/descriptors';
import { QUESTION_TYPES, filledInteraction } from './questions';

/**
 * A question's content survives a type change only if its descriptor exports it: anything
 * left out is lost without a warning. These check every registered interaction, so a new
 * one, or a new field on an existing one, can't skip it.
 */

const CONTENT_BASE_TYPES = [BaseType.STRING, BaseType.FLOAT];

const words = text => text.match(/[\p{L}\p{N}]+/gu) ?? [];

/** Each text node on its own, so the text of neighbouring elements doesn't run together. */
const textNodes = node =>
  node.nodeType === Node.TEXT_NODE ? [node.nodeValue] : [...node.childNodes].flatMap(textNodes);

/**
 * Every word the saved question holds: the text of its body, and the values its response
 * declarations hold as content (accepted text and numbers) rather than as identifiers.
 */
function savedWords({ bodyXml, responseDeclarations }) {
  const values = responseDeclarations.flatMap(declarationXml => {
    const declaration = parseXML(declarationXml).documentElement;
    if (!CONTENT_BASE_TYPES.includes(declaration.getAttribute('base-type'))) {
      return [];
    }
    return [
      ...[...declaration.querySelectorAll('qti-value')].map(el => el.textContent),
      ...[...declaration.querySelectorAll('qti-map-entry')].map(el => el.getAttribute('map-key')),
    ];
  });
  return [...textNodes(parseXML(bodyXml).documentElement), ...values].flatMap(words);
}

/** Every word in the exported facets' text. */
function exportedWords(content) {
  if (typeof content === 'string') {
    return textNodes(parseXML(`<!DOCTYPE html><body>${content}</body>`, 'text/html').body).flatMap(
      words,
    );
  }
  if (content && typeof content === 'object') {
    return Object.values(content).flatMap(exportedWords);
  }
  return [];
}

const questionTypes = descriptors.flatMap(descriptor =>
  descriptor.questionTypes.map(questionType => [questionType, descriptor]),
);

describe('every interaction', () => {
  it.each(questionTypes)('has a filled %s question to test its conversion with', questionType => {
    expect(QUESTION_TYPES).toContain(questionType);
  });

  it.each(descriptors.map(descriptor => [descriptor.type, descriptor]))(
    '%s exports its content for conversion',
    (_, descriptor) => {
      expect(descriptor.exportContent).not.toBe(InteractionDescriptor.prototype.exportContent);
    },
  );

  it.each(questionTypes)(
    'exports every word a filled %s question holds',
    (questionType, descriptor) => {
      const interaction = filledInteraction(questionType);
      const state = descriptor.parse(interaction.bodyXml, interaction.responseDeclarations);
      const exported = new Set(exportedWords(descriptor.exportContent(state, questionType)));
      const missing = savedWords(interaction).filter(word => !exported.has(word));
      expect(missing).toEqual([]);
    },
  );
});
