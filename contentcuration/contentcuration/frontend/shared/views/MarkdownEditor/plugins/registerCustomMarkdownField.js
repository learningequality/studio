import Vue from 'vue';
import vueCustomElement from 'vue-custom-element';

export default VueComponent => {
  const dashed = camel => camel.replace(/([a-zA-Z])(?=[A-Z])/g, '$1-').toLowerCase();
  const name = dashed(VueComponent.name);
  Vue.use(vueCustomElement);
  Vue.customElement(name, VueComponent, {
    // element is removed from document
    disconnectedCallback() {
      this.observer.disconnect();
    },
    // Vue instance is created
    vueInstanceCreatedCallback() {
      // by default, `contenteditable` will be false
      this.setAttribute('contenteditable', !!VueComponent.contentEditable);

      // pass innerHTML of host element as the `markdown` property
      this.observer = new MutationObserver(mutations => {
        mutations.forEach(() => {
          this.getVueInstance().$root.markdown = this.innerHTML;
        });
      });
      this.observer.observe(this, { subtree: true, characterData: true, childList: true });

      // initialize the `markdown` property
      this.getVueInstance().$root.markdown = this.innerHTML;
    },
    shadowCss: VueComponent.shadowCSS,
    shadow: true,
    extends: 'span',
  });
};
