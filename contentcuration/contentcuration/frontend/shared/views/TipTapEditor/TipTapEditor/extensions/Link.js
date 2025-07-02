/*  We specifically want to control the click behavior to show our custom bubble menu instead of
immediately navigating to the link's URL */

import Link from '@tiptap/extension-link';

export const CustomLink = Link.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      openOnClick: false,
    };
  },
});
