import { Node, mergeAttributes } from '@tiptap/core';

export const Small = Node.create({
  name: 'small',

  priority: 1000,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  group: 'block',

  content: 'inline*',

  parseHTML() {
    return [
      {
        tag: 'small',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'small',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'small-text',
      }),
      0,
    ];
  },

  addAttributes() {
    return {
      class: {
        default: 'small-text',
      },
      textAlign: {
        default: 'left',
        parseHTML: element => element.style.textAlign || 'left',
        renderHTML: attributes => {
          if (!attributes.textAlign || attributes.textAlign === 'left') return {};
          return { style: `text-align: ${attributes.textAlign}` };
        },
      },
    };
  },

  addCommands() {
    return {
      setSmall:
        () =>
        ({ commands }) => {
          return commands.setNode(this.name);
        },
      toggleSmall:
        () =>
        ({ commands }) => {
          return commands.toggleNode(this.name, 'paragraph');
        },
      unsetSmall:
        () =>
        ({ commands }) => {
          return commands.setNode('paragraph'); // Convert back to paragraph
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-S': () => this.editor.commands.toggleSmall(),
    };
  },
});
