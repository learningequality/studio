<template>

  <ResponsiveDialog
    v-model="dialog"
    width="550"
    :header="header"
  >
    <template #activator="{ on }">
      <Icon color="primary" v-on="on">
        help
      </Icon>
    </template>
    <slot></slot>
    <div v-for="(item, index) in items" :key="`info-${index}`" class="mb-4">
      <h1 class="font-weight-bold mb-1 subheading">
        <slot name="header" :item="item"></slot>
      </h1>
      <p class="body-1 grey--text">
        <slot name="description" :item="item"></slot>
      </p>
    </div>
  </ResponsiveDialog>

</template>

<script>

  import ResponsiveDialog from './ResponsiveDialog';

  export default {
    name: 'InfoModal',
    components: { ResponsiveDialog },
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
      };
    },
  };

</script>

<style lang="less" scoped>

  /deep/ p {
    font-size: 12pt;
    color: var(--v-grey-darken3);
  }

</style>
