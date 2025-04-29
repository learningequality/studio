import formulaHtmlToMd from '../../../plugins/formulas/formula-html-to-md';

describe('MarkdownEditor - extensions - formulas', () => {
  describe('formulaHtmlToMd', () => {
    it('converts all elements with `is="markdown-formula-field"` to markdown', () => {
      const input =
        'Please solve following equation: <span is="markdown-formula-field">3x+5y+2</span>, <span is="markdown-formula-field">5x+8y+3</span>.';

      expect(formulaHtmlToMd(input)).toBe(
        'Please solve following equation: $$3x+5y+2$$, $$5x+8y+3$$.',
      );
    });

    it('converts a markdown-formula element with extra attributes', () => {
      const input = `
                <span is="markdown-formula-field" editing="true" contenteditable="false">
                  {a}^{b}
                </span> Have fun!`;

      expect(formulaHtmlToMd(input)).toBe('$${a}^{b}$$ Have fun!');
    });
  });
});
