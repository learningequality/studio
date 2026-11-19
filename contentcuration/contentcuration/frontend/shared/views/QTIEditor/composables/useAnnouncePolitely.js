import { onBeforeUnmount } from 'vue';
import useKLiveRegion from 'kolibri-design-system/lib/composables/useKLiveRegion';

// KDS writes each message over the live region's text, so a message sent in the
// same frame as another would replace it before it is read.
let queued = [];
let frame = null;

function announceQueued() {
  const texts = [...new Set(queued.map(({ text }) => text))];
  queued = [];
  frame = null;
  useKLiveRegion().sendPoliteMessage(texts.join(' '));
}

export function useAnnouncePolitely() {
  const owner = {};

  onBeforeUnmount(() => {
    queued = queued.filter(message => message.owner !== owner);
    if (!queued.length && frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
    }
  });

  return function announcePolitely(text) {
    queued.push({ text, owner });
    if (frame === null) frame = requestAnimationFrame(announceQueued);
  };
}
