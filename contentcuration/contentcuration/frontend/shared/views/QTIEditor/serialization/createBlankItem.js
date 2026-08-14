import { QuestionType } from '../constants';
import { choiceInteractionDescriptor } from '../interactions/choice/Descriptor';
import { _defaultState } from '../interactions/choice/parse';
import { generateRandomSlug } from '../utils/generateRandomSlug';
import { assembleItemXml } from './assembleItem';

/**
 * Title stamped on newly created items. Deliberately fixed rather than derived from the
 * item's position, which would go stale on the next reorder.
 */
export const DEFAULT_ITEM_TITLE = 'Question';

/**
 * Build the QTI XML for a brand new, empty assessment item.
 *
 * A new item cannot start with empty `raw_data`: the editor only renders an interaction
 * when one is present in the body, and the server validates every item against the QTI
 * schema before storing it. So a new item starts as the default interaction's empty
 * state, which the author then fills in.
 *
 * @returns {string} Full QTI assessment item XML
 */
export function createBlankItemXml() {
  const { bodyXml, responseDeclarations } = choiceInteractionDescriptor.buildXML(
    _defaultState(),
    QuestionType.SINGLE_SELECT,
  );

  return assembleItemXml({
    identifier: generateRandomSlug('item'),
    title: DEFAULT_ITEM_TITLE,
    language: '',
    bodyXml,
    responseDeclarations,
  });
}
