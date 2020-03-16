<template>

  <MessageDialog v-model="dialog" :header="$tr('createTopic')">
    <VTextField v-model="title" :label="$tr('topicTitle')" outline />
    <template #buttons="{close}">
      <VBtn flat @click="close">
        {{ $tr("cancel") }}
      </VBtn>
      <VBtn
        color="primary"
        @click="$emit('createTopic', title)"
      >
        {{ $tr("create") }}
      </VBtn>
    </template>
  </MessageDialog>

</template>

<script>

  import MessageDialog from 'shared/views/MessageDialog';

  export default {
    name: 'NewTopicModal',
    components: {
      MessageDialog,
    },
    props: {
      value: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        title: '',
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
    $trs: {
      topicTitle: 'Topic title',
      createTopic: 'Create new topic',
      cancel: 'Cancel',
      create: 'Create',
    },
  };

</script>

<style lang="less" scoped>
</style>
