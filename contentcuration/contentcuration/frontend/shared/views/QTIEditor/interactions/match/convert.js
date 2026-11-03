import flatMap from 'lodash/flatMap';
import { newChoice } from '../associate/parse';
import { _defaultState, newRow } from './parse';
import { richTextComparisonKey } from 'shared/views/TipTapEditor/TipTapEditor/utils/comparisonKey';

/**
 * @returns {import('../../conversion').ConversionFormat}
 */
export function getMatchConversionFormat() {
  // Learners always see the choices shuffled, so another type's shuffle is kept.
  return { pairs: true, settings: { shuffle: true } };
}

/**
 * Each row gives one pair per match. A row with no match yet still gives one, with nothing
 * to pair it with, so the row itself isn't lost.
 *
 * @param {import('./parse').MatchState} state
 * @returns {import('../../conversion').ConvertibleContent}
 */
export function exportMatchContent(state) {
  return {
    prompt: state.prompt,
    pairs: {
      items: flatMap(state.rows, ({ content, matches }) =>
        matches.length
          ? matches.map(match => ({ source: content, target: match.content }))
          : [{ source: content, target: '' }],
      ),
      distractors: state.distractors.map(({ content }) => content),
    },
  };
}

/**
 * Pairs from the same source become one row, matched to each of their targets, so a row that
 * went to associate as several pairs comes back as the row it was. A blank source is a row of
 * its own, as two blank rows are two rows the author has yet to fill in.
 *
 * @param {Array<{ source: string, target: string }>} items
 * @returns {import('./parse').MatchRow[]}
 */
function rowsFromPairs(items) {
  const rows = [];
  const rowByKey = new Map();
  for (const { source, target } of items) {
    const key = richTextComparisonKey(source);
    let row = key ? rowByKey.get(key) : null;
    if (!row) {
      row = newRow({ content: source, matches: [] });
      rows.push(row);
      if (key) rowByKey.set(key, row);
    }
    const targetKey = richTextComparisonKey(target);
    const repeated = row.matches.some(match => richTextComparisonKey(match.content) === targetKey);
    if (targetKey && !repeated) row.matches.push(newChoice(target));
  }
  // A row has a match to fill in, even before it has an answer.
  for (const row of rows) {
    if (!row.matches.length) row.matches.push(newChoice());
  }
  return rows;
}

/**
 * @param {import('../../conversion').ConvertibleContent} content
 * @returns {import('./parse').MatchState}
 */
export function importMatchContent({ prompt, pairs }) {
  const state = _defaultState();
  const items = pairs?.items ?? [];
  return {
    ...state,
    prompt,
    rows: items.length ? rowsFromPairs(items) : state.rows,
    distractors: (pairs?.distractors ?? []).map(content => newChoice(content)),
  };
}
