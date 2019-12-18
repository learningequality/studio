export default {
  inserted: (el, binding) => {
    window.event = event => {
      if (el !== event.target && !el.contains(event.target)) {
        binding.value();
      }
    };

    document.body.addEventListener('click', window.event, true);
  },
  unbind: () => {
    document.body.removeEventListener('click', window.event, true);
  },
};
