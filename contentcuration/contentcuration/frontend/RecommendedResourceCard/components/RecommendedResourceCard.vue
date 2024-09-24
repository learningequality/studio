<template>

  <KCard
    :to="to"
    :title="title"
    layout="horizontal"
    :headingLevel="headingLevel"
    thumbnailScaleType="contain"
    thumbnailDisplay="small"
    thumbnailAlign="right"
    :thumbnailSrc="thumbnailSrc"
  >
    <template #select>
      <KCheckbox />
    </template>
    <template #aboveTitle>
      <span>
        <KIcon icon="practiceSolid" />
        <span>Practice</span>
      </span>
    </template>
    <template #belowTitle>
      <div>
        <KTextTruncator
          :text="description"
          :maxLines="2"
        />
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
      description: {
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
      padding-top: 8px;
  }
</style>
