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
        <div
          style="font-weight:bold;"
        >
          <KTextTruncator
            :text="description"
            :maxLines="2"
          />
        </div>

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
            :layout12="{ span: 8 }"
            :layout8="{ span: 5 }"
            :layout4="{ span: 2 }"
          >
            <p>Class name 2</p>
            <p
              style="font-weight:bold;font-size:1.5em;"
            >
              <KTextTruncator
                :text="description"
                :maxLines="2"
              />
            </p>
          </KGridItem>

          <KGridItem
            :layout12="{ span: 4 }"
            :layout8="{ span: 3 }"
            :layout4="{ span: 2 }"
          >
            <div style="padding:0.5em;">
              <KImg
                src="https://upload.wikimedia.org/wikipedia/commons/8/84/Male_and_female_chicken_sitting_together.jpg"
                height="200px"
                width="200px"
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
            <KImg
              src="./../../../../static/img/kolibri-logo.png"
              height="100px"
              width="100px"
            />
          </KGridItem>

          <KGridItem
            :layout12="{ span: 6 }"
            :layout8="{ span: 4 }"
            :layout4="{ span: 2 }"
          >
            <p>Class name 2</p>
            <p 
              style="font-weight:bold;"
            >
              <KTextTruncator
                :text="description"
                :maxLines="2"
              />
            </p>
            <KIcon icon="" />
            <ProgressBar
              :progressPercent="30"
              :currentTaskError="true"
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
        <p
          style="font-weight:bold;font-size:1.5em;"
        >
          <KTextTruncator
            :text="description"
            :maxLines="2"
          />
        </p>
        <ProgressBar
          :progressPercent="30"
          :currentTaskError="true"
        />
        <p>Footer</p>
      </component>

      <component
        :is="'div'"
        v-if="thumbnailDisplay === 'small'"
      >
        <KImg
          src="./../../../../static/img/kolibri-logo.png"
          height="100px"
          width="100px"
        />

        <p>Class name 2</p>
        <p 
          style="font-weight:bold;font-size:1.5em;"
        >
          <KTextTruncator
            :text="description"
            :maxLines="2"
          />
        </p>

        <ProgressBar
          :progressPercent="30"
          :currentTaskError="true"
        />
        <p>Footer</p>
      </component>

      <component
        :is="'div'"
        v-if="thumbnailDisplay === 'large'"
      >
        <KImg
          src="./../../../../static/img/kolibri-logo.png"
          height="100px"
          width="100px"
        />
        <p>Class name 2</p>
        <p 
          style="font-weight:bold;font-size:1.5em;"
        >
          <KTextTruncator
            :text="description"
            :maxLines="2"
          />
        </p>

        <p>Practice</p>
        <ProgressBar
          :progressPercent="30"
          :currentTaskError="true"
        />

        <p>Footer</p>
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