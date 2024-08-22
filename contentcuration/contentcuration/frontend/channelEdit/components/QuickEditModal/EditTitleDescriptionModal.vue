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
      };
    },
    computed: {
      ...mapGetters('contentNode', ['getContentNode']),
      contentNode() {
        return this.getContentNode(this.nodeId);
      },
    },
    created() {
      this.title = this.contentNode.title || '';
      this.description = this.contentNode.description || '';
    },
    methods: {
      ...mapActions('contentNode', ['updateContentNode']),
      validateTitle() {
        this.titleError = getInvalidText(getTitleValidators(), this.title);
      },
      close() {
        this.$emit('close');
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
        });
        /* eslint-disable-next-line kolibri/vue-no-undefined-string-uses */
        this.$store.dispatch('showSnackbarSimple', commonStrings.$tr('changesSaved'));
        this.close();
      },
    },
    $trs: {
      editTitleDescription: 'Edit Title and Description',
      titleLabel: 'Title',
      descriptionLabel: 'Description',
      saveAction: 'Save',
      cancelAction: 'Cancel',
    },
  };

</script>
