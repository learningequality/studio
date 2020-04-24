<template>

  <PrimaryDialog :value="show" title="Change password">
    <form @submit.prevent="submitPassword">
      <KTextbox v-model="password" label="New password" :invalid="formIsInvalid" />
      <KTextbox v-model="confirmation" label="Confirm new password" :invalid="formIsInvalid" invalidText="Password and confirmation must match" />

      <div slot="actions" style="text-align: right;">
        <KButtonGroup>
          <KButton
            text="Cancel"
            @click="$emit('hidePasswordForm')"
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
    name: 'ChangePasswordForm',
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
        password: '',
        confirmation: '',
        formIsInvalid: false,
      };
    },
    methods: {
      submitPassword() {
        if(this.password === this.confirmation) {
          const email = this.$store.state.session.currentUser.email;
          client.patch(window.Urls.change_password(email), { password: this.password })
            .then(() => this.$emit("hidePasswordForm"))
            .catch(e => window.alert(`Failed to save new password: ${e}`));
        } else {
          this.formIsInvalid = true;
        }
      }
    }
  }

</script>

<style>

</style>
