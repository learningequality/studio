<template>

  <div>
    <p
      v-if="warning"
      class="validation-message validation-message--warning"
    >
      <KIcon
        icon="warning"
        class="validation-message__icon"
        :color="$themePalette.orange.v_500"
      />
      <span ref="warningText"><slot></slot></span>
    </p>
    <p
      v-else
      class="validation-message"
      role="alert"
    >
      <slot></slot>
    </p>
  </div>

</template>


<script>

  import { onMounted, ref } from 'vue';
  import useKLiveRegion from 'kolibri-design-system/lib/composables/useKLiveRegion';

  export default {
    name: 'ValidationMessage',

    setup(props) {
      const { sendPoliteMessage } = useKLiveRegion();
      const warningText = ref(null);

      // A polite region inserted already filled is often skipped by screen readers,
      // so announce through KDS's persistent live region instead.
      function announceWarning() {
        if (props.warning) {
          sendPoliteMessage(warningText.value.textContent.trim());
        }
      }

      onMounted(announceWarning);

      return { warningText };
    },

    props: {
      /** Flags a likely mistake that doesn't make the question invalid */
      warning: {
        type: Boolean,
        default: false,
      },
    },
  };

</script>


<style scoped>

  .validation-message {
    margin: 2px 0 0;
    font-size: 14px;
    line-height: 1.4;
    color: var(--tokens-error);
  }

  .validation-message--warning {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    padding: 8px 12px;
    margin: 4px 0 8px;
    color: var(--palette-grey-v800);
    background-color: var(--palette-yellow-v100);
    border-radius: 4px;
  }

  .validation-message__icon {
    /* KIcon nudges itself down to sit on a text baseline; not needed in a flex row */
    top: 0;
    flex-shrink: 0;
    width: 20px;
    height: 20px;
  }

</style>
