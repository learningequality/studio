const listeners = new Map();
export default {
  inserted: (el, binding, vnode) => {
    listeners.set(vnode, event => {
      if (el !== event.target && !el.contains(event.target)) {
        binding.value(event);
      }
    });

    document.body.addEventListener('click', listeners.get(vnode), true);
  },
  unbind: (el, binding, vnode) => {
    document.body.removeEventListener('click', listeners.get(vnode), true);
    listeners.delete(vnode);
  },
};
