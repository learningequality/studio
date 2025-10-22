<template>

  <div>
    <h2>{{ $tr('storagePercentageUsed', { qty: storageUsagePercentage.toString() }) }}</h2>
    <KLinearLoader
      :progress="storageUsagePercentage"
      type="determinate"
      class="loader"
    />
    <div>
      {{
        $tr('spaceUsedOfMax', { qty: formatFileSize(usedSpace), max: formatFileSize(totalSpace) })
      }}
    </div>

    <KFixedGrid
      v-if="storageUseByKind !== null"
      numCols="8"
      gutter="10"
    >
      <!-- ContentKindsList returns lowercased strings for each kind -->
      <template v-for="kind in contentKinds">
        <KFixedGridItem
          :key="`${kind}1`"
          span="3"
          class="row"
        >
          <span
            class="mr-2 pa-2"
            :style="{ backgroundColor: theme[kind] }"
          >
            <KIcon
              :icon="kindIcon(kind)"
              :color="$themeTokens.textInverted"
            />
          </span>

          <span>{{ translateConstant(kind) }}</span>
        </KFixedGridItem>

        <KFixedGridItem
          :key="`${kind}2`"
          span="5"
          class="row"
        >
          <span>{{ formatFileSize(storageUseByKind[kind]) }}</span>
        </KFixedGridItem>
      </template>
    </KFixedGrid>
    <StudioLargeLoader v-else />

    <div class="storage-request">
      <h2 ref="requestheader">
        {{ $tr('requestMoreSpaceHeading') }}
      </h2>

      <p>
        {{ $tr('requestMoreSpaceMessage') }}
      </p>

      <h3>
        {{ $tr('beforeRequestingHeading') }}
      </h3>

      <ul>
        <li>
          <span>{{ $tr('beforeRequestingMessage') + ' ' }}</span>
          <KExternalLink
            :text="$tr('learnMoreAboutImportingContentFromChannels')"
            href="https://kolibri-studio.readthedocs.io/en/latest/add_content.html#import-content-from-other-channels"
            openInNewTab
          />
        </li>
        <li>
          <span>{{ $tr('videoFiles') + ' ' }}</span>
          <KExternalLink
            :text="$tr('learnMoreAboutVideoCompression')"
            href="https://ricecooker.readthedocs.io/en/latest/video_compression.html#handbrake-for-mp4"
            openInNewTab
          />
        </li>
        <li>
          {{ $tr('largerStorageRequestPricing') }}
        </li>
      </ul>

      <KButton
        appearance="basic-link"
        :text="toggleText"
        data-test="toggle-link"
        @click="toggleRequestForm"
      />
      <KTransition kind="component-vertical-slide-out-in">
        <RequestForm
          v-show="showRequestForm"
          ref="requestform"
          @submitted="showRequestForm = false"
        />
      </KTransition>
    </div>
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import RequestForm from './RequestForm';
  import { fileSizeMixin, constantsTranslationMixin } from 'shared/mixins';
  import { ContentKindsList, ContentKindsNames } from 'shared/leUtils/ContentKinds';
  import theme from 'shared/vuetify/theme';
  import StudioLargeLoader from 'shared/views/StudioLargeLoader';

  export default {
    name: 'Storage',
    components: {
      RequestForm,
      StudioLargeLoader,
    },
    mixins: [fileSizeMixin, constantsTranslationMixin],
    data() {
      return {
        showRequestForm: false,
      };
    },
    computed: {
      ...mapGetters(['usedSpace', 'totalSpace', 'storageUseByKind']),
      contentKinds() {
        // Remove topic and h5p apps from the list
        const hiddenKinds = [ContentKindsNames.H5P, ContentKindsNames.TOPIC];
        return ContentKindsList.filter(k => !hiddenKinds.includes(k));
      },
      kindIcon() {
        return kind => {
          // KIcon doesn't have an icon for ZIM, so we use the HTML5 icon instead
          if (kind === ContentKindsNames.ZIM) {
            return ContentKindsNames.HTML5;
          }
          return kind;
        };
      },
      storageUsagePercentage() {
        // Math.round to fix ParseInt issues for really small divisions to force the float to int
        return Math.round((this.usedSpace / this.totalSpace) * 100);
      },
      theme() {
        return theme();
      },
      toggleText() {
        return this.showRequestForm ? this.$tr('hideFormAction') : this.$tr('showFormAction');
      },
    },
    methods: {
      toggleRequestForm() {
        this.showRequestForm = !this.showRequestForm;
        if (this.showRequestForm) {
          this.$nextTick(() => {
            this.$nextTick(() => {
              // Wait for the form to be visible
              // then scroll to the top of the form
              this.$refs.requestform.$el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
          });
        }
      },
    },
    $trs: {
      spaceUsedOfMax: '{qty} of {max}',
      storagePercentageUsed: '{qty}% storage used',
      requestMoreSpaceHeading: 'Request more space',
      requestMoreSpaceMessage:
        'Please use this form to request additional uploading storage for your Kolibri Studio account.',
      beforeRequestingHeading:
        'Before requesting additional storage space, please note the following:',
      beforeRequestingMessage:
        'The resources you import from our Kolibri Library to your channels do not count towards your storage limit.',
      learnMoreAboutImportingContentFromChannels:
        'Learn more about how to import resources from other channels.',
      videoFiles:
        'Video files should be compressed to maximize storage space and ensure smooth offline distribution and playback. Once compressed, the total storage required may be less than what you originally estimated.',
      learnMoreAboutVideoCompression: 'Learn more about how to compress video resources.',
      largerStorageRequestPricing:
        'For larger storage requests, there will be associated costs to help Learning Equality cover hosting, maintenance, and administrative expenses. We are happy to discuss possible rates based on your needs.',
      showFormAction: 'Open form',
      hideFormAction: 'Close form',
    },
  };

</script>


<style lang="scss" scoped>

  h2 {
    margin-top: 32px;
  }

  .row {
    padding: 16px 0;
  }

  ::v-deep .ui-progress-linear {
    max-width: 75%;
    height: 8px !important;
    margin: 8px 0;
    background: #e9e9e9;

    ::v-deep .is-determinate {
      height: 8px !important;
    }
  }

  .circular-loader {
    padding: 24px;
  }

  .storage-request {
    max-width: 800px;

    ul {
      margin-left: 20px;
      list-style-type: disc;
    }

    li {
      margin: 8px 0;
    }
  }

</style>
