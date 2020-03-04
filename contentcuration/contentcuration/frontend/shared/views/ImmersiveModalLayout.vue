<template>

  <VApp>
    <VToolbar app dark color="primary">
      <VBtn v-if="backButton" flat link :to="previousPage">
        <Icon>arrow_back</Icon>
        <span class="back-text">{{ appBarText }}</span>
      </VBtn>

      <template v-else>
        <VBtn link icon dark :to="previousPage">
          <Icon>close</Icon>
        </VBtn>
        <VToolbarTitle>
          {{ appBarText }}
        </VToolbarTitle>
      </template>
    </VToolbar>
    <VContent>
      <PageContainer class="container">
        <slot></slot>
      </PageContainer>
    </VContent>
  </VApp>

</template>


<script>

  import PageContainer from './PageContainer';

  export default {
    name: 'ImmersiveModalLayout',
    components: {
      PageContainer,
    },
    props: {
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



<style lang="less" scoped>

  .back-text {
    display: inline-block;
    margin-left: 8px;
    font-size: 16px;
    text-transform: initial;
  }

  .container {
    width: 500px;
    max-width: 1000px;
    margin: 64px auto;
  }

</style>
