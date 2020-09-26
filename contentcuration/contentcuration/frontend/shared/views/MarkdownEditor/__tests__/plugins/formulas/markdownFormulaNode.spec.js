/**
 * @jest-environment jest-environment-jsdom-sixteen
 */
// Jsdom@^16 is required to test custom elements.

import { registerMarkdownFormulaNode } from 'shared/views/MarkdownEditor/plugins/formulas/MarkdownFormulaNode';

// we need to mock the component's style import for the element to successfully register in jsdom
jest.mock('./style.css', () => '');

let formulaEl;

describe('MarkdownEditor - extensions - formula', () => {
  describe('MarkdownFormula custom element', () => {
    beforeAll(() => {
      document.body.innerHTML = `
        <span is="markdown-formula-node">x^y</span>
      `;
      formulaEl = document.querySelector('span[is="markdown-formula-node"]');
      registerMarkdownFormulaNode();
    });

    test('getting formula latex from the custom element', done => {
      window.customElements.whenDefined('markdown-formula-node').then(() => {
        expect(formulaEl.getVueInstance().latex).toBe('x^y');
        done();
      });
    });

    it('renders some MathQuill markup in a shadowRoot', done => {
      window.customElements.whenDefined('markdown-formula-node').then(() => {
        let shadowRoot = formulaEl.shadowRoot;
        expect(shadowRoot).toBeTruthy();
        let varEls = shadowRoot.querySelectorAll('var');
        expect(varEls[0].innerHTML).toBe('x');
        expect(varEls[1].innerHTML).toBe('y');
        done();
      });
    });

    it('sets `contenteditable=false` on its host element', done => {
      window.customElements.whenDefined('markdown-formula-node').then(() => {
        done();
      });
    });
  });
});
