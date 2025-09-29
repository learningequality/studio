<template>

  <VApp>
    <VToolbar
      app
      dark
      color="appBarDark"
    >
      <VBtn
        v-if="backButton"
        flat
        :to="previousPage"
        exact
      >
        <VIconWrapper class="rtl-flip"> arrow_back </VIconWrapper>
        <span class="back-text">{{ appBarText }}</span>
      </VBtn>
      <template v-else>
        <VBtn
          icon
          dark
          :to="previousPage"
          exact
        >
          <VIconWrapper>close</VIconWrapper>
        </VBtn>
        <VToolbarTitle>
          {{ appBarText }}
        </VToolbarTitle>
      </template>
    </VToolbar>
    <VContent style="height: calc(100vh - 64px); overflow: auto; background-color: white">
      <div class="content-wrapper">
        <PageContainer class="content">
          <slot></slot>
        </PageContainer>
      </div>
    </VContent>
  </VApp>

</template>


<script>

  import PageContainer from '../views/PageContainer';

  export default {
    name: 'ImmersiveModalLayout',
    components: {
      PageContainer,
    },
    props: {
      // Should generally be a Vue Router location descriptor object. See
      // https://router.vuejs.org/guide/essentials/navigation.html#programmatic-navigation
      previousPage: {
        type: [String, Object],
        required: true,
      },
      backButton: {
        type: Boolean,
        default: false,
      },
      appBarText: {
        type: String,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .back-text {
    display: inline-block;
    margin-left: 8px;
    font-size: 16px;
    text-transform: initial;
  }

  .content-wrapper {
    margin: 28px;
  }

  .content {
    max-width: 1000px;
    margin: 64px auto;
  }

</style>
