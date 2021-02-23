<template>

  <VLayout row wrap @scroll="$emit('scroll', $event)">
    <VFlex xs12>
      <VLayout v-if="!hideNavigation" row>
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
      <ContentNodeIcon v-else :kind="node.kind" includeText />
    </VFlex>
    <LoadingText v-if="loading || !node" class="mt-4" />
    <VFlex v-else xs12 class="pb-5">
      <VLayout row align-center class="my-2">
        <h1 class="font-weight-bold notranslate text-truncate title">
          {{ node.title }}
        </h1>
        <VFlex class="px-1">
          <ContentNodeValidator :node="node" />
        </VFlex>
        <VSpacer />
        <!-- Slot for elements like edit button -->
        <VFlex shrink>
          <slot name="actions"></slot>
        </VFlex>
      </VLayout>
      <Tabs v-if="isExercise" slider-color="primary">
        <VTab class="px-2" :to="{ query: { tab: 'questions' } }" exact>
          {{ $tr('questions') }}
          <Icon v-if="invalidQuestions" color="red" small class="mx-2">
            error
          </Icon>
        </VTab>
        <VTab class="px-2" :to="{ query: { tab: 'details' } }" exact>
          {{ $tr('details') }}
          <Icon v-if="invalidDetails" color="red" small class="mx-2">
            error
          </Icon>
        </VTab>
      </Tabs>
      <VTabsItems :value="tab" @change="tab = $event">
        <VTabItem value="questions">
          <Banner
            :value="!assessmentItems.length"
            class="my-2"
            error
            :text="$tr('noQuestionsError')"
          />
          <Banner
            :value="Boolean(invalidQuestionCount)"
            class="my-2"
            error
            :text="$tr('incompleteQuestionError', { count: invalidQuestionCount })"
          />
          <VLayout v-if="assessmentItems.length" justify-space-between align-center class="my-3">
            <VFlex>
              <Checkbox v-model="showAnswers" :label="$tr('showAnswers')" class="ma-0" />
            </VFlex>
            <VFlex shrink class="px-2 subheading">
              {{ $tr('questionCount', { value: assessmentItems.length }) }}
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
            v-if="isResource && !isExercise && primaryFiles[0]"
            :nodeId="nodeId"
            :fileId="primaryFiles[0].id"
          />
          <VCard v-else-if="isResource && !isExercise" class="preview-error" flat>
            <VLayout align-center justify-center fill-height>
              <VTooltip bottom>
                <template #activator="{ on }">
                  <Icon color="red" v-on="on">
                    error
                  </Icon>
                </template>
                <span>{{ $tr('noFilesError') }}</span>
              </VTooltip>
            </VLayout>
          </VCard>

          <!-- Content details -->
          <DetailsRow
            v-if="isExercise"
            :label="$tr('questions')"
          >
            <span v-if="!assessmentItems.length" class="red--text">
              <Icon color="red" small>error</Icon>
              <span class="mx-1">{{ $tr('noQuestionsError') }}</span>
            </span>
            <span v-else>
              {{ $formatNumber(assessmentItems.length) }}
            </span>
          </DetailsRow>
          <DetailsRow
            v-if="isExercise"
            :label="$tr('masteryCriteria')"
          >
            <span v-if="noMasteryModel" class="red--text">
              <Icon color="red" small>error</Icon>
              <span class="mx-1">{{ $tr('noMasteryModelError') }}</span>
            </span>
            <span v-else>
              {{ masteryCriteria }}
            </span>
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
              <VList v-else dense class="mb-2 pa-0">
                <VListTile v-for="prerequisite in previousSteps" :key="prerequisite.id">
                  <VListTileContent>
                    <VListTileTitle :class="getTitleClass(prerequisite)">
                      <ContentNodeIcon :kind="prerequisite.kind" class="mr-2" />
                      {{ getTitle(prerequisite) }}
                    </VListTileTitle>
                  </VListTileContent>
                </VListTile>
              </VList>
            </DetailsRow>
            <DetailsRow :label="$tr('nextSteps')">
              <div v-if="!nextSteps.length">
                {{ defaultText }}
              </div>
              <VList v-else dense class="mb-2 pa-0">
                <VListTile v-for="postrequisite in nextSteps" :key="postrequisite.id">
                  <VListTileContent>
                    <VListTileTitle :class="getTitleClass(postrequisite)">
                      <ContentNodeIcon :kind="postrequisite.kind" class="mr-2" />
                      {{ getTitle(postrequisite) }}
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
            <DetailsRow v-if="isImported && importedChannelLink" :label="$tr('originalChannel')">
              <ActionLink
                :text="importedChannelName"
                :href="importedChannelLink"
                truncate
                notranslate
                target="_blank"
              />
            </DetailsRow>
            <DetailsRow :label="$tr('totalResources')">
              <p>
                {{ $formatNumber(node.resource_count) }}
              </p>
              <VList v-if="node.resource_count" dense class="mb-2 pa-0">
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
            <DetailsRow v-if="isImported && importedChannelLink" :label="$tr('originalChannel')">
              <ActionLink
                :text="importedChannelName"
                :href="importedChannelLink"
                truncate
                notranslate
                target="_blank"
              />
            </DetailsRow>
            <DetailsRow :label="$tr('author')" :text="getText('author')" notranslate />
            <DetailsRow :label="$tr('provider')" :text="getText('provider')" notranslate />
            <DetailsRow :label="$tr('aggregator')" :text="getText('aggregator')" notranslate />
            <DetailsRow :label="$tr('license')">
              <span v-if="noLicense" class="red--text">
                <Icon color="red" small>error</Icon>
                <span class="mx-1">{{ $tr('noLicenseError') }}</span>
              </span>
              <p v-else>
                {{ licenseName }}
              </p>
              <p v-if="noLicenseDescription" class="red--text">
                <Icon color="red" small>
                  error
                </Icon>
                <span class="mx-1">{{ $tr('noLicenseDescriptionError') }}</span>
              </p>
              <p v-else class="caption notranslate">
                {{ licenseDescription }}
              </p>
            </DetailsRow>
            <DetailsRow :label="$tr('copyrightHolder')">
              <span v-if="noCopyrightHolder" class="red--text">
                <Icon color="red" small>error</Icon>
                <span class="mx-1">{{ $tr('noCopyrightHolderError') }}</span>
              </span>
              <span v-else class="notranslate">
                {{ getText('copyright_holder') }}
              </span>
            </DetailsRow>

            <!-- Files section -->
            <template v-if="isResource && !isExercise">
              <div v-if="isResource" class="section-header">
                {{ $tr('files') }}
              </div>
              <DetailsRow :label="$tr('availableFormats')">
                <span v-if="!primaryFiles.length" class="red--text">
                  <Icon color="red" small>error</Icon>
                  <span class="mx-1">{{ $tr('noFilesError') }}</span>
                </span>
                <ExpandableList
                  v-else
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
          </template>
        </VTabItem>
      </VTabsItems>
    </VFlex>
  </VLayout>

</template>

<script>

  import sortBy from 'lodash/sortBy';
  import { mapActions, mapGetters } from 'vuex';
  import { isImportedContent, importedChannelLink } from '../utils';
  import FilePreview from '../views/files/FilePreview';
  import AssessmentItemPreview from './AssessmentItemPreview/AssessmentItemPreview';
  import ContentNodeValidator from './ContentNodeValidator';
  import {
    getAssessmentItemErrors,
    getNodeLicenseErrors,
    getNodeCopyrightHolderErrors,
    getNodeLicenseDescriptionErrors,
    getNodeMasteryModelErrors,
    getNodeMasteryModelMErrors,
    getNodeMasteryModelNErrors,
  } from 'shared/utils/validation';
  import ContentNodeIcon from 'shared/views/ContentNodeIcon';
  import LoadingText from 'shared/views/LoadingText';
  import DetailsRow from 'shared/views/details/DetailsRow';
  import ExpandableList from 'shared/views/ExpandableList';
  import Licenses from 'shared/leUtils/Licenses';
  import Checkbox from 'shared/views/form/Checkbox';
  import Banner from 'shared/views/Banner';
  import Tabs from 'shared/views/Tabs';
  import { constantsTranslationMixin, fileSizeMixin, titleMixin } from 'shared/mixins';
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
      ContentNodeValidator,
      Banner,
      Tabs,
    },
    mixins: [constantsTranslationMixin, fileSizeMixin, titleMixin],
    props: {
      nodeId: {
        type: String,
        required: true,
      },
      hideNavigation: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        loading: false,
        showAnswers: false,
      };
    },
    computed: {
      ...mapGetters('contentNode', [
        'getContentNode',
        'getImmediateNextStepsList',
        'getImmediatePreviousStepsList',
      ]),
      ...mapGetters('file', ['getContentNodeFiles', 'contentNodesTotalSize']),
      ...mapGetters('assessmentItem', ['getAssessmentItems']),
      node() {
        return this.getContentNode(this.nodeId);
      },
      files() {
        return sortBy(this.getContentNodeFiles(this.nodeId), f => f.preset.order);
      },
      tab: {
        set(value) {
          if (!this.isExercise) {
            return;
          }
          // If viewing an exercise, we need to synchronize the the route's
          // query params with the 'tab' value
          const newRoute = { query: { tab: value } };
          if (!this.$route.query.tab) {
            this.$router.replace(newRoute);
          } else {
            this.$router.push(newRoute);
          }
        },
        get() {
          if (!this.isExercise) {
            return 'details';
          }
          return this.$route.query.tab || 'questions';
        },
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
        return this.node && this.node.kind === ContentKindsNames.TOPIC;
      },
      isExercise() {
        return this.node && this.node.kind === ContentKindsNames.EXERCISE;
      },
      isResource() {
        return !this.isTopic && !this.isExercise;
      },
      isImported() {
        return isImportedContent(this.node);
      },
      importedChannelLink() {
        return importedChannelLink(this.node, this.$router);
      },
      importedChannelName() {
        return this.node.original_channel_name;
      },
      masteryCriteria() {
        if (!this.isExercise) {
          return '';
        }

        const masteryModel = this.node.extra_fields.mastery_model;
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
        return this.getImmediatePreviousStepsList(this.node.id);
      },
      nextSteps() {
        // TODO: Add in next steps once the data is available
        return this.getImmediateNextStepsList(this.node.id);
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

      /* VALIDATION */
      // License isn't specified
      noLicense() {
        return Boolean(!this.isTopic && getNodeLicenseErrors(this.node).length);
      },
      // Copyright holder isn't set on non-public domain licenses
      noCopyrightHolder() {
        return Boolean(!this.isTopic && getNodeCopyrightHolderErrors(this.node).length);
      },
      // License description isn't provided on special permissions licenses
      noLicenseDescription() {
        return Boolean(!this.isTopic && getNodeLicenseDescriptionErrors(this.node).length);
      },
      // Invalid mastery model
      noMasteryModel() {
        // We only validate mastery model on exercises
        if (this.isExercise) {
          return (
            getNodeMasteryModelErrors(this.node).length ||
            getNodeMasteryModelMErrors(this.node).length ||
            getNodeMasteryModelNErrors(this.node).length
          );
        } else {
          return false;
        }
      },
      invalidQuestionCount() {
        return (
          this.isExercise &&
          this.assessmentItems.filter(ai => getAssessmentItemErrors(ai).length).length
        );
      },
      invalidDetails() {
        return (
          this.noLicense ||
          this.noCopyrightHolder ||
          this.noLicenseDescription ||
          (!this.isExercise && !this.primaryFiles.length) ||
          (this.isExercise && (this.noMasteryModel || !this.assessmentItems.length))
        );
      },
      invalidQuestions() {
        return this.isExercise && (!this.assessmentItems.length || this.invalidQuestionCount);
      },
    },
    watch: {
      // Listen to node id specifically to avoid recursive call to watcher,
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
      ...mapActions('contentNode', ['loadRelatedResources']),
      ...mapActions('file', ['loadFiles']),
      ...mapActions('assessmentItem', ['loadNodeAssessmentItems']),
      getText(field) {
        return this.node[field] || this.defaultText;
      },
      loadNode() {
        // Load related models
        if (this.node) {
          let promises = [];
          promises.push(this.loadRelatedResources(this.nodeId));

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
      coachResources: 'Resources for coaches',
      files: 'Files',
      availableFormats: 'Available formats',
      subtitles: 'Captions and subtitles',
      fileSize: 'Size',

      // Validation strings
      noLicenseError: 'Missing license',
      noCopyrightHolderError: 'Missing copyright holder',
      noLicenseDescriptionError: 'Missing license description',
      noFilesError: 'Missing files',
      noMasteryModelError: 'Missing mastery criteria',
      noQuestionsError: 'Exercise is empty',
      incompleteQuestionError:
        '{count, plural, one {# incomplete question} other {# incomplete questions}}',
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
.preview-error {
  border: 1px solid var(--v-greyBackground-base) !important;
  padding: 24% 0px;
}
</style>
