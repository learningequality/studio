/**
 * Convert latex formulas to their simple HTML representation
 * (that will be later processed by MathQuill)
 * E.g. $$1_2$$ => <span class="math-field">1_2</span>
 */

import { CLASS_MATH_FIELD } from '../../constants';

const DOLLAR_SIGN = 36;
let lastFormulaEndPos = null;

const formula = state => {
  const startPos = state.pos;
  const maxPos = state.posMax;

  // no need to continue - if this condition is satisfied, it means that
  // we are approaching content end and at this point, no other formula
  // can fit in as minimal formula length is 5 characters (e.g. $$a$$)
  if (maxPos - startPos < 5) {
    lastFormulaEndPos = null;
    return false;
  }

  const startsWithTwoDollarSigns =
    state.src.charCodeAt(startPos) === DOLLAR_SIGN &&
    state.src.charCodeAt(startPos + 1) === DOLLAR_SIGN;

  if (!startsWithTwoDollarSigns) {
    return false;
  }

  // don't treat space between two formulas as a formula
  // e.g. $$a_b$$ text $$a_b$$ - " text " is not a formula
  if (startPos + 1 === lastFormulaEndPos) {
    return false;
  }

  let formulaFound = false;

  state.pos = startPos + 2;

  while (state.pos < maxPos) {
    if (
      state.src.charCodeAt(state.pos) === DOLLAR_SIGN &&
      state.src.charCodeAt(state.pos + 1) === DOLLAR_SIGN
    ) {
      formulaFound = true;
      break;
    }

    state.md.inline.skipToken(state);
  }

  if (!formulaFound || startPos + 2 === state.pos) {
    state.pos = startPos;
    return false;
  }

  const formula = state.src.slice(startPos + 2, state.pos);
  lastFormulaEndPos = state.pos + 1;

  let token;

  token = state.push('formula_open', 'span', 1); // type, tag, nesting
  token.markup = '$$';
  token.content = '';
  token.attrs = [['class', CLASS_MATH_FIELD]];

  token = state.push('text', '', 0);
  token.content = formula;

  token = state.push('formula_close', 'span', -1);
  token.markup = '$$';
  token.content = '';

  // allow users to continue writing a text in HTML mode
  // (otherwise cursor would stay stuck in a formula field)
  state.push('text', '&nbps;', 0);

  state.md.inline.skipToken(state);
  state.md.inline.skipToken(state);

  return true;
};

const formulaPlugin = md => {
  md.inline.ruler.push('formula', formula);
};

export default formulaPlugin;
