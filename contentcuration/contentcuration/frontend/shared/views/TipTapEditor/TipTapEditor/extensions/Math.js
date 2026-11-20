import { Node, mergeAttributes } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-2';
import LazyMathNodeView from '../components/math/LazyMathNodeView.vue';

/**
 * @param {Element} math - A MathML `<math>` element
 * @returns {string|undefined} The LaTeX it was rendered from, as published formulas annotate it
 */
export function mathmlLatex(math) {
  return math.querySelector('annotation[encoding="application/x-tex"]')?.textContent;
}

export const Math = Node.create({
  name: 'math',
  group: 'inline',
  inline: true,

  addAttributes() {
    return {
      latex: {
        default: null,
        parseHTML: element => element.getAttribute('data-latex'),
        renderHTML: attributes => {
          if (!attributes.latex) {
            return {};
          }
          return { 'data-latex': attributes.latex };
        },
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'span[data-latex]' },
      {
        tag: 'math',
        getAttrs: element => {
          const latex = mathmlLatex(element);
          return latex ? { latex } : false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addNodeView() {
    return VueNodeViewRenderer(LazyMathNodeView);
  },

  addCommands() {
    return {
      setMath:
        attributes =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          });
        },
    };
  },
});
