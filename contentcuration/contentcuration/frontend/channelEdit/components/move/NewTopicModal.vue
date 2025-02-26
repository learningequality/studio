<template>

  <MessageDialog v-model="dialog" :header="$tr('createTopic')">
    <VForm
      ref="form"
      lazy-validation
      @submit.prevent="create"
    >
      <VTextField
        v-model="title"
        maxlength="200"
        counter
        :label="$tr('topicTitle')"
        box
        :rules="titleRules"
        required
      />
    </VForm>
    <template #buttons="{ close }">
      <VBtn flat data-test="close" @click="close">
        {{ $tr("cancel") }}
      </VBtn>
      <VBtn
        color="primary"
        data-test="create"
        @click="create"
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
      titleRules() {
        return [v => !!v || this.$tr('topicTitleRequired')];
      },
    },
    methods: {
      create() {
        if (this.$refs.form.validate()) {
          this.$emit('createTopic', this.title);
        }
      },
    },
    $trs: {
      topicTitle: 'Folder title',
      topicTitleRequired: 'Folder title is required',
      createTopic: 'Create new folder',
      cancel: 'Cancel',
      create: 'Create',
    },
  };

</script>

<style lang="scss" scoped>
</style>
