<template>

  <KModal
    v-if="dialog"
    :title="$tr('editNameHeader')"
    :submitText="$tr('saveChangesAction')"
    :cancelText="$tr('cancelAction')"
    @submit="submit"
    @cancel="dialog = false"
  >
    <KTextbox
      v-model="first_name"
      :maxlength="100"
      counter
      :label="$tr('firstNameLabel')"
      :invalid="errors.first_name"
      :invalidText="$tr('fieldRequired')"
    />
    <KTextbox
      v-model="last_name"
      :maxlength="100"
      counter
      :label="$tr('lastNameLabel')"
      :invalid="errors.last_name"
      :invalidText="$tr('fieldRequired')"
    />
  </KModal>

</template>


<script>

  import { mapActions, mapState } from 'vuex';
  import useKSnackbar from 'kolibri-design-system/lib/composables/useKSnackbar';
  import { generateFormMixin } from 'shared/mixins';

  const formMixin = generateFormMixin({
    first_name: {
      required: true,
    },
    last_name: {
      required: true,
    },
  });

  export default {
    name: 'FullNameForm',
    mixins: [formMixin],
    setup() {
      const { createSnackbar } = useKSnackbar();
      return { createSnackbar };
    },
    props: {
      value: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      ...mapState({
        user: state => state.session.currentUser,
      }),
      dialog: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
    },
    watch: {
      dialog(value) {
        // Reset values on open
        if (value) {
          this.reset();
          this.first_name = this.user.first_name;
          this.last_name = this.user.last_name;
        }
      },
    },
    methods: {
      ...mapActions('settings', ['saveFullName']),

      // eslint-disable-next-line kolibri/vue-no-unused-methods, vue/no-unused-properties
      onSubmit(formData) {
        this.saveFullName(formData)
          .then(() => {
            this.dialog = false;
            this.createSnackbar({
              text: this.$tr('changesSavedMessage'),
              autoDismiss: true,
              announce: true,
              duration: 6000,
            });
          })
          .catch(() => {
            this.createSnackbar({
              text: this.$tr('failedToSaveMessage'),
              autoDismiss: true,
              announce: true,
              duration: 6000,
            });
          });
      },
    },
    $trs: {
      editNameHeader: 'Edit full name',
      firstNameLabel: 'First name',
      lastNameLabel: 'Last name',
      cancelAction: 'Cancel',
      saveChangesAction: 'Save changes',
      changesSavedMessage: 'Changes saved',
      failedToSaveMessage: 'Failed to save changes',
      fieldRequired: 'Field is required',
    },
  };

</script>
