import { Node, mergeAttributes } from '@tiptap/core';

export const Small = Node.create({
  name: 'small', // Consistent name for the node

  priority: 1000, // Higher priority to override other block nodes when toggling

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  group: 'block', // Block-level node, like headings

  content: 'inline*', // Can contain text and inline marks (bold, italic, etc.)

  parseHTML() {
    return [
      {
        tag: 'small', // Parse <small> tags for this node
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'small', // Render as <small> for simplicity
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'small-text', // Class for styling
      }),
      0,
    ];
  },

  addAttributes() {
    return {
      class: {
        default: 'small-text', // Default class for styling
      },
    };
  },

  addCommands() {
    return {
      setSmall: () => ({ commands }) => {
        return commands.setNode(this.name); // Set current block to 'small'
      },
      toggleSmall: () => ({ commands }) => {
        return commands.toggleNode(this.name, 'paragraph'); // Toggle between 'small' and 'paragraph'
      },
      unsetSmall: () => ({ commands }) => {
        return commands.setNode('paragraph'); // Convert back to paragraph
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-S': () => this.editor.commands.toggleSmall(), // Consistent with command name
    };
  },

  // Optional: Input rules (commented out to avoid errors; enable if needed)
  /*
  addInputRules() {
    return [
      textblockTypeInputRule({
        find: /^\s*small\s+/,
        type: this.type,
      }),
    ];
  },
  */
});