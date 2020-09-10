<template>

  <VDialog v-model="dialog" v-resize="handleWindowResize" width="550">
    <template #activator="{ on }">
      <Icon color="primary" v-on="on">
        help
      </Icon>
    </template>

    <VCard>
      <VCardTitle class="title font-weight-bold pa-4" :class="{overflow}">
        {{ header }}
      </VCardTitle>
      <VCardText ref="content" class="content px-4" :class="overflow? 'py-3' : 'py-0'">
        <slot></slot>
        <div v-for="(item, index) in items" :key="`info-${index}`" class="mb-4">
          <h1 class="subheading font-weight-bold mb-1">
            <slot name="header" :item="item"></slot>
          </h1>
          <p class="body-1 grey--text">
            <slot name="description" :item="item"></slot>
          </p>
        </div>
      </VCardText>
      <VCardActions class="px-4 py-3" :class="{overflow}">
        <VSpacer />
        <VBtn color="greyBackground" autofocus @click="dialog = false">
          <b>{{ $tr('closeButtonLabel') }}</b>
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

</template>

<script>

  export default {
    name: 'InfoModal',
    props: {
      header: {
        type: String,
        required: true,
      },
      items: {
        type: Array,
        default() {
          return [];
        },
      },
    },
    data() {
      return {
        dialog: false,
        overflow: false,
      };
    },
    watch: {
      dialog(open) {
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
