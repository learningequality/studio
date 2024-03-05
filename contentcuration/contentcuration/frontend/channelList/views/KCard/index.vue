<template>
  <ActualCard
    :title="title"
    :headingLevel="headingLevel"
    :to="to"
  >
    <div 
      v-if="layout === 'horizontal'"
    >
      <component
        :is="'div'"
        v-if="thumbnailDisplay === 'none'"
      >
        <p>Class name 2</p>

        <KTextTruncator
          :text="description"
          :maxLines="2"
          class="description-style"
        />


        <ProgressBar
          :progressPercent="30"
          :currentTaskError="false"
        />
      </component>

      <component
        :is="'div'"
        v-if="thumbnailDisplay === 'small'"
      >
        <KGrid>
          <KGridItem
            :layout12="{ span: 7 }"
            :layout8="{ span: 5 }"
            :layout4="{ span: 2 }"
          >
            <p>Class name 2</p>

            <KTextTruncator
              :text="description"
              :maxLines="2"
              class="description-style"
            />

          </KGridItem>

          <KGridItem
            :layout12="{ span: 5 }"
            :layout8="{ span: 3 }"
            :layout4="{ span: 2 }"
          >
            <div style="padding:0.5em;">
              <KImg
                src="https://upload.wikimedia.org/wikipedia/commons/8/84/Male_and_female_chicken_sitting_together.jpg"
                height="200px"
                width="100%"
                :appearanceOverrides="{ borderRadius: '10%' }"
              />
            </div>
          </KGridItem>
        </KGrid>
       
        <ProgressBar
          :progressPercent="30"
          :currentTaskError="false"
        />
      </component>

      <component
        :is="'div'"
        v-if="thumbnailDisplay === 'large'"
      >
        <KGrid>
          <KGridItem
            :layout12="{ span: 4 }"
            :layout8="{ span: 4 }"
            :layout4="{ span: 2 }"
          >
            <div style="width:100px;height:100px;margin:0;">
              <KImg
                src="https://upload.wikimedia.org/wikipedia/commons/8/84/Male_and_female_chicken_sitting_together.jpg"
                height="130px"
                width="150%"
                :appearanceOverrides="{ 'object-fit': 'cover' }"
              />
            </div>
          </KGridItem>

          <KGridItem
            :layout12="{ span: 8 }"
            :layout8="{ span: 4 }"
            :layout4="{ span: 2 }"
            style="width:65%;"
          >
            <p>Class name 2</p>

            <KTextTruncator
              :text="description"
              :maxLines="2"
              class="description-style"
            />

            <ProgressBar
              :progressPercent="30"
              :currentTaskError="false"
            />
          </KGridItem>
        </KGrid>
      </component>
    </div>

    <div 
      v-if="layout === 'vertical'"
    >
      <component
        :is="'div'"
        v-if="thumbnailDisplay === 'none'"
      >
        <p>Class name 2</p>

        <KTextTruncator
          :text="description"
          :maxLines="2"
          class="description-style"
        />

        <ProgressBar
          :progressPercent="30"
          :currentTaskError="false"
        />

      </component>

      <component
        :is="'div'"
        v-if="thumbnailDisplay === 'small'"
      >
        <KImg
          src="https://upload.wikimedia.org/wikipedia/commons/8/84/Male_and_female_chicken_sitting_together.jpg"
          height="200px"
          width="100%"
        />

        <p>Class name 2</p>

        <KTextTruncator
          :text="description"
          :maxLines="2"
          class="description-style"
        />

        <ProgressBar
          :progressPercent="30"
          :currentTaskError="false"
        />
      </component>

      <component
        :is="'div'"
        v-if="thumbnailDisplay === 'large'"
      >
        <KImg
          src="https://upload.wikimedia.org/wikipedia/commons/8/84/Male_and_female_chicken_sitting_together.jpg"
          height="200px"
          width="100%"
        />

        <p>Class name 2</p>

        <KTextTruncator
          :text="description"
          :maxLines="2"
          class="description-style"
        />

        <ProgressBar
          :progressPercent="30"
          :currentTaskError="false"
        />
      </component>
    </div>
  </ActualCard>
</template>

<script>
import ProgressBar from '../../../channelEdit/views/progress/ProgressBar.vue';
import KImg from '../KImg';
import ActualCard from './ActualCard.vue';

export default {
    name: "KCard",
    components: { ActualCard , KImg, ProgressBar},
    props:{
      title: {
        type: String,
        required: false,
        default: null,
      },
      headingLevel: {
        type: Number,
        required: true,
      },
      to: {
        type: Object,
        required: true,
      },
      layout: {
        type: String,
        required: true
      },
      thumbnailDisplay: {
        type: String,
        required: false,
        default:''
      }
    },
    data() {
      return {
        description :"It is not meant to be the Rather, it offers a logic that is common to all of them and makes creation logic that is common to all of them and makes creation logic that is common to all of them and makes creation ",
      }
    },
}
</script>

<style scoped>
.description-style{
  font-size:1.5em;
  font-weight:bold;
}
</style>