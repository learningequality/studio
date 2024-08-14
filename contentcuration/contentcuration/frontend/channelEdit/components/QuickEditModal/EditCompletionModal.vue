<template>

  <KModal
    :title="$tr('editCompletion')"
    :submitText="$tr('saveAction')"
    :cancelText="$tr('cancelAction')"
    data-test="edit-completion-modal"
    @submit="handleSave"
    @cancel="close"
  >
    <CompletionOptions
      ref="completionOptions"
      v-model="completionAndDuration"
      required
      expanded
      :maxMenuHeight="150"
      :kind="contentNode.kind"
      :fileDuration="fileDuration"
    />
  </KModal>

</template>

<script>

  import { mapGetters, mapActions } from 'vuex';
  import { getFileDuration } from 'shared/utils/helpers';
  import CompletionOptions from 'shared/views/contentNodeFields/CompletionOptions';

  export default {
    name: 'EditCompletionModal',
    components: {
      CompletionOptions,
    },
    props: {
      nodeId: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        completionObject: {},
      };
    },
    computed: {
      ...mapGetters('contentNode', ['getContentNode']),
      ...mapGetters('file', ['getContentNodeFiles']),
      contentNode() {
        return this.getContentNode(this.nodeId);
      },
      nodeFiles() {
        return this.getContentNodeFiles(this.contentNode.id) || [];
      },
      fileDuration() {
        return getFileDuration(this.nodeFiles, this.contentNode.kind);
      },
      completionAndDuration: {
        get() {
          return this.completionObject;
        },
        set({ completion_criteria, ...value }) {
          this.completionObject = {
            ...value,
            ...(completion_criteria || {}),
          };
        },
      },
    },
    mounted() {
      const { suggested_duration, extra_fields = {} } = this.contentNode;
      const { suggested_duration_type, options } = extra_fields || {};
      const { modality, completion_criteria } = options || {};

      this.completionObject = {
        suggested_duration,
        suggested_duration_type,
        modality,
        ...(completion_criteria || {}),
      };
    },
    methods: {
      ...mapActions('contentNode', ['updateContentNode']),
      validate() {
        return this.$refs.completionOptions.validate();
      },
      handleSave() {
        const error = this.validate();
        if (error) {
          return;
        }
        const {
          suggested_duration,
          suggested_duration_type,
          modality,
          model,
          threshold,
          learner_managed,
        } = this.completionObject;
        const payload = {
          suggested_duration,
          extra_fields: {
            suggested_duration_type,
            options: {
              modality,
              completion_criteria: {
                model,
                threshold,
                learner_managed,
              },
            },
          },
        };

        this.updateContentNode({ id: this.nodeId, ...payload });

        this.$store.dispatch('showSnackbarSimple', this.$tr('editedCompletion', { count: 1 }));
        this.close();
      },
      close() {
        this.$emit('close');
      },
    },
    $trs: {
      editCompletion: 'Edit Completion',
      saveAction: 'Save',
      cancelAction: 'Cancel',
      editedCompletion:
        'Edited completion for {count, number, integer} {count, plural, one {resource} other {resources}}',
    },
  };

</script>

<style scoped>
</style>