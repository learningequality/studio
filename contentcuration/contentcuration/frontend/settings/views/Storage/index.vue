<template>

  <div>

    <p>
      <h2>{{ $tr('storagePercentageUsed', { qty: storageUsagePercentage.toString() }) }}</h2>
      <KLinearLoader :progress="storageUsagePercentage" type="determinate" class="loader" />
      <div>
        {{ 
          $tr('spaceUsedOfMax', 
            { qty: formatFileSize(usedSpace), max: formatFileSize(totalSpace) }
          )
        }}
      </div>
    </p>

    <KFixedGrid numCols="8" gutter="10">

      <!-- ContentKindsList returns lowercased strings for each kind -->
      <template v-for="kind in contentKinds">

        <KFixedGridItem :key="`${kind}1`" span="2" class="row">
          <span :style="{ backgroundColor: theme[kind], padding: '8px', marginRight: '8px' }">
            <KIcon :icon="kind" :color="$themeTokens.textInverted" />
          </span>

          <span>{{ translateConstant(kind) }}</span>
        </KFixedGridItem>

        <KFixedGridItem :key="`${kind}2`" span="6" class="row">
          <span>{{ formatFileSize(storageUseByKind[kind]) }}</span>
        </KFixedGridItem>

      </template>

    </KFixedGrid>

    <p>
      <h2>Request more space</h2>

      <p>

        <span>{{ $tr('requestMoreSpaceMessage') }}</span>

        <!-- Could be a KInternalLink if pushing to router, or a KExternalLink if to docs -->
        <KButton 
          appearance="basic-link" 
          style="display: inline;" 
          :text="$tr('learnMoreAboutImportingContentFromChannels')" 
          @click="() => console.log('toimplement')"
        />

      </p>

      <KButton 
        appearance="basic-link" 
        :text="showRequestForm ? 'Hide form' : 'Show form'" 
        @click="showRequestForm = !showRequestForm"
      />

    </p>

    <RequestForm v-if="showRequestForm" />

  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import { fileSizeMixin, constantsTranslationMixin } from 'shared/mixins';
  import { ContentKindsList } from 'shared/leUtils/ContentKinds';
  import theme from 'shared/vuetify/theme';
  import RequestForm from './RequestForm';

  export default {
    name: 'Storage',
    components: { RequestForm },
    mixins: [ fileSizeMixin, constantsTranslationMixin ],
    data() {
      return {
        showRequestForm: false,
      };
    },
    computed: {
      ...mapState(['session']),
      storageUseByKind() {
        return this.session.currentUser.space_used_by_kind;
      },
      contentKinds() {
        // Remove topic and h5p apps from the list
        return ContentKindsList.filter(k => !['h5p', 'topic'].includes(k));
      },
      totalSpace() {
        return this.session.currentUser.disk_space;
      },
      availableSpace() {
        return this.session.currentUser.available_space;
      },
      usedSpace() {
        return this.totalSpace - this.availableSpace;
      },
      storageUsagePercentage() {
        // parseInt to force the float to int
        return parseInt((this.usedSpace / this.totalSpace) * 100)
      },
      theme() {
        return theme();
      },
    },
    $trs: {
      spaceUsedOfMax: '{qty} of {max}',
      storagePercentageUsed: '{qty}% storage used',
      requestMoreSpaceHeading: 'Request more space',
      requestMoreSpaceMessage: 'Kindly use this form to request additional uploading storage for your Kolibri Studio account. If you import content from our public library in your channels, this content does not count towards your storage limit.',
      learnMoreAboutImportingContentFromChannels: 'Learn more about how to import content from other channels',
      showFormAction: 'Show form',
    },
  };

</script>


<style lang="scss" scoped>

  .row {
    padding: 16px 0;
  }

  /deep/.ui-progress-linear {
    max-width: 75%;
    height: 8px !important;
    margin: 8px 0;
    background: #e9e9e9;

    /deep/.is-determinate {
      height: 8px !important;
    }
  }

</style>
