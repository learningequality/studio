import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { VueNodeViewRenderer } from '@tiptap/vue-2';
import LazyMathNodeView from '../components/math/LazyMathNodeView.vue';

export const selectedMathNodeClass = 'math-node-wrapper--selected';

export function getSelectedMathNodeDecorations(doc, selection) {
  const decorations = [];

  if (selection.empty) {
    return decorations;
  }

  doc.nodesBetween(selection.from, selection.to, (node, pos) => {
    if (node.type.name !== 'math') {
      return;
    }

    const nodeTo = pos + node.nodeSize;

    if (selection.from <= pos && selection.to >= nodeTo) {
      decorations.push(
        Decoration.node(pos, nodeTo, {
          class: selectedMathNodeClass,
        }),
      );
    }
  });

  return decorations;
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
    return [{ tag: 'span[data-latex]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addNodeView() {
    return VueNodeViewRenderer(LazyMathNodeView);
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations(state) {
            return DecorationSet.create(
              state.doc,
              getSelectedMathNodeDecorations(state.doc, state.selection),
            );
          },
        },
      }),
    ];
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
