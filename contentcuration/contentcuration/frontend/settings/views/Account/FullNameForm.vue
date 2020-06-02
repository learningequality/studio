<template>

  <PrimaryDialog :value="show" title="Edit name">
    <form @submit.prevent="submitFullName">
      <KTextbox v-model="firstName" :label="$tr('firstNameLabel')" />
      <KTextbox v-model="lastName" :label="$tr('lastNameLabel')" />

      <div slot="actions" style="text-align: right;">
        <KButtonGroup>
          <KButton
            :text="$tr('cancelAction')"
            @click="$emit('hideFullNameForm')"
          />
          <KButton
            :text="$tr('saveChangesAction')"
            type="submit"
            primary
          />
        </KButtonGroup>
      </div>
    </form>
  </PrimaryDialog>

</template>

<script>

  import { mapActions, mapState } from 'vuex';
  import PrimaryDialog from 'shared/views/PrimaryDialog';

  export default {
    name: 'FullNameForm',
    components: { PrimaryDialog },
    props: {
      show: {
        type: Boolean,
        default: false,
        required: true,
      },
    },
    data() {
      return {
        // Initialized in beforeMount
        firstName: null,
        lastName: null,
      };
    },
    computed: {
      ...mapState({
        user: state => state.session.currentUser,
      }),
    },
    beforeMount() {
      this.firstName = this.user.first_name;
      this.lastName = this.user.last_name;
    },
    methods: {
      ...mapActions({
        // This one persists the change
        patchFullName: 'patchFullName',
        // This one updates vuex state
        updateFullName: 'updateFullName',
      }),
      submitFullName() {
        const email = this.user.email;
        const fullName = { first_name: this.firstName, last_name: this.lastName };
        this.patchFullName({ email, fullName }).then(() => {
          this.updateFullName(fullName)
            .then(() => {
              this.$emit('hideFullNameForm');
              this.$store.dispatch('showSnackbar', { text: this.$tr('changesSavedMessage') });
            })
            .catch(() => {
              // TODO: Create error snackbar $tr to use here.
              this.$store.dispatch('showSnackbar', { text: this.$tr('failedToSaveMessage') });
            });
        });
      },
    },
    $trs: {
      firstNameLabel: 'First name',
      lastNameLabel: 'Last name',
      cancelAction: 'Cancel',
      saveChangesAction: 'Save changes',
      changesSavedMessage: 'Changes saved',
      failedToSaveMessage: 'Failed to save changes',
    },
  };

</script>

<style>

</style>
