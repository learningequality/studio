import { createTranslator } from 'shared/i18n';

// TEMPORARY WORKAROUND: These strings localize mathlive's hardcoded English
// screen reader announcements. Remove when upstream fix lands:
// https://github.com/arnog/mathlive/issues/2948

const MESSAGES = {
  deleted: {
    message: 'deleted: ',
    context:
      'Screen reader announcement prefix when a math element is deleted. The trailing space and colon are intentional formatting.',
  },
  selected: {
    message: 'selected: ',
    context:
      'Screen reader announcement prefix when math content is selected. The trailing space and colon are intentional formatting.',
  },
  startOf: {
    message: 'start of {relationName}: ',
    context:
      'Screen reader announcement when cursor enters the beginning of a math structure (e.g. "start of fraction: "). {relationName} is the name of the math structure.',
  },
  endOf: {
    message: '{spokenText}; end of {relationName}',
    context:
      'Screen reader announcement when cursor reaches the end of a math structure (e.g. "2; end of fraction"). {spokenText} is the current element, {relationName} is the structure name.',
  },
  outOf: {
    message: 'out of {relationName};',
    context:
      'Screen reader announcement when cursor exits a math structure (e.g. "out of fraction;"). {relationName} is the name of the math structure being exited.',
  },
  endOfMathfield: {
    message: '{spokenText}; end of mathfield',
    context:
      'Screen reader announcement when cursor reaches the end of the entire math input field. {spokenText} is the current element.',
  },
  accented: {
    message: 'accented',
    context: 'Screen reader name for an accented math element',
  },
  array: {
    message: 'array',
    context: 'Screen reader name for a math array/matrix',
  },
  box: {
    message: 'box',
    context: 'Screen reader name for a boxed math element',
  },
  chemicalFormula: {
    message: 'chemical formula',
    context: 'Screen reader name for a chemical formula element',
  },
  delimiter: {
    message: 'delimiter',
    context: 'Screen reader name for a math delimiter (parentheses, brackets, etc.)',
  },
  crossOut: {
    message: 'cross out',
    context: 'Screen reader name for a crossed-out/enclosed math element',
  },
  extensibleSymbol: {
    message: 'extensible symbol',
    context: 'Screen reader name for an extensible math symbol',
  },
  error: {
    message: 'error',
    context: 'Screen reader name for a math error element',
  },
  first: {
    message: 'first',
    context: 'Screen reader name for the first element in a math structure',
  },
  fraction: {
    message: 'fraction',
    context: 'Screen reader name for a fraction element',
  },
  group: {
    message: 'group',
    context: 'Screen reader name for a grouped math element',
  },
  latex: {
    message: 'LaTeX',
    context: 'Screen reader name for a raw LaTeX element',
  },
  line: {
    message: 'line',
    context: 'Screen reader name for a line element',
  },
  subscriptSuperscript: {
    message: 'subscript-superscript',
    context: 'Screen reader name for a combined subscript-superscript element',
  },
  operator: {
    message: 'operator',
    context: 'Screen reader name for a math operator',
  },
  overUnder: {
    message: 'over-under',
    context: 'Screen reader name for an over-under math element',
  },
  placeholder: {
    message: 'placeholder',
    context: 'Screen reader name for a placeholder element in a math template',
  },
  rule: {
    message: 'rule',
    context: 'Screen reader name for a rule/line element',
  },
  space: {
    message: 'space',
    context: 'Screen reader name for a space element',
  },
  spacing: {
    message: 'spacing',
    context: 'Screen reader name for a spacing element',
  },
  squareRoot: {
    message: 'square root',
    context: 'Screen reader name for a square root element',
  },
  text: {
    message: 'text',
    context: 'Screen reader name for a text element within math',
  },
  prompt: {
    message: 'prompt',
    context: 'Screen reader name for a prompt element',
  },
  mathField: {
    message: 'math field',
    context: 'Screen reader name for the math field root element',
  },
  mathfield: {
    message: 'math field',
    context: 'Screen reader name for the math field root element (one-word variant)',
  },
  parent: {
    message: 'parent',
    context: 'Screen reader name for a generic parent math element',
  },
  numerator: {
    message: 'numerator',
    context: 'Screen reader name for the numerator of a fraction',
  },
  denominator: {
    message: 'denominator',
    context: 'Screen reader name for the denominator of a fraction',
  },
  index: {
    message: 'index',
    context: 'Screen reader name for the index of a root/radical',
  },
  superscript: {
    message: 'superscript',
    context: 'Screen reader name for a superscript element',
  },
  subscript: {
    message: 'subscript',
    context: 'Screen reader name for a subscript element',
  },
  radicand: {
    message: 'radicand',
    context: 'Screen reader name for the body content inside a square root',
  },
  superscriptAndSubscript: {
    message: 'superscript and subscript',
    context: 'Screen reader name for a combined superscript-and-subscript element',
  },
};

export default createTranslator('MathLiveA11yStrings', MESSAGES);
