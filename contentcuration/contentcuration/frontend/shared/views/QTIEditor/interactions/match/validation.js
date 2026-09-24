import { ValidationError } from '../../constants';
import { hasRichTextContent, richTextComparisonKey } from '../../utils/richText';

/**
 * Validate MatchState → ValidationError[].
 *
 * Choice-scoped errors carry `id`; row-scoped errors carry the row's `index`;
 * duplication errors carry the repeated `text`, because an id may be repeated
 * across choices and so cannot single one out.
 *
 * @param {object} state - MatchState
 * @returns {Array<{ code: string, id?: string, index?: number, text?: string }>}
 */
export function validateMatchInteraction(state) {
  const errors = [];
  const { prompt, rows = [], distractors = [] } = state;

  if (!hasRichTextContent(prompt)) {
    errors.push({ code: ValidationError.PROMPT_REQUIRED });
  }

  // Every rule below asks the same two questions of a choice, and answering
  // either one parses its HTML — so each choice is read once, here.
  const read = ({ id, content }) => ({
    id,
    filled: hasRichTextContent(content),
    key: richTextComparisonKey(content),
  });
  const readRows = rows.map(row => ({ ...read(row), matches: row.matches.map(read) }));
  const readDistractors = distractors.map(read);
  const readChoices = [...readRows.flatMap(row => row.matches), ...readDistractors];

  readRows.forEach(({ filled }, index) => {
    if (!filled) {
      errors.push({ code: ValidationError.EMPTY_ROW_CONTENT, index });
    }
  });

  for (const { id, filled } of readChoices) {
    if (!filled) {
      errors.push({ code: ValidationError.EMPTY_CHOICE_CONTENT, id });
    }
  }

  let validRows = 0;
  readRows.forEach(({ filled, matches }, index) => {
    const matchKeyCounts = countFilledKeys(matches);
    if (matchKeyCounts.size === 0) {
      errors.push({ code: ValidationError.ROW_WITHOUT_MATCH, index });
    } else if (filled) {
      validRows += 1;
    }
    for (const [text, count] of matchKeyCounts) {
      if (count > 1) {
        errors.push({ code: ValidationError.DUPLICATE_MATCH_CONTENT, index, text });
      }
    }
  });

  if (validRows < 1) {
    errors.push({ code: ValidationError.TOO_FEW_ROWS });
  }

  const rowKeyCounts = countFilledKeys(readRows);
  readRows.forEach(({ filled, key }, index) => {
    if (filled && rowKeyCounts.get(key) > 1) {
      errors.push({ code: ValidationError.DUPLICATE_ROW_CONTENT, index });
    }
  });

  // An answer may serve several rows, so only distractors are flagged: one
  // repeating another distractor or any answer cannot be told apart from it.
  const choiceKeyCounts = countFilledKeys(readChoices);
  const repeated = new Set(
    readDistractors
      .filter(({ filled, key }) => filled && choiceKeyCounts.get(key) > 1)
      .map(({ key }) => key),
  );
  for (const text of repeated) {
    errors.push({ code: ValidationError.DUPLICATE_DISTRACTOR_CONTENT, text });
  }

  return errors;
}

/**
 * @param {Array<{ filled: boolean, key: string }>} readChoices
 * @returns {Map<string, number>}
 */
function countFilledKeys(readChoices) {
  const counts = new Map();
  for (const { filled, key } of readChoices) {
    if (filled) {
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return counts;
}
