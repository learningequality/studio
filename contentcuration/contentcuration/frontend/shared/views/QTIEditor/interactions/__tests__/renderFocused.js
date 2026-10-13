import { render } from '@testing-library/vue';

/**
 * Renders an interaction editor as its card does when the card opens: mounted, then asked to
 * focus its question. Events the editor emits are not collected.
 *
 * @param {object} Editor - The editor component
 * @param {object} options - As for `render`, with the editor's props in `props`
 */
export function renderFocused(Editor, options) {
  const Card = {
    inheritAttrs: false,
    mounted() {
      this.$refs.editor.focus();
    },
    render(h) {
      return h(Editor, { ref: 'editor', props: this.$attrs });
    },
  };
  return render(Card, options);
}
