<template>

  <KCard
    class="recommended-resource-card"
    :to="to"
    :title="title"
    orientation="horizontal"
    :headingLevel="headingLevel"
    thumbnailScaleType="contain"
    thumbnailDisplay="small"
    thumbnailAlign="right"
    :thumbnailSrc="thumbnailSrc"
    :style="{ margin: '16px 0 16px 0' }"
  >
    <template #aboveTitle>
      <div>
        <KIcon
          icon="practiceSolid"
        />
        <span>Practice</span>
      </div>
    </template>
    <template #title>
    </template>
    <template #belowTitle>
      <div class="bellow-title-style">
        <p>
          below title slot section for the KCard component:
          below title slot section for the KCard component
        </p>
      </div>
    </template>
    <template #footer>
      <div class="align-right-style">
        <KIconButton icon="openNewTab" class="card-icon-size" />
        <KIconButton icon="thumbDown" class="card-icon-size" />
      </div>
    </template>
  </KCard>

</template>


<script>

  export default {
    name: 'RecommendedResourceCard',
    props: {
      to: {
        type: Object,
        required: true,
      },
      title: {
        type: String,
        default: null,
      },
      headingLevel: {
        type: Number,
        required: true,
      },
      thumbnailSrc: {
        type: String,
        default: null,
      },
    },
  };

</script>


<style>
  .align-right-style{
      display: flex;
      justify-content: flex-end;
  }
  .recommended-resource-card {
    max-width:400px
  }
</style>
