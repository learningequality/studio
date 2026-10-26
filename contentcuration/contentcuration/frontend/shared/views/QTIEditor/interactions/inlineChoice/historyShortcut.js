// The resolver does not read package `exports` subpaths.
// eslint-disable-next-line import/no-unresolved
import { keydownHandler } from '@tiptap/pm/keymap';

// The passage editor's own history shortcuts. `Mod` is Cmd on macOS and Ctrl elsewhere.
const HISTORY_KEYS = { 'Mod-z': 'undo', 'Shift-Mod-z': 'redo', 'Mod-y': 'redo' };

/**
 * Which step of the passage's history a key press asks for, matched as the passage editor's
 * keymap matches it, for controls that keep their keys from it: the chips and the options panel.
 *
 * @param {KeyboardEvent} event
 * @returns {'undo'|'redo'|null}
 */
export function historyShortcut(event) {
  let direction = null;
  const bindings = {};
  for (const [key, step] of Object.entries(HISTORY_KEYS)) {
    bindings[key] = () => {
      direction = step;
      return true;
    };
  }
  // The keymap hands its commands the view's state, which these do not use.
  keydownHandler(bindings)({}, event);
  return direction;
}
