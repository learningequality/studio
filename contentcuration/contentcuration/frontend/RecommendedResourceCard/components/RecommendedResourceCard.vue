<template>

  <KCard
    title="sample title"
    :headingLevel="2"
    :to="sampleRoute"
    layout="horizontal"
    thumbnailScaleType="cover"
    thumbnailDisplay="small"
    :titleLines="3"
    thumbnailSrc="https://domf5oio6qrcr.cloudfront.net/medialibrary/11525/0a5ae820-7051-4495-bcca-61bf02897472.jpg"
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

  import KCard from './../../channelList/views/KCard/index.vue';

  export default {
    name: 'RecommendedResourceCard',
    components: {
      KCard,
    },
    computed: {
      sampleRoute() {
        return {
          path: '/starred',
        };
      },
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
.card-icon-size{
    font-size: 20px;
    margin-left:1em;
}

</style>
