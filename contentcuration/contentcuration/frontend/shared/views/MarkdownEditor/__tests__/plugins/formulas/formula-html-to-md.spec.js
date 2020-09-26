import formulaHtmlToMd from '../../../plugins/formulas/formula-html-to-md';

describe('MarkdownEditor - extensions - formulas', () => {
  describe('formulaHtmlToMd', () => {
    it('converts all elements with `is="markdown-formula-node"` to markdown', () => {
      const input =
        'Please solve following equation: <span is="markdown-formula-node">3x+5y+2</span>, <span is="markdown-formula-node">5x+8y+3</span>.';

      expect(formulaHtmlToMd(input)).toBe(
        'Please solve following equation: $$3x+5y+2$$, $$5x+8y+3$$.'
      );
    });

    it('converts a markdown-formula-node element', () => {
      const input = `
                <span is="markdown-formula-node">
                  {a}^{b}
                </span> Have fun!`;

      expect(formulaHtmlToMd(input)).toBe('$${a}^{b}$$ Have fun!');
    });

    it('converts a markdown-formula-node element with extra attributes', () => {
      const input = `
                <span is="markdown-formula-node" editing="true" contenteditable="false">
                  {a}^{b}
                </span> Have fun!`;

      expect(formulaHtmlToMd(input)).toBe('$${a}^{b}$$ Have fun!');
    });
  });
});
