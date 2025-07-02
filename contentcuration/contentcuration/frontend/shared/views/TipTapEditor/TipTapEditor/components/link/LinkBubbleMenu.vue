<template>

  <div class="link-bubble-menu">
    <a
      :href="href"
      target="_blank"
      rel="noopener noreferrer"
    >Go to link</a>
    <div class="divider"></div>
    <button
      title="Copy link"
      @click="copyToClipboard(href)"
    >
      <img
        src="../../../assets/icon-copy.svg"
        alt="Copy"
      >
    </button>
    <button
      title="Edit link"
      @click="onEdit"
    >
      <img
        src="../../../assets/icon-edit.svg"
        alt="Edit"
      >
    </button>
    <button
      title="Remove link"
      @click="onRemove"
    >
      <img
        src="../../../assets/icon-linkOff.svg"
        alt="Remove"
      >
    </button>
  </div>

</template>


<script>

  import { defineComponent, computed, inject } from 'vue';

  export default defineComponent({
    name: 'LinkBubbleMenu',
    setup(props) {
      const { openLinkEditor, removeLink } = inject('linkHandler');
      const href = computed(() => props.editor.getAttributes('link').href);

      const copyToClipboard = link => {
        navigator.clipboard.writeText(link).then(() => {});
      };

      return { href, onEdit: openLinkEditor, onRemove: removeLink, copyToClipboard };
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
