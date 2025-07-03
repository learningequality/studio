<template>

  <div class="link-bubble-menu">
    <a
      :href="href"
      target="_blank"
      rel="noopener noreferrer"
    >{{ goToLink$() }}</a>
    <div class="divider"></div>
    <button
      :title="copyLink$()"
      @click="copyToClipboard(href)"
    >
      <img
        src="../../../assets/icon-copy.svg"
        :alt="copy$()"
      >
    </button>
    <button
      :title="editLink$()"
      @click="onEdit"
    >
      <img
        src="../../../assets/icon-edit.svg"
        :alt="edit$()"
      >
    </button>
    <button
      :title="removeLink$()"
      @click="onRemove"
    >
      <img
        src="../../../assets/icon-linkOff.svg"
        :alt="remove$()"
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
      const { goToLink$, copyLink$, copy$, editLink$, edit$, removeLink$, remove$ } =
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
        copy$,
        editLink$,
        edit$,
        removeLink$,
        remove$,
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

  button {
    display: flex;
    align-items: center;
    padding: 4px;
    cursor: pointer;
    background: none;
    border: 0;
  }

  button img {
    width: 16px;
    height: 16px;
  }

</style>
