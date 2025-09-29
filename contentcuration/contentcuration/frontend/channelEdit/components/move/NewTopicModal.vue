<template>

  <KModal
    :title="$tr('createTopic')"
    :cancelText="$tr('cancel')"
    :submitText="$tr('create')"
    data-test="newtopicmodal"
    @cancel="cancel"
    @submit="create"
  >
    <KTextbox
      ref="title"
      v-model="title"
      :label="$tr('topicTitle')"
      :maxlength="200"
      :invalid="showErrorText"
      :invalidText="titleError"
      :showInvalidText="showErrorText"
    />
  </KModal>

</template>


<script>

  export default {
    name: 'NewTopicModal',
    data() {
      return {
        title: '',
        titleError: null,
        showErrorText: false,
      };
    },
    methods: {
      create() {
        if (!this.title) {
          this.titleError = this.$tr('topicTitleRequired');
          this.showErrorText = true;
          this.$refs.title.focus();
        } else {
          this.$emit('createTopic', this.title);
        }
      },
      cancel() {
        this.$emit('cancelCreateTopic');
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


<style lang="scss" scoped></style>
