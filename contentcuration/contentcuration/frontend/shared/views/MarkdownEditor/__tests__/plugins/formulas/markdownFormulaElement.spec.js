/**
 * @jest-environment jest-environment-jsdom-sixteen
 */

import { registerMarkdownFormulaElement } from 'shared/views/MarkdownEditor/plugins/formulas/MarkdownFormula';

// we need to mock the component's style import for the element to successfully register in jsdom
jest.mock('./style.css', () => '');
let formulaEl;
describe('MarkdownEditor - extensions - formula', () => {
  describe('MarkdownFormula custom element', () => {
    beforeAll(() => {
      document.body.innerHTML = `
        <span is="markdown-formula">x^y</span>
      `;
      formulaEl = document.querySelector('span[is="markdown-formula"]');
      registerMarkdownFormulaElement();
    });

    test('getting formula latex from the custom element', done => {
      window.customElements.whenDefined('markdown-formula').then(() => {
        expect(formulaEl.getVueInstance().latex).toBe('x^y');
        done();
      });
    });

    it('renders some MathQuill markup in a shadowRoot', done => {
      window.customElements.whenDefined('markdown-formula').then(() => {
        let shadowRoot = formulaEl.shadowRoot;
        expect(shadowRoot).toBeTruthy();
        let varEls = shadowRoot.querySelectorAll('var');
        expect(varEls[0].innerHTML).toBe('x');
        expect(varEls[1].innerHTML).toBe('y');
        done();
      });
    });
  });
});
