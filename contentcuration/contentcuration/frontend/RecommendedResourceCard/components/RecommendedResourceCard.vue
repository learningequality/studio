<template>

  <div>
    <KCard
      title
      headingLevel="2"
      :to="{ }"
      layout="horizontal"
      thumbnailScaleType="cover"
      thumbnailDisplay="small"
      thumbnailSrc="https://domf5oio6qrcr.cloudfront.net/medialibrary/11525/0a5ae820-7051-4495-bcca-61bf02897472.jpg"
    >
      <template #aboveTitle>
        <div>
          <KIconButton
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
          <KIconButton icon="openNewTab" />
          <KIconButton icon="thumbDown" />
        </div>
      </template>
    </KCard>
  </div>

</template>
<script>

  import KCard from './../../channelList/views/KCard/index.vue';

  export default {
    name: 'RecommendedResourceCard',
    components: {
      KCard,
    },
  };

</script>
<style>
.bellow-title-style {
  font-weight: 1000;
}
.align-right-style{
    display: flex;
    justify-content: flex-end;
}

</style>
