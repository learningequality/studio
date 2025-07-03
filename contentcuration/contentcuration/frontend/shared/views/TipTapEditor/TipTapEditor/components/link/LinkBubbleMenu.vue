<template>

  <div
    class="link-bubble-menu"
    role="toolbar"
    :aria-label="linkActions$()"
  >
    <a
      :href="href"
      target="_blank"
      rel="noopener noreferrer"
      class="link-url"
      :aria-label="`${goToLink$()} ${opensInNewTab$()}`"
    >
      {{ goToLink$() }}
      <span class="sr-only">{{ opensInNewTab$() }}</span>
    </a>

    <div
      class="divider"
      aria-hidden="true"
    ></div>

    <button
      class="bubble-menu-button"
      :title="copyLink$()"
      :aria-label="copyLink$()"
      @click="copyToClipboard(href)"
    >
      <img
        src="../../../assets/icon-copy.svg"
        alt=""
        aria-hidden="true"
      >
    </button>

    <button
      class="bubble-menu-button"
      :title="editLink$()"
      :aria-label="editLink$()"
      @click="onEdit"
    >
      <img
        src="../../../assets/icon-edit.svg"
        alt=""
        aria-hidden="true"
      >
    </button>

    <button
      class="bubble-menu-button"
      :title="removeLink$()"
      :aria-label="removeLink$()"
      @click="onRemove"
    >
      <img
        src="../../../assets/icon-linkOff.svg"
        alt=""
        aria-hidden="true"
      >
    </button>
  </div>

</template>


<script>

  import { defineComponent, computed, inject } from 'vue';
  import { getTipTapEditorStrings } from '../../TipTapEditorStrings';

  export default defineComponent({
    name: 'LinkBubbleMenu',
    setup(props) {
      const { goToLink$, copyLink$, editLink$, removeLink$, linkActions$, opensInNewTab$ } =
        getTipTapEditorStrings();

      const { openLinkEditor, removeLink } = inject('linkHandler');
      const href = computed(() => props.editor.getAttributes('link').href);

      const copyToClipboard = link => {
        navigator.clipboard.writeText(link).then(() => {});
      };

      return {
        href,
        onEdit: openLinkEditor,
        onRemove: removeLink,
        copyToClipboard,
        goToLink$,
        copyLink$,
        editLink$,
        removeLink$,
        linkActions$,
        opensInNewTab$,
      };
    },
    props: {
      editor: { type: Object, required: true },
    },
  });

</script>


<style scoped>

  .link-bubble-menu {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 8px 16px;
    background: white;
    border-radius: 44px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .link-url {
    font-size: 0.875rem;
    color: #007bff;
    text-decoration: none;
  }

  .divider {
    width: 1px;
    height: 16px;
    background: #e0e0e0;
  }

  .bubble-menu-button {
    display: flex;
    align-items: center;
    padding: 4px;
    cursor: pointer;
    background: none;
    border: 0;
    border-radius: 4px;
    transition: background-color 0.2s ease;
  }

  .bubble-menu-button:hover {
    background: #e6e6e6;
  }

  .bubble-menu-button:active {
    background: #d9e1fd;
  }

  .bubble-menu-button:focus-visible {
    background: #e6e6e6;
    outline: 2px solid #0097f2;
    outline-offset: 2px;
  }

  .bubble-menu-button img {
    width: 16px;
    height: 16px;
  }

  /* Screen reader only text */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

</style>
