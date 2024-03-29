/**
 * @jest-environment jest-environment-jsdom-sixteen
 */
// Jsdom@^16 is required to test custom elements.

import { registerMarkdownFormulaField } from 'shared/views/MarkdownEditor/plugins/formulas/MarkdownFormulaField';

// we need to mock the component's style import for the element to successfully register in jsdom
jest.mock('./style.css', () => '');

let formulaEl;

describe('MarkdownFormulaField custom element', () => {
  beforeAll(() => {
    document.body.innerHTML = `
        <span is="markdown-formula-field">x^y</span>
      `;
    formulaEl = document.querySelector('span[is="markdown-formula-field"]');
    registerMarkdownFormulaField();
  });

  test('getting formula latex from the custom element', async done => {
    await window.customElements.whenDefined('markdown-formula-field');
    expect(formulaEl.getVueInstance().latex).toBe('x^y');
    done();
  });

  it('renders some MathQuill markup in a shadowRoot', async done => {
    await window.customElements.whenDefined('markdown-formula-field');
    const shadowRoot = formulaEl.shadowRoot;
    expect(shadowRoot).toBeTruthy();
    const varEls = shadowRoot.querySelectorAll('var');
    expect(varEls[0].innerHTML).toBe('x');
    expect(varEls[1].innerHTML).toBe('y');
    done();
  });

  it('sets `contenteditable=false` on its host element', async done => {
    await window.customElements.whenDefined('markdown-formula-field');
    expect(formulaEl.getAttribute('contenteditable')).toBe('false');
    done();
  });
});
