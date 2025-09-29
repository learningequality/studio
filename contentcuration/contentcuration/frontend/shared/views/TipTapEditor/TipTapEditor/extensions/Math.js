import { Node, mergeAttributes } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-2';
import MathNodeView from '../components/math/MathNodeView.vue';

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
    return [{ tag: 'span[data-latex]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addNodeView() {
    return VueNodeViewRenderer(MathNodeView);
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
