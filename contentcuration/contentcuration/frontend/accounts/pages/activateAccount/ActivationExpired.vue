<template>

  <MessageLayout
    :header="$tr('activationExpiredTitle')"
    :text="$tr('activationExpiredText')"
  >
    <VBtn color="primary" large :to="{name: 'RequestNewActivationLink'}" class="mb-4">
      {{ $tr('requestNewLink') }}
    </VBtn>
  </MessageLayout>

</template>


<script>

  import MessageLayout from '../../components/MessageLayout';

  export default {
    name: 'ActivationExpired',
    components: {
      MessageLayout,
    },
    $trs: {
      activationExpiredTitle: 'Activation failed',
      activationExpiredText: 'This activation link has been used already or is invalid.',
      requestNewLink: 'Request a new activation link',
    },
  };

</script>
