import Vue from 'vue';
import vueCustomElement from 'vue-custom-element';
import uuid from 'uuid/v4';

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
      this.setAttribute('contenteditable', Boolean(VueComponent.contentEditable));

      // a hack to prevent squire from merging custom element spans
      // see here: https://github.com/nhn/tui.editor/blob/master/libs/squire/source/Node.js#L92-L101
      this.classList.add(`markdown-field-${uuid()}`);

      // pass innerHTML of host element as the `markdown` property
      this.observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          const checkIfElementNode = x => x.nodeType === document.ELEMENT_NODE;
          const checkIfTextNode = x => x.nodeType === document.TEXT_NODE;
          let elementNodesAdded = [...mutation.addedNodes].filter(checkIfElementNode);
          let textNodesRemoved = [...mutation.removedNodes].filter(checkIfTextNode);

          // Prevent TUI.editor from adding unwanted DOM elements to the custom element
          // This is necessary so that style modifiers don't wrap markdown in <b> or <i> tags.
          if (elementNodesAdded.length > 0) {
            // if we detect that unwanted DOM elements have been added, revert them immediately
            this.innerHTML = textNodesRemoved.map(n => n.nodeValue).join();
          } else {
            // otherwise, pass the innerHTML to inner Vue component as `markdown` prop
            this.getVueInstance().markdown = this.innerHTML;
          }
        });
      });
      this.observer.observe(this, { characterData: true, childList: true });

      // initialize the `markdown` property
      this.getVueInstance().$root.markdown = this.innerHTML;
    },
    shadowCss: VueComponent.shadowCSS,
    shadow: true,
    extends: 'span',
  });
};
