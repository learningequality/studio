import formulaMdToHtml from '../../../plugins/formulas/formula-md-to-html';

describe('formulaMdToHtml', () => {
  it('converts formulas markdown to html', () => {
    const input = 'Please solve following equation: $$3x+5y+2$$, $$5x+8y+3$$.';

    expect(formulaMdToHtml(input)).toBe(
      'Please solve following equation: <span is="markdown-formula-field">3x+5y+2</span>, <span is="markdown-formula-field">5x+8y+3</span>.',
    );
  });
});
