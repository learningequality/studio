<template>

  <div>
    <h1 class="font-weight-bold title">
      {{ $tr('supportTokenHeading') }}
    </h1>
    <p class="mt-2">
      {{ $tr('supportTokenDescription') }}
    </p>
    
    <div v-if="loading" class="my-4">
      <VProgressLinear indeterminate color="primary" />
    </div>
    
    <div v-else-if="supportToken" class="my-4">
      <VTextField
        v-model="supportToken"
        readonly
        box
        color="primary"
        :append-icon="clipboardAvailable ? 'content_copy' : null"
        :title="clipboardAvailable ? $tr('copyPrompt') : ''"
        class="notranslate token-field"
        single-line
        hide-details
        @click:append="copyToken"
      />
      <p v-if="copied" class="mt-2 success--text">
        {{ $tr('tokenCopied') }}
      </p>
    </div>
    
    <div v-else class="my-4 sm:w-[450px] w-full">
      <KButton
        class="support-token-button"
        :disabled="generating"
        @click="generateSupportToken"
      >
        <VProgressCircular
          v-if="generating"
          indeterminate
          size="20"
          width="3"
          color="primary"
        />
        {{ generating ? $tr('generating') : $tr('generateTokenButton') }}
      </KButton>
    </div>
  </div>

</template>
  
  <script>

  export default {
    name: 'ChannelSupportToken',
    data() {
      return {
        supportToken: null,
        loading: false,
        generating: false,
        copied: false,
      };
    },
    computed: {
      clipboardAvailable() {
        return Boolean(navigator.clipboard);
      },
    },
    methods: {
      copyToken() {
        if (this.clipboardAvailable) {
          navigator.clipboard
            .writeText(this.supportToken)
            .then(() => {
              this.copied = true;
              setTimeout(() => {
                this.copied = false;
              }, 3000);
              this.$emit('copied');
            })
            .catch(() => {
              this.$store.dispatch('showSnackbar', {
                text: this.$tr('copyFailed'),
                color: 'error',
              });
            });
        }
      },
      generateSupportToken() {
        this.generating = true;
        setTimeout(() => {
          this.supportToken = 'NEW123TOKEN'; // Hardcoded new test token
          this.generating = false;
        }, 2000);
      },
    },
    $trs: {
      supportTokenHeading: 'Channel Support Token',
      supportTokenDescription:
        'This token can be used by support staff to access your channel for troubleshooting purposes.',
      generateTokenButton: 'Generate Support Token',
      generating: 'Generating...',
      tokenCopied: 'Support token copied to clipboard',
      copyPrompt: 'Copy token for support access',
      copyFailed: 'Failed to copy token',
    },
  };

</script>
  
  <style lang="scss" scoped>

  .token-field {
    width: 600px;
    max-width: 75%;
  }

  .support-token-button {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: center;
    width: 48%;
    max-width: 200px;
    color: #374151;
    background-color: #f3f4f6;
    border: 1px solid #e5e7eb;
    transition: background-color 0.2s ease-in-out;

    &:hover {
      background-color: #e5e7eb;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  }

</style>
  