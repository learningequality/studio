export default {
  inserted: (el, binding) => {
    window.event = event => {
      if (el !== event.target && !el.contains(event.target)) {
        binding.value(event);
      }
    };

    document.body.addEventListener('mousemove', window.event, true);
  },
  unbind: () => {
    document.body.removeEventListener('mousemove', window.event, true);
  },
};
