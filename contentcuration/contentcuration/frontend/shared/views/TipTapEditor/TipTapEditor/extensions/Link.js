/*  We specifically want to control the click behavior to show our custom bubble menu instead of
immediately navigating to the link's URL */

import { Link } from '@tiptap/extension-link';

export const CustomLink = Link.extend({
  inclusive: false,

  addOptions() {
    return {
      ...this.parent?.(),
      openOnClick: false,
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-k': () => {
        this.editor.emit('open-link-editor');
        return true;
      },
    };
  },
});
