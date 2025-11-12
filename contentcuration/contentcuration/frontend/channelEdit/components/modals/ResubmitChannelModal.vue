<template>

  <KModal
    v-if="value"
    :title="title"
    data-test="resubmit-modal"
    @cancel="handleDismiss"
  >
    <div class="resubmit-modal-content">
      <p class="resubmit-modal-description">{{ description }}</p>
      <p class="resubmit-modal-question">{{ question }}</p>
    </div>

    <template #actions>
      <div class="resubmit-modal-actions">
        <KButton
          class="resubmit-modal-dismiss-btn"
          :style="dismissButtonStyles"
          data-test="dismiss-button"
          @click="handleDismiss"
        >
          {{ dismissButtonText }}
        </KButton>
        <KButton
          class="resubmit-modal-resubmit-btn"
          primary
          data-test="resubmit-button"
          @click="handleResubmit"
        >
          {{ resubmitButtonText }}
        </KButton>
      </div>
    </template>
  </KModal>

</template>


<script>

  import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';

  export default {
    name: 'ResubmitChannelModal',
    props: {
      value: {
        type: Boolean,
        default: false,
      },
      channel: {
        type: Object,
        required: true,
        validator(value) {
          return value && typeof value.name === 'string' && typeof value.version === 'number';
        },
      },
    },
    computed: {
      title() {
        return communityChannelsStrings.resubmitModalTitle$();
      },
      description() {
        return communityChannelsStrings.resubmitModalBodyFirst$({
          channelName: this.channel.name,
          version: this.channel.version,
        });
      },
      question() {
        return communityChannelsStrings.resubmitModalBodySecond$();
      },
      dismissButtonText() {
        return communityChannelsStrings.dismissButton$();
      },
      resubmitButtonText() {
        return communityChannelsStrings.resubmitButton$();
      },
      dismissButtonStyles() {
        return {
          color: this.$themeTokens.primary,
          backgroundColor: this.$themePalette.grey.v_100,
          '--hover-bg-color': this.$themePalette.grey.v_200,
        };
      },
    },
    methods: {
      handleDismiss() {
        this.$emit('dismiss');
        this.$emit('input', false);
      },
      handleResubmit() {
        this.$emit('resubmit');
        this.$emit('input', false);
      },
    },
  };

</script>


<style lang="scss">

  [data-test='resubmit-modal'],
  [data-test='resubmit-modal'] > *,
  [data-test='resubmit-modal'] [role='dialog'],
  [data-test='resubmit-modal'] .KModal,
  [data-test='resubmit-modal'] .modal {
    width: 500px !important;
    max-width: 500px !important;
    max-height: 284px !important;
  }

  [data-test='resubmit-modal'] h1,
  [data-test='resubmit-modal'] h2,
  [data-test='resubmit-modal'] h3,
  [data-test='resubmit-modal'] h4,
  [data-test='resubmit-modal'] .modal-title,
  [data-test='resubmit-modal'] [class*='title'] {
    width: 452px;
    height: 52px;
    font-family: 'Noto Sans', sans-serif;
    font-size: 20px;
    font-weight: 600;
    line-height: 130%;
    letter-spacing: 0%;
    vertical-align: middle;
  }

  .resubmit-modal-content {
    padding: 8px 0;
    margin-top: 35px;
  }

  .resubmit-modal-description,
  .resubmit-modal-question {
    width: 100%;
    min-height: 40px;
    padding: 0;
    margin: 0;
    font-family: 'Noto Sans', sans-serif;
    font-size: 14px;
    font-weight: 400;
    line-height: 140%;
    letter-spacing: 0%;
    vertical-align: middle;
  }

  .resubmit-modal-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    width: 452px;
    min-height: 40px;
    padding-top: 16px;
  }

  .resubmit-modal-dismiss-btn:hover {
    background-color: var(--hover-bg-color) !important;
  }

  .resubmit-modal-resubmit-btn {
    height: 40px;
  }

</style>
