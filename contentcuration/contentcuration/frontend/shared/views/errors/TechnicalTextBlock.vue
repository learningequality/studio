<template>

  <div>
    <!-- visible text area, hidden to screenreaders -->
    <textarea
      v-model="formattedText"
      readonly
      class="error-log"
      wrap="soft"
      aria-hidden="true"
      :style="[
        dynamicHeightStyle,
        {
          backgroundColor: $themePalette.grey.v_100,
          border: $themePalette.grey.v_200,
        },
      ]"
    >
    </textarea>
    <!-- invisible text block for copying, visible to screenreaders -->
    <pre
      ref="textBox"
      class="hidden-screen-only"
    >{{ text }}</pre>
    <div>
      <KButton
        v-if="clipboardAvailable"
        ref="copyButton"
        :style="{ marginTop: '8px', marginBottom: '8px' }"
        :primary="false"
        :text="$tr('copyToClipboardButtonPrompt')"
        @click="copyError"
      />
    </div>
  </div>

</template>


<script>

  export default {
    name: 'TechnicalTextBlock',
    props: {
      text: {
        type: String,
        default: '',
      },
      maxHeight: {
        type: Number,
        required: false,
        default: 72,
      },
      minHeight: {
        type: Number,
        default: 72,
      },
    },
    computed: {
      formattedText() {
        return this.text;
      },
      dynamicHeightStyle() {
        return {
          height: `${16 + this.formattedText.split('\n').length * 18}px`,
          maxHeight: `${this.maxHeight}px`,
          minHeight: `${this.minHeight}px`,
        };
      },
      clipboardAvailable() {
        return Boolean(navigator.clipboard);
      },
    },
    methods: {
      copyError() {
        if (this.clipboardAvailable) {
          navigator.clipboard
            .writeText(this.formattedText)
            .then(() => {
              this.$store.dispatch('showSnackbar', {
                text: this.$tr('copiedToClipboardConfirmation'),
              });
            })
            .catch(() => {
              this.$store.dispatch('showSnackbar', { text: this.$tr('copiedToClipboardFailure') });
            });
        }
      },
    },
    $trs: {
      copyToClipboardButtonPrompt: 'Copy to clipboard',
      copiedToClipboardConfirmation: 'Copied to clipboard',
      copiedToClipboardFailure: 'Copy to clipboard failed',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .error-log {
    width: 100%;
    padding: 8px;
    font-family: monospace;
    line-height: 18px;
    white-space: pre;
    resize: none;
    border-radius: $radius;
  }

</style>
