<template>

  <div
    @click.stop
    @dblclick.stop
  >
    <KModal
      :title="$tr('editTitleDescription')"
      :submitText="$tr('saveAction')"
      :cancelText="$tr('cancelAction')"
      data-test="edit-title-description-modal"
      @submit="handleSave"
      @cancel="close"
    >
      <KTextbox
        v-model="title"
        data-test="title-input"
        autofocus
        showInvalidText
        :maxlength="200"
        :label="$tr('titleLabel')"
        :invalid="!!titleError"
        :invalidText="titleError"
        @input="titleError = ''"
        @blur="validateTitle"
      />
      <KTextbox
        v-model="description"
        data-test="description-input"
        textArea
        :maxlength="400"
        :label="$tr('descriptionLabel')"
        style="margin-top: 0.5em"
      />
    </KModal>
  </div>

</template>


<script>

  import { mapActions } from 'vuex';
  import { getTitleValidators, getInvalidText } from 'shared/utils/validation';

  export default {
    name: 'EditTitleDescriptionModal',
    props: {
      node: {
        type: Object,
        required: true,
      },
    },
    data() {
      return {
        title: this.node.title || '',
        description: this.node.description || '',
        titleError: '',
      };
    },
    methods: {
      ...mapActions('contentNode', ['updateContentNode']),
      validateTitle() {
        this.titleError = getInvalidText(getTitleValidators(), this.title);
      },
      close() {
        this.$emit('close');
      },
      handleSave() {
        this.validateTitle();
        if (this.titleError) {
          return;
        }

        const { node, title, description } = this;
        this.updateContentNode({
          id: node.id,
          title: title.trim(),
          description: description.trim(),
        });

        this.$store.dispatch('showSnackbarSimple', this.$tr('editedTitleDescription'));
        this.close();
      },
    },
    $trs: {
      editTitleDescription: 'Edit Title and Description',
      titleLabel: 'Title',
      descriptionLabel: 'Description',
      saveAction: 'Save',
      cancelAction: 'Cancel',
      editedTitleDescription: 'Edited title and description',
    },
  };

</script>
