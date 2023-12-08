<template>
  <div
    @click.stop
    @dblclick.stop
  >
    <KModal
      :title="$tr('editTitleDescription')"
      :submitText="$tr('saveAction')"
      :cancelText="$tr('cancelAction')"
      @submit="handleSave"
      @cancel="close"
    >
      <KTextbox
        autofocus
        showInvalidText
        v-model="title"
        :maxlength="200"
        :label="$tr('titleLabel')"
        :invalid="!!titleError"
        :invalidText="titleError"
        @input="titleError = ''"
        @blur="validateTitle"
      />
      <KTextbox
        textArea
        v-model="description"
        :maxlength="400"
        :label="$tr('descriptionLabel')"
        style="margin-top: 0.5em"
      />
    </KModal>
  </div>
</template>


<script>

  import { mapActions } from 'vuex';

  export default {
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
      ...mapActions('contentNode', [
        'updateContentNode',
      ]),
      validateTitle() {
        if (this.title.trim().length === 0) {
          this.titleError = this.$tr('fieldRequired');
          return false;
        }
        return true;
      },
      close() {
        this.$emit('close');
      },
      handleSave() {
        if (!this.validateTitle()) {
          return;
        }

        const { node, title, description } = this;
        this.updateContentNode({
          id: node.id,
          title: title.trim(),
          description: description.trim(),
        });

        this.close();
      },
    },
    $trs: {
      editTitleDescription: 'Edit Title and Description',
      titleLabel: 'Title',
      descriptionLabel: 'Description',
      saveAction: 'Save',
      cancelAction: 'Cancel',
      fieldRequired: 'Field is required',
    },
  }
</script>
