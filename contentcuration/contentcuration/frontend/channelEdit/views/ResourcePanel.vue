<template>

  <VLayout>
    <div v-if="loading">
      <LoadingText />
    </div>
    <VFlex v-else xs12>
      <VLayout row>
        <VFlex>
          <div class="mb-1">
            <!-- Slot for elements like "Back" link -->
            <slot name="navigation"></slot>
          </div>
          <ContentNodeIcon :kind="node.kind" includeText />
        </VFlex>
        <VSpacer />
        <VBtn icon flat small color="grey" class="ma-0">
          <Icon>clear</Icon>
        </VBtn>
      </VLayout>
      <VLayout row class="my-4">
        <h1 class="notranslate title font-weight-bold">
          {{ node.title }}
        </h1>
        <VSpacer />
        <div>
          <!-- Slot for elements like edit button -->
          <slot name="actions"></slot>
        </div>
      </VLayout>

      <!-- Temporary placeholder for file preview -->
      <VCard v-if="isResource" color="grey lighten-2" flat class="my-4">
        <VContainer style="height: 200px;">
          <VLayout align-center justify-center fill-height>
            <div>
              (File preview coming soon)
            </div>
          </VLayout>
        </VContainer>
      </VCard>

      <!-- Content details -->
      <DetailsRow
        v-if="isExercise"
        :label="$tr('questions')"
        :text="$formatNumber(node.assessment_items.length)"
      />
      <DetailsRow :label="$tr('description')" :text="getText('description')" />
      <DetailsRow :label="$tr('tags')">
        <div v-if="!sortedTags.length">
          {{ $tr('defaultNoItemsText') }}
        </div>
        <VChip
          v-for="tag in sortedTags"
          v-else
          :key="tag.tag_name"
          color="grey lighten-2"
        >
          {{ tag.tag_name }}
        </VChip>
      </DetailsRow>

      <!-- Audience section -->
      <div class="section-header">
        {{ $tr('audience') }}
      </div>
      <DetailsRow :label="$tr('language')" :text="languageName" />
      <DetailsRow v-if="!isTopic" :label="$tr('visibleTo')" :text="roleName" />

      <!-- Related resources section -->
      <template v-if="!isTopic">
        <div class="section-header">
          {{ $tr('relatedResources') }}
        </div>
        <DetailsRow :label="$tr('previousSteps')">
          <div v-if="!previousSteps.length">
            {{ $tr('defaultNoItemsText') }}
          </div>
          <VList v-else dense class="pa-0 mb-2">
            <VListTile v-for="prerequisite in previousSteps" :key="prerequisite.id">
              <VListTileContent>
                <VListTileTitle class="notranslate">
                  <ContentNodeIcon :kind="prerequisite.kind" class="mr-2" />
                  {{ prerequisite.title }}
                </VListTileTitle>
              </VListTileContent>
            </VListTile>
          </VList>
        </DetailsRow>
        <DetailsRow :label="$tr('nextSteps')">
          <div v-if="!nextSteps.length">
            {{ $tr('defaultNoItemsText') }}
          </div>
          <VList v-else dense class="pa-0 mb-2">
            <VListTile v-for="postrequisite in nextSteps" :key="postrequisite.id">
              <VListTileContent>
                <VListTileTitle class="notranslate">
                  <ContentNodeIcon :kind="postrequisite.kind" class="mr-2" />
                  {{ postrequisite.title }}
                </VListTileTitle>
              </VListTileContent>
            </VListTile>
          </VList>
        </DetailsRow>
      </template>

      <!-- Source section -->
      <template v-if="isTopic">
        <div class="section-header">
          {{ $tr('resources') }}
        </div>
        <DetailsRow :label="$tr('totalResources')">
          <p>
            {{ $formatNumber(node.resource_count) }}
          </p>
          <VList v-if="node.resource_count" dense class="pa-0 mb-2">
            <VListTile v-for="kind in kindCount" :key="kind.kind">
              <VListTileContent>
                <VListTileTitle>
                  <ContentNodeIcon :kind="kind.kind" class="mr-2" />
                </VListTileTitle>
              </VListTileContent>
            </VListTile>
          </VList>
        </DetailsRow>
        <DetailsRow :label="$tr('coachResources')" :text="$formatNumber(node.coach_count)" />
      </template>
      <template v-else>
        <div class="section-header">
          {{ $tr('source') }}
        </div>
        <DetailsRow :label="$tr('author')" :text="getText('author')" />
        <DetailsRow :label="$tr('provider')" :text="getText('provider')" />
        <DetailsRow :label="$tr('aggregator')" :text="getText('aggregator')" />
        <DetailsRow :label="$tr('license')">
          <p>{{ licenseName }}</p>
          <p class="caption">
            {{ licenseDescription }}
          </p>
        </DetailsRow>
        <DetailsRow :label="$tr('copyrightHolder')" :text="getText('copyright_holder')" />
      </template>
    </VFlex>
  </VLayout>

</template>

<script>

  import sortBy from 'lodash/sortBy';
  import { mapActions, mapGetters } from 'vuex';
  import ContentNodeIcon from 'shared/views/ContentNodeIcon';
  import LoadingText from 'shared/views/LoadingText';
  import DetailsRow from 'shared/views/details/DetailsRow';
  import Constants from 'edit_channel/constants/index';
  import { constantsTranslationMixin } from 'shared/mixins';

  export default {
    name: 'ResourcePanel',
    components: {
      ContentNodeIcon,
      LoadingText,
      DetailsRow,
    },
    mixins: [constantsTranslationMixin],
    props: {
      nodeId: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        loading: false,
      };
    },
    computed: {
      ...mapGetters('contentNode', ['getContentNode', 'getContentNodes']),
      node() {
        return this.getContentNode(this.nodeId);
      },
      isTopic() {
        return this.node.kind === 'topic';
      },
      isExercise() {
        return this.node.kind === 'exercise';
      },
      isResource() {
        return !this.isTopic && !this.isExercise;
      },
      sortedTags() {
        return sortBy(this.node.tags, '-count');
      },
      license() {
        return Constants.Licenses.find(l => l.id === this.node.license);
      },
      languageName() {
        return this.translateLanguage(this.node.language) || this.$tr('defaultNoItemsText');
      },
      licenseDescription() {
        return this.license.is_custom
          ? this.node.license_description
          : this.translateConstant(this.license.license_name + '_description');
      },
      licenseName() {
        return this.translateConstant(this.license.license_name) || this.$tr('defaultNoItemsText');
      },
      roleName() {
        return this.translateConstant(this.node.role_visibility) || this.$tr('defaultNoItemsText');
      },
      previousSteps() {
        return this.getContentNodes(this.node.prerequisite);
      },
      nextSteps() {
        // TODO: Add in next steps once the data is available
        return [];
      },
      kindCount() {
        // TODO: Add in kind counts once the data is available
        return [];
      },
    },
    mounted() {
      // Load related models
      if (this.node.prerequisite.length) {
        this.loading = true;
        this.loadContentNodes({ ids: this.node.prerequisite }).then(() => {
          this.loading = false;
        });
      }
    },
    methods: {
      ...mapActions('contentNode', ['loadContentNodes']),
      getText(field) {
        return this.node[field] || this.$tr('defaultNoItemsText');
      },
    },
    $trs: {
      questions: 'Questions',
      description: 'Description',
      tags: 'Tags',
      defaultNoItemsText: '-',
      audience: 'Audience',
      language: 'Language',
      visibleTo: 'Visible to',
      relatedResources: 'Related resources',
      source: 'Source',
      author: 'Author',
      provider: 'Provider',
      aggregator: 'Aggregator',
      license: 'License',
      copyrightHolder: 'Copyright holder',
      previousSteps: 'Previous steps',
      nextSteps: 'Next steps',
      resources: 'Resources',
      totalResources: 'Total resources',
      coachResources: 'Coach resources',
    },
  };

</script>

<style scoped>
.section-header {
  font-size: 9pt;
  margin-top: 32px;
  color: grey;
}
/deep/ .v-list__tile {
  padding: 0px;
}
</style>
