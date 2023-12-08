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
        v-model="title"
        :label="$tr('titleLabel')"
        :invalid="!!errors.title"
        :invalidText="errors.title"
        showInvalidText
        autofocus
        @input="errors.title = ''"
      />
      <KTextbox
        v-model="description"
        :label="$tr('descriptionLabel')"
        :invalid="!!errors.description"
        :invalidText="errors.description"
        textArea
        showInvalidText
        @input="errors.description = ''"
      />
    </KModal>
  </div>
</template>


<script>

  import { mapGetters, mapActions } from 'vuex';

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
        errors: {},
      };
    },
    methods: {
      ...mapActions('contentNode', [
        'updateContentNode',
      ]),
      close() {
        this.$emit('close');
      },
      handleSave() {
        const { title, description } = this;
        const errors = {};

        if (!title) {
          errors.title = this.$tr('fieldRequired');
        }

        if (Object.keys(errors).length) {
          this.errors = errors;
          return;
        }

        this.updateContentNode({
          id: this.node.id,
          title,
          description,
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


<style scoped lang="scss"></style>