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
        <p>{{ $tr('className') }}</p>

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
            <p>{{ $tr('className') }}</p>

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
                :src="imageSource"
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
            <div style="width:100px;height:100px;">
              <KImg
                :src="imageSource"
                height="145px"
                width="150%"
                :appearanceOverrides="{ 'object-fit': 'cover',borderRadius: '10px 0px 0px 10px' }"
              />
            </div>
          </KGridItem>

          <KGridItem
            :layout12="{ span: 8 }"
            :layout8="{ span: 4 }"
            :layout4="{ span: 2 }"
            style="width:65%;"
          >
            <div style="padding:0.5em;">
              <p>{{ $tr('className') }}</p>
  
              <KTextTruncator
                :text="description"
                :maxLines="2"
                class="description-style"
              />
              <ProgressBar
                :progressPercent="30"
                :currentTaskError="false"
              />

            </div>
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
        <p>{{ $tr('className')}}</p>

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
          :src="imageSource"
          height="200px"
          width="100%"
        />

        <p>{{ $tr('className') }}</p>

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
          :src="imageSource"
          height="200px"
          width="100%"
        />

        <p>{{ $tr('className') }}</p>

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
      },
      imageSource:{
        type: String,
        required: false,
        default: null
      }
    },
    data() {
      return {
        description :"It is not meant to be the Rather, it offers a logic that is common to all of them and makes creation logic that is common to all of them and makes creation logic that is common to all of them and makes creation ",
      }
    },
    $trs: {
      className: 'Class name 2',
    }
}
</script>

<style scoped>
.description-style{
  font-size:1.2em;
  font-weight:bold;
}
</style>