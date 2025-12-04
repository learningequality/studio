<template>

  <div>
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

  import { mapActions, mapGetters } from 'vuex';
  import { getTitleValidators, getInvalidText } from 'shared/utils/validation';
  import commonStrings from 'shared/translator';

  export default {
    name: 'EditTitleDescriptionModal',
    props: {
      nodeId: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        title: '',
        description: '',
        titleError: '',
        changed: false,
      };
    },
    computed: {
      ...mapGetters('contentNode', ['getContentNode']),
      contentNode() {
        return this.getContentNode(this.nodeId);
      },
    },
    watch: {
      title(newTitle, oldTitle) {
        this.changed = this.changed || newTitle !== oldTitle;
      },
      description(newDescription, oldDescription) {
        this.changed = this.changed || newDescription !== oldDescription;
      },
    },
    created() {
      this.title = this.contentNode.title || '';
      this.description = this.contentNode.description || '';
      // Reset changed flag after the component is created
      this.$nextTick(() => (this.changed = false));
    },
    methods: {
      ...mapActions('contentNode', ['updateContentNode']),
      validateTitle() {
        this.titleError = getInvalidText(getTitleValidators(), this.title);
      },
      close(changed = false) {
        this.$emit('close', {
          changed: this.titleError ? false : changed,
        });
      },
      async handleSave() {
        this.validateTitle();
        if (this.titleError) {
          return;
        }

        const { nodeId, title, description } = this;
        await this.updateContentNode({
          id: nodeId,
          title: title.trim(),
          description: description.trim(),
          checkComplete: true,
        });
        /* eslint-disable-next-line kolibri/vue-no-undefined-string-uses */
        this.$store.dispatch('showSnackbarSimple', commonStrings.$tr('changesSaved'));
        this.close(this.changed);
      },
    },
    $trs: {
      editTitleDescription: 'Edit title and description',
      titleLabel: 'Title',
      descriptionLabel: 'Description',
      saveAction: 'Save',
      cancelAction: 'Cancel',
    },
  };

</script>
