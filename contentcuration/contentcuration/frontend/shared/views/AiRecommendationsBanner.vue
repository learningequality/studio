<template>

  <StudioBanner
    v-if="!dismissed"
    :style="{
      backgroundColor: $themePalette.blue.v_100,
      padding: '20px',
      gap: '20px',
      borderRadius: '4px',
    }"
  >
    <template #icon>
      <div
        class="icon-wrapper"
        :style="{ backgroundColor: $themePalette.blue.v_200 }"
      >
        <KIcon
          icon="library"
          class="icon"
          :color="$themePalette.white"
          :style="{ backgroundColor: $themePalette.blue.v_400 }"
        />
      </div>
    </template>

    <div class="content">
      <div class="text">
        <h2>
          {{ searchRecommendationsStrings.trySearchRecommendationsHeader$() }}
        </h2>
        <p>
          {{ searchRecommendationsStrings.trySearchRecommendationsText$() }}
        </p>
      </div>
      <slot></slot>
    </div>

    <KIconButton
      v-if="dismissible"
      icon="close"
      :tooltip="searchRecommendationsStrings.closeAction$()"
      class="dismiss-btn"
      @click="dismiss"
    />
  </StudioBanner>

</template>


<script>

  import StudioBanner from 'shared/views/StudioBanner';
  import { searchRecommendationsStrings } from 'shared/strings/searchRecommendationsStrings';

  const DISMISSED_KEY = 'recommendations-announcement-dismissed';

  export default {
    name: 'AiRecommendationsBanner',
    components: { StudioBanner },
    setup() {
      return { searchRecommendationsStrings };
    },
    props: {
      dismissible: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        dismissed: localStorage.getItem(DISMISSED_KEY) === 'true',
      };
    },
    methods: {
      dismiss() {
        localStorage.setItem(DISMISSED_KEY, 'true');
        this.dismissed = true;
      },
    },
  };

</script>


<style lang="scss" scoped>

  .icon-wrapper {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 96px;
    height: 96px;
    border-radius: 2px;
  }

  .icon {
    width: 40px;
    height: 40px;
    padding: 6px;
    border-radius: 50%;
  }

  .content {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: flex-end;

    p {
      margin: 0;
    }
  }

  h2 {
    font-size: 18px;
  }

  .dismiss-btn {
    flex-shrink: 0;
    align-self: flex-start;
  }

</style>
