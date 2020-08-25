<template>

  <VLayout row wrap>
    <VFlex xs12>
      <VLayout row>
        <VFlex v-if="!loading && node">
          <div class="mb-1">
            <!-- Slot for elements like "Back" link -->
            <slot name="navigation"></slot>
          </div>
          <ContentNodeIcon :kind="node.kind" includeText />
        </VFlex>
        <VSpacer />
        <VBtn
          icon
          flat
          small
          color="grey"
          class="ma-0"
          @click="$emit('close')"
        >
          <Icon>clear</Icon>
        </VBtn>
      </VLayout>
    </VFlex>
    <LoadingText v-if="loading || !node" class="mt-4" />
    <VFlex v-else xs12 class="pb-5">
      <VLayout row align-center class="my-2">
        <h1 class="notranslate title font-weight-bold">
          {{ node.title }}
        </h1>
        <VSpacer />
        <div>
          <!-- Slot for elements like edit button -->
          <slot name="actions"></slot>
        </div>
      </VLayout>
      <VTabs v-if="isExercise" slider-color="primary">
        <VTab class="px-2" @click="tab='questions'">
          {{ $tr('questions') }}
        </VTab>
        <VTab class="px-2" @click="tab='details'">
          {{ $tr('details') }}
        </VTab>
      </VTabs>
      <VTabsItems v-model="tab">
        <VTabItem value="questions">
          <p v-if="!assessmentItems.length" class="my-5 title grey--text text-xs-center">
            {{ $tr('noQuestionsFound') }}
          </p>
          <VLayout v-else justify-space-between align-center class="my-2">
            <VFlex>
              <Checkbox v-model="showAnswers" :label="$tr('showAnswers')" />
            </VFlex>
            <VFlex shrink class="px-2 subheading">
              {{ $tr('questionCount', {value: assessmentItems.length}) }}
            </VFlex>
          </VLayout>
          <VCard v-for="(item, index) in assessmentItems" :key="item.id" flat>
            <VCardText>
              <VLayout>
                <VFlex shrink class="py-2">
                  <div style="width: 64px;">
                    {{ index + 1 }}
                  </div>
                </VFlex>
                <VFlex>
                  <AssessmentItemPreview
                    :item="item"
                    :detailed="showAnswers"
                  />
                </VFlex>
              </VLayout>
            </VCardText>
            <VDivider v-if="index < assessmentItems.length - 1" />
          </VCard>
        </VTabItem>
        <VTabItem value="details">
          <!-- File preview -->
          <FilePreview
            v-if="isResource && primaryFiles[0]"
            :nodeId="nodeId"
            :fileId="primaryFiles[0].id"
          />

          <!-- Content details -->
          <DetailsRow
            v-if="isExercise"
            :label="$tr('questions')"
            :text="$formatNumber(node.assessment_items.length)"
          />
          <DetailsRow
            v-if="isExercise"
            :label="$tr('masteryCriteria')"
          >
            {{ masteryCriteria }}
          </DetailsRow>
          <DetailsRow :label="$tr('description')" :text="getText('description')" />
          <DetailsRow :label="$tr('tags')">
            <div v-if="!sortedTags.length">
              {{ defaultText }}
            </div>
            <VChip
              v-for="tag in sortedTags"
              v-else
              :key="tag"
              class="notranslate"
              color="grey lighten-4"
            >
              {{ tag }}
            </VChip>
          </DetailsRow>
          <DetailsRow v-if="isResource" :label="$tr('fileSize')" :text="formatFileSize(fileSize)" />

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
                {{ defaultText }}
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
                {{ defaultText }}
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

          <template v-if="isTopic">
            <!-- Resource section -->
            <div class="section-header">
              {{ $tr('resources') }}
            </div>
            <DetailsRow v-if="isImported" :label="$tr('originalChannel')">
              <ActionLink
                v-if="importedChannelLink"
                :text="node.original_channel_name"
                :to="importedChannelLink"
                target="_blank"
              />
            </DetailsRow>
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
            <!-- Source section -->
            <div class="section-header">
              {{ $tr('source') }}
            </div>
            <DetailsRow v-if="isImported" :label="$tr('originalChannel')">
              <ActionLink
                :text="node.original_channel_name"
                :href="importedChannelLink"
                target="_blank"
              />
            </DetailsRow>
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

            <!-- Files section -->
            <div v-if="isResource" class="section-header">
              {{ $tr('files') }}
            </div>
            <DetailsRow v-if="primaryFiles.length" :label="$tr('availableFormats')">
              <ExpandableList
                :noItemsText="defaultText"
                :items="availableFormats"
                inline
              />
            </DetailsRow>
            <DetailsRow v-if="node.kind === 'video'" :label="$tr('subtitles')">
              <ExpandableList
                :noItemsText="defaultText"
                :items="subtitleFileLanguages"
                inline
              />
            </DetailsRow>
          </template>
        </VTabItem>
      </VTabsItems>
    </VFlex>
  </VLayout>

</template>

<script>

  import sortBy from 'lodash/sortBy';
  import uniq from 'lodash/uniq';
  import { mapActions, mapGetters } from 'vuex';
  import { RouterNames } from '../constants';
  import AssessmentItemPreview from '../components/AssessmentItemPreview/AssessmentItemPreview';
  import FilePreview from './files/FilePreview';
  import ContentNodeIcon from 'shared/views/ContentNodeIcon';
  import LoadingText from 'shared/views/LoadingText';
  import DetailsRow from 'shared/views/details/DetailsRow';
  import ExpandableList from 'shared/views/ExpandableList';
  import Licenses from 'shared/leUtils/Licenses';
  import Checkbox from 'shared/views/form/Checkbox';
  import { constantsTranslationMixin, fileSizeMixin } from 'shared/mixins';
  import { MasteryModelsNames } from 'shared/leUtils/MasteryModels';
  import { ContentKindsNames } from 'shared/leUtils/ContentKinds';

  export default {
    name: 'ResourcePanel',
    components: {
      ContentNodeIcon,
      LoadingText,
      DetailsRow,
      FilePreview,
      ExpandableList,
      AssessmentItemPreview,
      Checkbox,
    },
    mixins: [constantsTranslationMixin, fileSizeMixin],
    props: {
      nodeId: {
        type: String,
        required: true,
      },
      channelId: {
        type: String,
        required: false,
      },
    },
    data() {
      return {
        loading: false,
        tab: 'details',
        showAnswers: false,
      };
    },
    computed: {
      ...mapGetters('contentNode', ['getContentNode', 'getContentNodes']),
      ...mapGetters('file', ['getContentNodeFiles', 'contentNodesTotalSize']),
      ...mapGetters('assessmentItem', ['getAssessmentItems']),
      node() {
        return this.getContentNode(this.nodeId);
      },
      files() {
        return sortBy(this.getContentNodeFiles(this.nodeId), f => f.preset.order);
      },
      defaultText() {
        return '-';
      },
      assessmentItems() {
        return this.getAssessmentItems(this.nodeId);
      },
      fileSize() {
        return this.contentNodesTotalSize([this.nodeId]);
      },
      isTopic() {
        return this.node.kind === ContentKindsNames.TOPIC;
      },
      isExercise() {
        return this.node.kind === ContentKindsNames.EXERCISE;
      },
      isResource() {
        return !this.isTopic && !this.isExercise;
      },
      isImported() {
        return this.node.original_channel_id !== this.channelId;
      },
      importedChannelLink() {
        if (this.node.original_node_id) {
          // TODO: Eventually, update with this.node.original_source_node_id for correct path
          const clientPath = this.$router.resolve({
            name: RouterNames.TREE_VIEW,
            params: {
              nodeId: this.node.original_parent_id,
              detailNodeId: this.node.original_node_id,
            },
          });
          return `/channels/${this.node.original_channel_id}/${clientPath.href}`;
        }
        return null;
      },
      masteryCriteria() {
        if (!this.isExercise) {
          return '';
        }

        const masteryModel = this.node.extra_fields.type || this.node.extra_fields.mastery_model;
        if (!masteryModel) {
          return this.defaultText;
        } else if (masteryModel === MasteryModelsNames.M_OF_N) {
          return this.$tr('masteryMofN', this.node.extra_fields);
        }
        return this.translateConstant(masteryModel);
      },
      sortedTags() {
        return sortBy(this.node.tags, '-count');
      },
      license() {
        return Licenses.get(this.node.license);
      },
      languageName() {
        return this.translateLanguage(this.node.language) || this.defaultText;
      },
      licenseDescription() {
        return (
          this.license &&
          (this.license.is_custom
            ? this.node.license_description
            : this.translateConstant(this.license.license_name + '_description'))
        );
      },
      licenseName() {
        return (
          (this.license && this.translateConstant(this.license.license_name)) || this.defaultText
        );
      },
      roleName() {
        return this.translateConstant(this.node.role_visibility) || this.defaultText;
      },
      previousSteps() {
        return this.getContentNodes(uniq(this.node.prerequisite));
      },
      nextSteps() {
        // TODO: Add in next steps once the data is available
        return this.getContentNodes(uniq(this.node.prerequisite_of));
      },
      kindCount() {
        // TODO: Add in kind counts once the data is available
        return [];
      },
      primaryFiles() {
        return this.files.filter(f => !f.preset.supplementary);
      },
      availableFormats() {
        return this.primaryFiles.map(f => this.translateConstant(f.preset.id));
      },
      subtitleFileLanguages() {
        return this.files.filter(f => f.preset.subtitle).map(f => f.language.native_name);
      },
    },
    watch: {
      // Listen to node id specifically to avoid recursvie call to watcher,
      // but still get updated properly if need to wait for node to be loaded
      'node.id'() {
        this.showAnswers = false;
        this.loadNode();
        this.tab = this.isExercise ? 'questions' : 'details';
      },
    },
    mounted() {
      this.loadNode();
      this.tab = this.isExercise ? 'questions' : 'details';
    },
    methods: {
      ...mapActions('contentNode', ['loadContentNodes']),
      ...mapActions('file', ['loadFiles']),
      ...mapActions('assessmentItem', ['loadNodeAssessmentItems']),
      getText(field) {
        return this.node[field] || this.defaultText;
      },
      loadNode() {
        // Load related models
        if (this.node) {
          let promises = [];
          if (this.node.prerequisite.length) {
            promises.push(this.loadContentNodes({ id__in: this.node.prerequisite }));
          }

          if (this.isResource) {
            promises.push(this.loadFiles({ contentnode: this.nodeId }));
          }

          if (this.isExercise) {
            promises.push(this.loadNodeAssessmentItems(this.nodeId));
          }

          if (promises.length) {
            this.loading = true;
            Promise.all(promises).then(() => {
              this.loading = false;
            });
          }
        }
      },
    },
    $trs: {
      questions: 'Questions',
      masteryCriteria: 'Mastery criteria',
      masteryMofN: '{m} out of {n}',
      details: 'Details',
      showAnswers: 'Show answers',
      questionCount: '{value, number, integer} {value, plural, one {question} other {questions}}',
      noQuestionsFound: 'There are no questions',
      description: 'Description',
      tags: 'Tags',
      audience: 'Audience',
      language: 'Language',
      visibleTo: 'Visible to',
      relatedResources: 'Related resources',
      source: 'Source',
      originalChannel: 'Imported from',
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
      files: 'Files',
      availableFormats: 'Available formats',
      subtitles: 'Subtitles',
      fileSize: 'Size',
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
