<template>

  <VApp style="height: 100vh; overflow: auto">
    <VLayout
      justify-center
      fill-height
      class="mt-5 pt-5"
    >
      <VFlex style="max-width: 900px">
        <h1 class="font-weight-bold headline text-xs-center">
          {{ header }}
        </h1>
        <p class="mb-5 mt-1 subheading text-xs-center">
          {{ text }}
        </p>
        <div style="max-width: 400px; margin: 0 auto; text-align: center">
          <slot></slot>
          <p class="mt-4">
            <slot name="back">
              <KRouterLink
                :to="{ name: 'Main' }"
                :text="$tr('backToLogin')"
              />
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
        default: '',
      },
    },
    $trs: {
      backToLogin: 'Continue to sign-in page',
    },
  };

</script>
