<template>
  <div>
    <div class="">
      <KCard
        layout="horizontal"
        thumbnailDisplay="large"
        thumbnailSrc="https://i.guim.co.uk/img/media/30646649ad38eca6e8ddd6108af6de13e43117a4/475_196_4518_3323/master/4518.jpg?width=1900&dpr=2&s=none"
        :headingLevel="3"
        :to="{ }"
        thumbnailScaleType="contain"
      >
        <template #aboveTitle>
          <p>{{ $tr('className') }}</p>
        </template>

        <template #footer>
          <div>
            <ProgressBar
              :progressPercent="10"
              :currentTaskError="false"
            />
          </div>
        </template>
        <template #belowTitle>
          <KTextTruncator
            :text="description"
            :maxLines="2"
            class="description-style"
          />
        </template>
        <template #thumbnailPlaceholder>
          <KImg
            src="https://via.placeholder.com/200"
          />
        </template>
      </KCard>
    </div>
  </div>
</template>

<script>
    import ProgressBar from '../../../channelEdit/views/progress/ProgressBar.vue';
    import KCard from './index.vue';
    import KImg from './../KImg';

    export default {
        name:"RecommendedResourceCard",
        components: { KCard, KImg, ProgressBar },
        data() {
            return {
                description :"It is not meant to be the Rather, it offers a logic that is common to all of them and makes creation logic that is common to all of them and makes creation logic that is common to all of them and makes creation ",
            }
        },
        $trs: {
           className: 'Class name 2',
        },
    }
</script>


<style scoped>
.description-style{
    font-size:1.2em;
    font-weight:bold;
}

</style>