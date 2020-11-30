<template>

  <VDialog v-model="dialog" v-resize="handleWindowResize" v-bind="$attrs">
    <template #activator="{ on }">
      <slot :on="on" name="activator"></slot>
    </template>
    <VCard>
      <VCardTitle class="font-weight-bold pa-4 title" :class="{ overflow }">
        {{ header }}
      </VCardTitle>
      <VCardText ref="content" class="content px-4" :class="overflow ? 'py-3' : 'py-0'">
        <slot></slot>
      </VCardText>
      <VCardActions class="px-4 py-3" :class="{ overflow }">
        <VLayout align-center justify-space-between row>
          <div>
            <slot name="action"></slot>
          </div>
          <VBtn color="greyBackground" autofocus @click="onClose">
            {{ closeButtonLabel || $tr('closeButtonLabel') }}
          </VBtn>
        </VLayout>
      </VCardActions>
    </VCard>
  </VDialog>

</template>

<script>

  export default {
    name: 'ResponsiveDialog',
    props: {
      value: {
        type: Boolean,
        default: false,
      },
      header: {
        type: String,
        required: true,
      },
      closeButtonLabel: {
        type: String,
        required: false,
      },
      close: {
        type: Function,
        required: false,
      },
    },
    data() {
      return {
        overflow: false,
      };
    },
    computed: {
      dialog: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
    },
    watch: {
      value(open) {
        if (open) {
          this.$nextTick(this.handleWindowResize);
        }
      },
    },
    methods: {
      handleWindowResize() {
        if (this.dialog) {
          const contentElement = this.$refs.content;
          this.overflow = contentElement.clientHeight < contentElement.scrollHeight;
        }
      },
      onClose() {
        if (this.close) {
          this.close();
        } else {
          this.dialog = false;
        }
      },
    },
    $trs: {
      closeButtonLabel: 'Close',
    },
  };

</script>

<style lang="less" scoped>

  /deep/ p {
    font-size: 12pt;
    color: var(--v-grey-darken3);
  }

  .content {
    max-height: calc(90vh - 190px);
    overflow-y: auto;
  }

  // Show borders if there's overflow
  .v-card__title.overflow {
    border-bottom: 1px solid var(--v-greyBorder-lighten1);
  }
  .v-card__actions.overflow {
    border-top: 1px solid var(--v-greyBorder-lighten1);
  }

</style>
