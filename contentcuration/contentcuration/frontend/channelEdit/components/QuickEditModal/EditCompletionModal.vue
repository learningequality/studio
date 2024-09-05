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

  import isEqual from 'lodash/isEqual';
  import { mapGetters, mapActions } from 'vuex';
  import { getFileDuration } from 'shared/utils/helpers';
  import CompletionOptions from 'shared/views/contentNodeFields/CompletionOptions';
  import commonStrings from 'shared/translator';

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
        hasError: false,
        changed: false,
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
          const newValue = {
            ...value,
            ...(completion_criteria || {}),
          };
          this.changed = this.changed || !isEqual(this.completionObject, newValue);
          this.completionObject = newValue;
        },
      },
    },
    watch: {
      completionObject() {
        this.$nextTick(() => {
          this.validate();
        });
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
        this.hasError = this.$refs.completionOptions.validate();
        return this.hasError;
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
        /* eslint-disable-next-line kolibri/vue-no-undefined-string-uses */
        this.$store.dispatch('showSnackbarSimple', commonStrings.$tr('changesSaved'));
        this.close(this.changed);
      },
      close(changed = false) {
        this.$emit('close', {
          changed: this.hasError ? false : changed,
        });
      },
    },
    $trs: {
      editCompletion: 'Edit completion',
      saveAction: 'Save',
      cancelAction: 'Cancel',
    },
  };

</script>

<style scoped>
</style>
