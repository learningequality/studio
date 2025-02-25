import Vue from 'vue';
import vueCustomElement from 'vue-custom-element';
import { v4 as uuidv4 } from 'uuid';

const leftwardSpaceRegex = /\s$/;

const leftwardDoubleSpaceRegex = /\s\s$/;

const hasLeftwardSpace = el => {
  return (
    // Has a previous sibling
    el.previousSibling &&
    // Which has text content
    el.previousSibling.textContent &&
    // The text content has white space right before this element
    leftwardSpaceRegex.test(el.previousSibling.textContent) &&
    // And either this sibling doesn't have a previous sibling
    (!el.previousSibling.previousSibling ||
      // Or it doesn't have a hasAttribute function
      typeof el.previousSibling.previousSibling.hasAttribute !== 'function' ||
      // Or the previous sibling is not another custom field
      !el.previousSibling.previousSibling.hasAttribute('is') ||
      // Or the previous sibling has two white spaces, one for each
      // of the custom fields on either side.
      leftwardDoubleSpaceRegex.test(el.previousSibling.textContent))
  );
};

const rightwardSpaceRegex = /^\s/;

const rightwardDoubleSpaceRegex = /^\s\s/;

const hasRightwardSpace = el => {
  return (
    // Has a next sibling
    el.nextSibling &&
    // Which has text content
    el.nextSibling.textContent &&
    // The text content has white space right after this element
    rightwardSpaceRegex.test(el.nextSibling.textContent) &&
    // And either this sibling doesn't have a next sibling
    (!el.nextSibling.nextSibling ||
      // Or it doesn't have a hasAttribute function
      typeof el.nextSibling.nextSibling.hasAttribute !== 'function' ||
      // Or the next sibling is not another custom field
      !el.nextSibling.nextSibling.hasAttribute('is') ||
      // Or the next sibling has two white spaces, one for each
      // of the custom fields on either side.
      rightwardDoubleSpaceRegex.test(el.nextSibling.textContent))
  );
};

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
      const id = `markdown-field-${uuidv4()}`;
      // a hack to prevent squire from merging custom element spans
      // see here: https://github.com/nhn/tui.editor/blob/master/libs/squire/source/Node.js#L92-L101
      this.classList.add(id);

      // pass innerHTML of host element as the `markdown` property
      this.observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          const checkIfElementNode = x => x.nodeType === document.ELEMENT_NODE;
          const checkIfTextNode = x => x.nodeType === document.TEXT_NODE;
          const elementNodesAdded = [...mutation.addedNodes].filter(checkIfElementNode);
          const textNodesRemoved = [...mutation.removedNodes].filter(checkIfTextNode);

          // Prevent TUI.editor from adding unwanted DOM elements to the custom element
          // This is necessary so that style modifiers don't wrap markdown in <b> or <i> tags.
          if (elementNodesAdded.length > 0) {
            // if we detect that unwanted DOM elements have been added, revert them immediately
            this.innerHTML = textNodesRemoved.map(n => n.nodeValue).join();
          } else {
            // otherwise, pass the innerHTML to inner Vue component as `markdown` prop
            this.markdown = this.innerHTML;
          }
        });
      });
      this.observer.observe(this, { characterData: true, childList: true });

      this.addEventListener('remove', () => {
        if (hasLeftwardSpace(this)) {
          this.previousSibling.textContent = this.previousSibling.textContent.replace(
            leftwardSpaceRegex,
            '',
          );
        }
        if (hasRightwardSpace(this)) {
          this.nextSibling.textContent = this.nextSibling.textContent.replace(
            rightwardSpaceRegex,
            '',
          );
        }
        if (this.parentNode) {
          this.parentNode.removeChild(this);
        }
      });

      if (!hasLeftwardSpace(this)) {
        this.insertAdjacentText('beforebegin', '\xa0');
      }
      if (!hasRightwardSpace(this)) {
        this.insertAdjacentText('afterend', '\xa0');
      }
      // initialize the `markdown` property
      this.markdown = this.innerHTML;
    },
    shadowCss: VueComponent.shadowCSS,
    shadow: true,
    extends: 'span',
  });
};
