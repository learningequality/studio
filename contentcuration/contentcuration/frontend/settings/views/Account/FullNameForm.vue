<template>

  <PrimaryDialog :value="show" title="Edit name">
    <form @submit.prevent="submitFullName">
      <KTextbox v-model="firstName" label="First name" />
      <KTextbox v-model="lastName" label="Last name" />

      <div slot="actions" style="text-align: right;">
        <KButtonGroup>
          <KButton
            text="Cancel"
            @click="$emit('hideFullNameForm')"
          />
          <KButton
            text="Save changes"
            type="submit"
            primary
          />
        </KButtonGroup>
      </div>
    </form>
  </PrimaryDialog>

</template>

<script>

  import client from '../../../shared/client';
  import PrimaryDialog from '../../../shared/views/PrimaryDialog';

  export default {
    name: 'FullNameForm',
    components: { PrimaryDialog },
    props: {
      show: {
        type: Boolean,
        default: false,
        required: true,
      }
    },
    data() {
      return {
        firstName: this.$store.state.session.currentUser.first_name,
        lastName: this.$store.state.session.currentUser.last_name,
      };
    },
    methods: {
      submitFullName() {
        const email = this.$store.state.session.currentUser.email;
        const fullName ={ first_name: this.firstName, last_name: this.lastName };
        client.patch(
          window.Urls.update_user_full_name(email),
          fullName
        )
        .then(() => {
          this.$store.dispatch('updateFullName', fullName)
            .then(() => this.$emit("hideFullNameForm"));
        })
        .catch(e => window.alert(`Failed to save new username: ${e}`));
      }
    }
  }

</script>

<style>

</style>
