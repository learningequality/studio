const listeners = new Map();
export default {
  inserted: (el, binding, vnode) => {
    listeners.set(vnode, event => {
      binding.value(event);
    });
    document.body.addEventListener('mousemove', listeners.get(vnode), true);
  },
  unbind: (el, binding, vnode) => {
    document.body.removeEventListener('mousemove', listeners.get(vnode), true);
    listeners.delete(vnode);
  },
};
