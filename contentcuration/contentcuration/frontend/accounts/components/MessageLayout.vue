<template>

  <VApp>
    <VLayout justify-center fill-height class="pt-5 mt-5">
      <VFlex style="max-width: 900px;">
        <h1 class="font-weight-bold headline text-xs-center">
          {{ header }}
        </h1>
        <p class="text-xs-center subheading mt-1 mb-5">
          {{ text }}
        </p>
        <div style="max-width: 400px; margin: 0 auto; text-align: center;">
          <slot></slot>
          <p class="mt-4">
            <slot name="back">
              <ActionLink :to="{ name: 'Main' }" :text="$tr('backToLogin')" />
            </slot>
          </p>
        </div>
      </VFlex>
    </VLayout>
  </VApp>

</template>

<script>

  export default {
    name: 'MessageLayout',
    props: {
      header: {
        type: String,
        required: true,
      },
      text: {
        type: String,
        required: false,
      },
    },
    $trs: {
      backToLogin: 'Back to sign-in',
    },
  };

</script>
