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
        <p
          style="font-weight:bold;"
        >
          It is not meant to be the 
          final card displayed in the Learning Equality Products. 
          Rather, it offers a logic that is common to all of 
          them and makes creation 
        </p>
        <p>In progress</p>
        <p>Footer</p>
      </component>

      <component
        :is="'div'"
        v-if="thumbnailDisplay === 'small'"
      >
        <KGrid>
          <KGridItem
            :layout12="{ span: 6 }"
            :layout8="{ span: 4 }"
            :layout4="{ span: 2 }"
          >
            <p>Class name 2</p>
            <p
              style="font-weight:bold;"
            >
              It is not meant to be the 
              final card displayed in the Learning Equality Products. 
              Rather, it offers a logic that is common to all of 
              them and makes creation 
            </p>
            <p>In progress</p>
            <p>Footer</p>
          </KGridItem>

          <KGridItem
            :layout12="{ span: 6 }"
            :layout8="{ span: 4 }"
            :layout4="{ span: 2 }"
          >
            <div class="" style="width:100px;height:100px;">
              <KImg
                src="./../../../../static/img/kolibri-logo.png"
                height="100px"
                width="100px"
              />
            </div>
          </KGridItem>
        </KGrid>
       
        <p>Footer</p>
      </component>

      <component
        :is="'div'"
        v-if="thumbnailDisplay === 'large'"
      >
        <KGrid>
          <KGridItem
            :layout12="{ span: 6 }"
            :layout8="{ span: 4 }"
            :layout4="{ span: 2 }"
          >
            <KImg
              src="./../../../../static/img/kolibri-logo.png"
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
              It is not meant to be the 
              final card displayed in the Learning Equality Products. 
              Rather, it offers a logic that is common to all of 
              them and makes creation 
            </p>
            <p>In progress</p>
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
          style="font-weight:bold;"
        >
          It is not meant to be the 
          final card displayed in the Learning Equality Products. 
          Rather, it offers a logic that is common to all of 
          them and makes creation 
        </p>
        <p>In progress</p>
        <p>Footer</p>
      </component>

      <component
        :is="'div'"
        v-if="thumbnailDisplay === 'small'"
      >
        <KImg
          src="./../../../../static/img/kolibri-logo.png"
        />

        <p>Class name 2</p>
        <p 
          style="font-weight:bold;"
        >
          It is not meant to be the 
          final card displayed in the Learning Equality Products. 
          Rather, it offers a logic that is common to all of 
          them and makes creation 
        </p>
        <p>In progress</p>
        <p>Footer</p>
      </component>

      <component
        :is="'div'"
        v-if="thumbnailDisplay === 'large'"
      >
        <KImg
          src="./../../../../static/img/kolibri-logo.png"
        />
        <p>Class name 2</p>
        <p 
          style="font-weight:bold;"
        >
          It is not meant to be the 
          final card displayed in the Learning Equality Products. 
          Rather, it offers a logic that is common to all of 
          them and makes creation 
        </p>
        <p>In progress</p>
        <p>Footer</p>
      </component>
    </div>
  </ActualCard>
</template>

<script>
import KImg from '../KImg';
import ActualCard from './ActualCard.vue';

export default {
    name: "KCard",
    components: { ActualCard , KImg},
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
    }
}
</script>