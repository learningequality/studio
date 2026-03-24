<template>

  <div :style="{ display: 'inline-block' }">
    <HelpButton
      :ariaLabel="$tr('open')"
      class="help-button"
      data-test="info-icon"
      @click="displayDialog = !displayDialog"
    />
    <KModal
      v-if="displayDialog"
      data-test="info-dialog"
      :title="header"
      :cancelText="$tr('close')"
      @cancel="displayDialog = false"
    >
      <slot></slot>
      <div
        v-for="(item, index) in items"
        :key="`info-${index}`"
        class="mb-4 mt-3"
      >
        <h2 class="font-weight-bold mb-1 subheading">
          <slot
            name="header"
            :item="item"
          ></slot>
        </h2>
        <p class="body-1 grey--text">
          <slot
            name="description"
            :item="item"
          ></slot>
        </p>
      </div>
    </KModal>
  </div>

</template>


<script>

  import HelpButton from './HelpButton';

  export default {
    name: 'InfoModal',
    components: {
      HelpButton,
    },
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
        displayDialog: false,
      };
    },
    $trs: {
      open: 'Open help dialog',
      close: 'Close',
    },
  };

</script>


<style lang="scss" scoped>

  .help-button {
    vertical-align: middle;
  }

</style>
