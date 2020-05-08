<template>

  <MessageDialog
    v-model="show"
    header="title"
    :text="$tr('showMoreRecipients', {count: users.length})"
  >
    <template #buttons="{close}">
      <v-btn color="primary" flat @click="show = false">
        {{ $tr('cancel') }}
      </v-btn>
      <v-btn color="primary" dark @click="emailHandler">
        {{ $tr('email') }}
      </v-btn>
    </template>
  </MessageDialog>

</template>


<script>

  import MessageDialog from 'shared/views/MessageDialog';

  export default {
    name: 'EmailUsersDialog',
    components: { MessageDialog },
    props: {
      users: Array,
      value: Boolean,
    },
    computed: {
      show: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
    },
    methods: {
      emailHandler() {
        this.show = false;
        this.$store.dispatch('showSnackbarSimple', this.$tr('emailSuccess'));
      },
    },
    $trs: {
      cancel: 'Cancel',
      email: 'Send email',
      emailSuccess: 'Email sent',
      showMoreRecipients: 'Show {count, plural,\n other {# more}}',
    },
  };

</script>


<style lang="less" scoped>
</style>
