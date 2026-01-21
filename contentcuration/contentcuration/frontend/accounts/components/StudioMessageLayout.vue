<template>

  <div class="message-layout-wrapper">
    <StudioPage
      :centered="true"
      :marginTop="0"
    >
      <div class="message-layout-content">
        <h1 class="message-header">
          {{ header }}
        </h1>
        <p
          v-if="text"
          class="message-text"
        >
          {{ text }}
        </p>
        <div class="message-slot-container">
          <slot></slot>
        </div>
        <div class="link-container">
          <slot name="back">
            <KRouterLink
              :to="{ name: 'Main' }"
              :text="$tr('backToLogin')"
              appearance="basic-link"
            />
          </slot>
        </div>
      </div>
    </StudioPage>
  </div>

</template>


<script>

  import StudioPage from '../../shared/views/StudioPage';

  export default {
    name: 'StudioMessageLayout',
    components: {
      StudioPage,
    },
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


<style scoped>

  .message-layout-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
  }

  .link,
  a.link {
    background-color: transparent !important;
    border-color: transparent !important;
  }

  .message-layout-content {
    display: flex;
    flex-direction: column;
    max-width: 900px;
    padding-top: 80px;
    padding-bottom: 48px;
    text-align: center;
  }

  .message-header {
    margin-bottom: 6px;
    font-size: 24px;
    font-weight: bold;
  }

  .message-text {
    margin-top: 4px;
    margin-bottom: 20px;
    font-size: 16px;
  }

  .message-slot-container {
    max-width: 400px;
    margin: 24px auto 0;
    text-align: center;
  }

  .link-container {
    margin-top: 24px;
  }

</style>
