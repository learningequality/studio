<template>

  <div>
    <div
      v-if="show('loader', loading, 500)"
      class="loader"
    >
      <KCircularLoader />
    </div>
    <KTextbox
      v-else
      :value="displayToken"
      readonly
      class="notranslate"
      :floatingLabel="false"
      :appearanceOverrides="{ maxWidth: 'none' }"
    >
      <template #label>
        <span :class="{ visuallyhidden: !showLabel }">{{ $tr('token') }}</span>
      </template>
      <template #innerAfter>
        <KIconButton
          v-if="showCopyButton"
          icon="copy"
          :tooltip="$tr('tooltipText')"
          class="copy-button"
          :disabled="!token.trim()"
          @click="handleCopyToClipboard"
        />
        <!-- Placeholder so that input height is same as when with the button -->
        <div
          v-else
          :style="{ height: '47px' }"
        ></div>
      </template>
    </KTextbox>
  </div>

</template>


<script>

  import useKShow from 'kolibri-design-system/lib/composables/useKShow';
  import useToken from '../../composables/useToken';

  export default {
    name: 'StudioCopyToken',
    setup() {
      const { show } = useKShow();
      const { hyphenateToken, copyTokenToClipboard } = useToken();

      return { show, hyphenateToken, copyTokenToClipboard };
    },
    props: {
      token: {
        type: String,
        required: true,
      },
      hyphenate: {
        type: Boolean,
        default: true,
      },
      loading: {
        type: Boolean,
        default: false,
      },
      // if false, label will be visually hidden
      showLabel: {
        type: Boolean,
        default: true,
      },
      showCopyButton: {
        type: Boolean,
        default: true,
      },
    },
    computed: {
      displayToken() {
        if (this.hyphenate) {
          return this.hyphenateToken(this.token);
        } else {
          return this.token;
        }
      },
    },
    methods: {
      handleCopyToClipboard() {
        const successMessage = this.$tr('copiedTokenId');
        const errorMessage = this.$tr('copyFailed');

        this.copyTokenToClipboard(this.token, {
          hyphenate: this.hyphenate,
          successMessage,
          errorMessage,
          onSuccess: () => {
            this.$emit('copied');
          },
        }).catch(() => {
          // Ignore errors, as snackbar is already shown
        });
      },
    },
    $trs: {
      copiedTokenId: 'Token copied',
      copyFailed: 'Copy failed',
      token: 'Token',
      tooltipText: 'Copy token to import channel into Kolibri',
    },
  };

</script>


<style scoped>

  .loader {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 70px;
  }

  .copy-button {
    margin: 0 0.5rem 0.5rem 0;
    opacity: 0.8;
  }

  .copy-button:hover {
    opacity: 1;
  }

  /* https://github.com/learningequality/kolibri-design-system/issues/1187#issuecomment-3671275681 */
  ::v-deep .mh {
    min-height: unset !important;
  }

  ::v-deep .ui-textbox {
    margin-bottom: 0 !important;
  }

  ::v-deep .ui-textbox-feedback,
  ::v-deep .ui-textbox-feedback-text {
    height: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
  }

</style>
