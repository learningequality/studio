import formulaHtmlToMd from '../../../plugins/formulas/formula-html-to-md';

describe('MarkdownEditor - extensions - formulas', () => {
  describe('formulaHtmlToMd', () => {
    it('converts all elements containing `data-formula` attribute to markdown', () => {
      const input =
        'Please solve following equation: <span data-formula="3x+5y=2"></span>, <span data-formula="5x+8y=3"><span></span></span>.';

      expect(formulaHtmlToMd(input)).toBe(
        'Please solve following equation: $$3x+5y=2$$, $$5x+8y=3$$.'
      );
    });

    it('converts MathQuill static math field', () => {
      const input = `
                <span class="math-field mq-math-mode" data-formula="{a}^{b}">
                    <span class="mq-selectable">$a^b$</span>
                    <span class="mq-root-block mq-hasCursor" mathquill-block-id="645">
                        <var mathquill-command-id="646">a</var>
                        <span class="mq-supsub mq-non-leaf mq-sup-only" mathquill-command-id="648">
                            <span class="mq-sup" mathquill-block-id="650">
                                <var mathquill-command-id="649">b</var>
                            </span>
                        </span>
                        <span class="mq-cursor"></span>
                    </span>
                </span> Have fun!`;

      expect(formulaHtmlToMd(input)).toBe('$${a}^{b}$$ Have fun!');
    });

    it('converts MathQuill editable math field', () => {
      const input = `
                <span class="math-field mq-editable-field mq-math-mode" data-formula="{a}^{b}">
                    <span class="mq-textarea">
                        <textarea autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false" x-palm-disable-ste-all="true">
                        </textarea>
                    </span>
                    <span class="mq-root-block" mathquill-block-id="652">
                        <var mathquill-command-id="653">a</var>
                        <span class="mq-supsub mq-non-leaf mq-sup-only" mathquill-command-id="655">
                            <span class="mq-sup" mathquill-block-id="657">
                                <var mathquill-command-id="656">b</var>
                            </span>
                        </span>
                    </span>
                </span> Have fun!`;

      expect(formulaHtmlToMd(input)).toBe('$${a}^{b}$$ Have fun!');
    });
  });
});
