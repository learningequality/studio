<template>

  <MessageLayout
    :header="$tr('title')"
    :text="$tr('text')"
  >
    <VBtn color="primary" large :to="{name: 'RequestNewActivationLink'}">
      {{ $tr('requestNewLink') }}
    </VBtn>
  </MessageLayout>

</template>


<script>

  import MessageLayout from '../../components/MessageLayout';

  export default {
    name: 'AccountNotActivated',
    components: {
      MessageLayout,
    },
    $trs: {
      title: 'Account has not been activated',
      text:
        'This acccount has not been activated yet. Please check your email for an activation link or request a new link.',
      requestNewLink: 'Request a new link',
    },
  };

</script>
