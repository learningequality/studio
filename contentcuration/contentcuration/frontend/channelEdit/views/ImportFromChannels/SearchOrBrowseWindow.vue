<template>

  <ImportFromChannelsModal @submitRecommendationsFeedback="submitRecommendationsFeedback">
    <template #default="{ preview }">
      <KGrid :class="$computedClass(browseWindowStyle)">
        <!-- Back to browse button -->
        <KGridItem
          :layout12="{ span: 12 }"
          :layout8="{ span: 8 }"
          :layout4="{ span: 4 }"
        >
          <div
            v-if="!isBrowsing"
            class="my-2"
          >
            <ActionLink
              :text="$tr('backToBrowseAction')"
              @click="handleBackToBrowse"
            />
          </div>
        </KGridItem>

        <!-- Main panel >= 800px -->
        <KGridItem
          :layout12="{ span: shouldShowRecommendations && layoutFitsTwoColumns ? 8 : 12 }"
          :layout8="{ span: 8 }"
          :layout4="{ span: 4 }"
        >
          <!-- Search bar -->
          <VForm
            ref="search"
            @submit.prevent="handleSearchTerm"
          >
            <VTextField
              v-model="searchTerm"
              class="searchtext"
              color="primary"
              :label="$tr('searchLabel')"
              box
              clearable
              hideDetails
            >
              <template #prepend-inner>
                <Icon icon="search" />
              </template>
              <template #append-outer>
                <VBtn
                  class="px-4 search-btn"
                  color="primary"
                  type="submit"
                  :disabled="!searchIsValid"
                  depressed
                  large
                >
                  {{ $tr('searchAction') }}
                </VBtn>
              </template>
            </VTextField>
          </VForm>

          <div
            v-if="!isBrowsing"
            class="my-2 px-2"
          >
            <ActionLink
              class="mb-3"
              :text="$tr('savedSearchesLabel')"
              :disabled="!savedSearchesExist"
              @click="showSavedSearches = true"
            />
          </div>
          <!-- Search or Topics Browsing -->
          <ChannelList
            v-if="isBrowsing && !$route.params.channelId"
            @update-language="updateLanguageQuery"
          />
          <ContentTreeList
            v-else-if="isBrowsing"
            ref="contentTreeList"
            :topicNode="topicNode"
            :selected.sync="selected"
            :topicId="topicId"
            @preview="preview($event)"
            @change_selected="handleChangeSelected"
            @copy_to_clipboard="handleCopyToClipboard"
          />
          <SearchResultsList
            v-else
            :selected.sync="selected"
            @preview="preview($event)"
            @change_selected="handleChangeSelected"
            @copy_to_clipboard="handleCopyToClipboard"
          />
        </KGridItem>

        <!-- Recommended resources panel >= 400px -->
        <KGridItem
          v-if="shouldShowRecommendations"
          :layout12="{ span: layoutFitsTwoColumns ? 4 : 12 }"
          :layout8="{ span: 8 }"
          :layout4="{ span: 4 }"
        >
          <h3 class="pb-2 pt-0 px-2">
            {{ recommendationsSectionTitle }}
          </h3>
          <div class="my-3 px-2">
            <ActionLink
              :text="aboutRecommendationsText$()"
              @click="handleAboutRecommendations"
            />
          </div>

          <div class="ml-1">
            <KCardGrid layout="1-1-1">
              <RecommendedResourceCard
                v-for="recommendation in displayedRecommendations"
                :key="recommendation.id"
                :node="recommendation"
                @change_selected="handleChangeSelected"
                @preview="node => handlePreviewRecommendation(preview, node)"
                @irrelevant="handleNotRelevantRecommendation"
              />
            </KCardGrid>
          </div>
          <div
            v-if="recommendationsLoading"
            class="recommendations-loader"
          >
            <KCircularLoader :shouldShow="recommendationsLoading" />
          </div>
          <div v-else-if="!recommendationsLoading">
            <p
              v-if="loadMoreRecommendationsText.description"
              class="pb-0 pt-4 px-2"
            >
              {{ loadMoreRecommendationsText.description }}
            </p>
            <div
              v-if="loadMoreRecommendationsText.link"
              class="my-3 px-2"
            >
              <ActionLink
                :text="loadMoreRecommendationsText.link"
                @click="handleViewMoreRecommendations"
              />
            </div>
          </div>
          <div v-else-if="recommendationsLoadingError">
            <p class="pb-0 pt-4 px-2">
              {{ loadMoreRecommendationsText.description }}
            </p>
            <div class="my-3 px-2">
              <ActionLink
                :text="loadMoreRecommendationsText.link"
                @click="handleViewMoreRecommendations"
              />
            </div>
          </div>
        </KGridItem>
      </KGrid>
      <SavedSearchesModal v-model="showSavedSearches" />
      <!-- About Recommendations Modal -->
      <KModal
        v-if="showAboutRecommendations"
        :title="aboutRecommendationsText$()"
        :cancelText="closeAction$()"
        @cancel="closeAboutRecommendations"
      >
        <p class="pb-2">
          {{ aboutRecommendationsDescription$() }}
        </p>
        <p>
          {{ aboutRecommendationsFeedbackDescription$() }}
        </p>
      </KModal>
      <KModal
        v-if="showFeedbackModal"
        :title="giveFeedbackText$()"
        :cancelText="cancelAction$()"
        :submitText="submitAction$()"
        @submit="submitRejectedRecommendationFeedback"
        @cancel="closeGiveFeedbackModal"
      >
        <p>{{ giveFeedbackDescription$() }}</p>
        <p
          v-if="showFeedbackErrorMessage"
          class="feedback-form-error"
          :style="{ color: $themeTokens.error, backgroundColor: $themePalette.red.v_100 }"
        >
          <KLabeledIcon
            icon="error"
            :label="noFeedbackSelectedErrorMessage$()"
            :color="$themeTokens.error"
          />
        </p>
        <KCheckbox
          v-for="option in feedbackCheckboxOptions"
          :key="option.value"
          :label="option.label"
          :checked="isFeedbackReasonSelected(option.value)"
          class="feedback-options"
          @change="value => handleFeedbackCheckboxChange(option.value, value)"
        />

        <KTextbox
          v-if="isFeedbackReasonSelected('other')"
          v-model="otherFeedback"
          autofocus
          :label="enterFeedbackLabel$()"
          :textArea="true"
          :invalid="showOtherFeedbackInvalidText"
          :invalidText="feedbackInputValidationMessage$()"
          :showInvalidText="showOtherFeedbackInvalidText"
        />
      </KModal>
    </template>
  </ImportFromChannelsModal>

</template>


<script>

  import { mapActions, mapGetters, mapMutations, mapState } from 'vuex';
  import { computed } from 'vue';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { SCHEMA } from 'kolibri-constants/EmbedTopicsRequest';
  import { RouteNames } from '../../constants';
  import ChannelList from './ChannelList';
  import ContentTreeList from './ContentTreeList';
  import SearchResultsList from './SearchResultsList';
  import SavedSearchesModal from './SavedSearchesModal';
  import ImportFromChannelsModal from './ImportFromChannelsModal';
  import logging from 'shared/logging';
  import RecommendedResourceCard from 'shared/views/RecommendedResourceCard';
  import { withChangeTracker } from 'shared/data/changes';
  import { formatUUID4 } from 'shared/data/resources';
  import {
    RecommendationsEvent,
    RecommendationsInteractionEvent,
    FeedbackTypeOptions,
    sendRequest,
  } from 'shared/feedbackApiUtils';
  import { searchRecommendationsStrings } from 'shared/strings/searchRecommendationsStrings';
  import { compile } from 'shared/utils/jsonSchema';

  const validateEmbedTopicRequest = compile(SCHEMA);

  export default {
    name: 'SearchOrBrowseWindow',
    components: {
      ImportFromChannelsModal,
      ContentTreeList,
      SearchResultsList,
      ChannelList,
      SavedSearchesModal,
      RecommendedResourceCard,
    },
    setup() {
      const { windowWidth } = useKResponsiveWindow();

      const {
        otherLabel$,
        closeAction$,
        cancelAction$,
        submitAction$,
        tryAgainLink$,
        viewMoreLink$,
        giveFeedbackText$,
        enterFeedbackLabel$,
        feedbackFailedMessage$,
        noDirectMatchesMessage$,
        showOtherResourcesLink$,
        giveFeedbackDescription$,
        aboutRecommendationsText$,
        alreadyUsedResourceLabel$,
        feedbackSubmittedMessage$,
        notRelatedToSubjectLabel$,
        resourceNotWellMadeLabel$,
        tooBasicForLearnersLabel$,
        showOtherResourcesMessage$,
        feedbackConfirmationMessage$,
        tooAdvancedForLearnersLabel$,
        showOtherRecommendationsLink$,
        notSuitableForCurriculumLabel$,
        resourcesMightBeRelevantTitle$,
        feedbackInputValidationMessage$,
        noFeedbackSelectedErrorMessage$,
        problemShowingResourcesMessage$,
        aboutRecommendationsDescription$,
        notSpecificLearningActivityLabel$,
        notSuitableForCulturalBackgroundLabel$,
        aboutRecommendationsFeedbackDescription$,
      } = searchRecommendationsStrings;

      const layoutFitsTwoColumns = computed(function () {
        return windowWidth.value >= 960;
      });

      return {
        otherLabel$,
        closeAction$,
        cancelAction$,
        submitAction$,
        tryAgainLink$,
        viewMoreLink$,
        giveFeedbackText$,
        enterFeedbackLabel$,
        feedbackFailedMessage$,
        noDirectMatchesMessage$,
        showOtherResourcesLink$,
        giveFeedbackDescription$,
        aboutRecommendationsText$,
        alreadyUsedResourceLabel$,
        feedbackSubmittedMessage$,
        notRelatedToSubjectLabel$,
        resourceNotWellMadeLabel$,
        tooBasicForLearnersLabel$,
        showOtherResourcesMessage$,
        feedbackConfirmationMessage$,
        tooAdvancedForLearnersLabel$,
        showOtherRecommendationsLink$,
        notSuitableForCurriculumLabel$,
        resourcesMightBeRelevantTitle$,
        feedbackInputValidationMessage$,
        noFeedbackSelectedErrorMessage$,
        problemShowingResourcesMessage$,
        aboutRecommendationsDescription$,
        notSpecificLearningActivityLabel$,
        notSuitableForCulturalBackgroundLabel$,
        aboutRecommendationsFeedbackDescription$,
        layoutFitsTwoColumns,
      };
    },
    data() {
      return {
        searchTerm: '',
        topicNode: null,
        copyNode: null,
        languageFromChannelList: null,
        showSavedSearches: false,
        showAboutRecommendations: false,
        recommendations: [],
        otherRecommendations: [],
        displayedRecommendations: [],
        recommendationsLoading: false,
        recommendationsLoadingError: false,
        recommendationsPageSize: 10,
        recommendationsCurrentIndex: 0,
        recommendationsBelowThreshold: false,
        showNoDirectMatches: false,
        showShowOtherResources: false,
        showViewMoreRecommendations: false,
        otherRecommendationsLoaded: false,
        recommendationsEvent: null,
        feedbackReason: [],
        showFeedbackModal: false,
        otherFeedback: '',
        showOtherFeedbackInvalidText: false,
        rejectedNodeIds: [],
        previewedNodeIds: [],
        rejectedNode: null,
        showFeedbackErrorMessage: false,
      };
    },
    computed: {
      ...mapGetters('contentNode', ['getContentNodeAncestors']),
      ...mapGetters('currentChannel', ['currentChannel']),
      ...mapGetters('importFromChannels', ['savedSearchesExist']),
      ...mapGetters(['isAIFeatureEnabled']),
      ...mapState('importFromChannels', ['selected']),
      isBrowsing() {
        return this.$route.name === RouteNames.IMPORT_FROM_CHANNELS_BROWSE;
      },
      backToBrowseRoute() {
        const query = {
          channel_list: this.$route.query.channel_list,
        };
        if (this.$route.query.last) {
          return { path: this.$route.query.last, query };
        }
        return {
          name: RouteNames.IMPORT_FROM_CHANNELS_BROWSE,
          query,
        };
      },
      searchIsValid() {
        return (
          (this.searchTerm || '').trim().length > 0 &&
          this.searchTerm.trim() !== this.$route.params.searchTerm
        );
      },
      shouldShowRecommendations() {
        if (!this.isAIFeatureEnabled) {
          return false;
        }

        if (!validateEmbedTopicRequest(this.embedTopicRequest)) {
          // log to sentry-- this is unexpected, since we use the channel's language as a fallback
          // and channels are required to have a language
          logging.error(
            new Error(
              'Recommendation request is invalid: ' +
                JSON.stringify(
                  validateEmbedTopicRequest.errors.map(err => {
                    return `${err.instancePath}: ${err.message}`;
                  }),
                ),
            ),
          );
          return false;
        }

        return true;
      },
      loadMoreRecommendationsText() {
        let link = null;
        let description = null;

        if (!this.recommendationsLoadingError) {
          if (this.showNoDirectMatches) {
            link = this.showOtherRecommendationsLink$();
            description = this.noDirectMatchesMessage$();
          } else if (this.showViewMoreRecommendations) {
            link = this.viewMoreLink$();
            description = null;
          } else if (this.showShowOtherResources) {
            link = this.showOtherResourcesLink$();
            description = this.showOtherResourcesMessage$();
          }
        } else {
          link = this.tryAgainLink$();
          description = this.problemShowingResourcesMessage$();
        }

        return {
          link,
          description,
        };
      },
      shouldLoadOtherRecommendations() {
        return (
          (this.showNoDirectMatches || this.showShowOtherResources) &&
          !this.otherRecommendationsLoaded
        );
      },
      moreRecommendationsAvailable() {
        const displayCount = this.displayedRecommendations.length;
        const totalCount = this.recommendations.length + this.otherRecommendations.length;
        return displayCount < totalCount;
      },
      browseWindowStyle() {
        return {
          maxWidth: this.shouldShowRecommendations ? '1200px' : '800px',
        };
      },
      topicId() {
        return this.$route.params.destNodeId;
      },
      recommendationsSectionTitle() {
        return this.resourcesMightBeRelevantTitle$({
          topic: this.importDestinationTitle,
        });
      },
      topicAncestors() {
        const ancestors = this.importDestinationAncestors.slice(0, -1);
        return ancestors.map((ancestor, index) => {
          return {
            id: formatUUID4(ancestor.id),
            title: ancestor.title,
            description: ancestor.description,
            language: this.recommendationsLanguage,
            level: index,
          };
        });
      },
      embedTopicRequest() {
        return {
          topics: [
            {
              id: formatUUID4(this.importDestinationFolder.id),
              title: this.importDestinationFolder.title,
              description: this.importDestinationFolder.description,
              language: this.recommendationsLanguage,
              ancestors: this.topicAncestors,
              channel_id: formatUUID4(this.importDestinationFolder.channel_id),
            },
          ],
        };
      },
      importDestinationAncestors() {
        return this.getContentNodeAncestors(this.topicId, true);
      },
      importDestinationFolder() {
        return this.importDestinationAncestors.slice(-1)[0];
      },
      importDestinationTitle() {
        return this.importDestinationFolder?.title || '';
      },
      recommendationsLanguage() {
        // Find the closest non-(null/empty) language in the ancestral tree
        for (let i = this.importDestinationAncestors.length - 1; i >= 0; i--) {
          const ancestor = this.importDestinationAncestors[i];
          if (ancestor.language) {
            return ancestor.language;
          }
        }
        return this.currentChannel?.language || '';
      },
      feedbackCheckboxOptions() {
        return [
          {
            value: 'not_suitable_for_curriculum',
            label: this.notSuitableForCurriculumLabel$(),
          },
          {
            value: 'not_related',
            label: this.notRelatedToSubjectLabel$(),
          },
          {
            value: 'not_suitable_for_culture',
            label: this.notSuitableForCulturalBackgroundLabel$(),
          },
          {
            value: 'not_specific',
            label: this.notSpecificLearningActivityLabel$(),
          },
          {
            value: 'too_advanced',
            label: this.tooAdvancedForLearnersLabel$(),
          },
          {
            value: 'too_basic',
            label: this.tooBasicForLearnersLabel$(),
          },
          {
            value: 'not_well_made',
            label: this.resourceNotWellMadeLabel$(),
          },
          {
            value: 'already_used',
            label: this.alreadyUsedResourceLabel$(),
          },
          {
            value: 'other',
            label: this.otherLabel$(),
          },
        ];
      },
      recommendationsFeedback() {
        return this.feedbackCheckboxOptions
          .filter(option => this.feedbackReason.includes(option.value))
          .map(option => option.label)
          .join(', ');
      },
      userId() {
        return this.$store.state.session.currentUser.id;
      },
      isOtherFeedbackValid() {
        return (
          !this.isFeedbackReasonSelected('other') ||
          (this.isFeedbackReasonSelected('other') && Boolean(this.otherFeedback.trim()))
        );
      },
      ignoredRecommendations() {
        const rejectedAndPreviewedIds = new Set([
          ...this.rejectedNodeIds,
          ...this.previewedNodeIds,
        ]);
        const allRecommendations = [...this.recommendations, ...this.otherRecommendations];
        return allRecommendations.filter(node => !rejectedAndPreviewedIds.has(node.id));
      },
      isAnyFeedbackReasonSelected() {
        return this.feedbackReason.length > 0;
      },
      validateFeedbackForm() {
        return this.isAnyFeedbackReasonSelected && this.isOtherFeedbackValid;
      },
    },
    beforeRouteEnter(to, from, next) {
      next(vm => {
        vm.searchTerm = to.params.searchTerm || '';
        vm.showSavedSearches = false;
      });
    },
    beforeRouteUpdate(to, from, next) {
      this.searchTerm = to.params.searchTerm || '';
      this.showSavedSearches = false;
      next();
    },
    beforeRouteLeave(to, from, next) {
      // Clear selections if going back to TreeView
      if (to.name === RouteNames.TREE_VIEW) {
        this.$store.commit('importFromChannels/CLEAR_NODES');
      }
      next();
    },
    mounted() {
      this.searchTerm = this.$route.params.searchTerm || '';
      this.loadRecommendations(this.recommendationsBelowThreshold);
    },
    methods: {
      ...mapActions(['showSnackbar']),
      ...mapActions('clipboard', ['copy']),
      ...mapActions('contentNode', ['loadPublicContentNode']),
      ...mapActions('importFromChannels', ['fetchRecommendations']),
      ...mapMutations('importFromChannels', {
        selectNodes: 'SELECT_NODES',
        deselectNodes: 'DESELECT_NODES',
        clearNodes: 'CLEAR_NODES',
      }),
      handleBackToBrowse() {
        this.$router.push(this.backToBrowseRoute);
      },
      updateLanguageQuery(language) {
        this.languageFromChannelList = language;
      },
      handleSearchTerm() {
        if (this.searchIsValid) {
          this.$router.push({
            name: RouteNames.IMPORT_FROM_CHANNELS_SEARCH,
            params: {
              searchTerm: this.searchTerm.trim(),
            },
            query: {
              ...this.$route.query,
              ...(this.isBrowsing ? { languages: this.languageFromChannelList } : {}),
              last: this.$route.query.last || this.$route.path,
              page: 1,
            },
          });
          this.languageFromChannelList = null;
          this.clearNodes();
          this.$analytics.trackAction('import_modal', 'Search');
        }
      },
      handleChangeSelected({ isSelected, nodes }) {
        if (isSelected) {
          this.selectNodes(nodes);
        } else {
          this.deselectNodes(nodes);
        }
      },
      handleCopyToClipboard(node) {
        this.copyNode = node;
        return this.copyToClipboard();
      },
      copyToClipboard: withChangeTracker(function (changeTracker) {
        return this.copy({ node_id: this.copyNode.node_id, channel_id: this.copyNode.channel_id })
          .then(() => {
            this.$store
              .dispatch('showSnackbar', {
                text: this.$tr('copiedToClipboard'),
                // TODO: implement revert functionality for clipboard
                // actionText: this.$tr('undo'),
                // actionCallback: () => changeTracker.revert(),
              })
              .then(() => changeTracker.cleanUp());
          })
          .catch(error => {
            this.$store.dispatch('showSnackbarSimple', this.$tr('copyFailed'));
            throw error;
          });
      }),
      handleAboutRecommendations() {
        this.showAboutRecommendations = true;
      },
      closeAboutRecommendations() {
        this.showAboutRecommendations = false;
      },
      closeGiveFeedbackModal() {
        this.showFeedbackModal = false;
      },
      handleViewMoreRecommendations() {
        if (!this.recommendationsLoadingError) {
          const pageSize = this.recommendationsPageSize;
          const currentIndex = this.recommendationsCurrentIndex;
          const nextIndex = currentIndex + pageSize;
          if (this.showViewMoreRecommendations) {
            this.displayedRecommendations = this.recommendations.slice(0, nextIndex);
            this.recommendationsCurrentIndex = nextIndex;
            this.showViewMoreRecommendations = this.moreRecommendationsAvailable;
            this.showShowOtherResources = !this.showViewMoreRecommendations;
          } else if (this.shouldLoadOtherRecommendations) {
            this.loadRecommendations(true);
          } else {
            const limit = nextIndex - this.recommendations.length;
            this.updateDisplayedRecommendations(limit);
            this.recommendationsCurrentIndex = nextIndex;

            const moreAvailable = this.moreRecommendationsAvailable;
            this.showNoDirectMatches = this.showNoDirectMatches && moreAvailable;
            this.showShowOtherResources = this.showShowOtherResources && moreAvailable;
          }
        } else {
          this.loadRecommendations(this.recommendationsBelowThreshold);
        }
      },
      async loadRecommendations(belowThreshold) {
        if (this.shouldShowRecommendations) {
          this.recommendationsLoading = true;
          this.recommendationsLoadingError = false;
          try {
            const data = {
              ...this.embedTopicRequest,
              override_threshold: belowThreshold,
            };
            const recommendations = await this.fetchRecommendations(data);
            const recommendedNodes = await this.fetchRecommendedNodes(recommendations);
            const pageSize = this.recommendationsPageSize;
            const currentIndex = this.recommendationsCurrentIndex;

            if (belowThreshold) {
              const nodeIds = new Set(this.recommendations.map(node => node.id));
              this.otherRecommendations = recommendedNodes.filter(node => !nodeIds.has(node.id));
              this.updateDisplayedRecommendations(pageSize);
              this.recommendationsCurrentIndex = currentIndex + pageSize;

              const moreAvailable = this.moreRecommendationsAvailable;
              this.showNoDirectMatches = this.showNoDirectMatches && moreAvailable;
              this.showShowOtherResources = this.showShowOtherResources && moreAvailable;
              this.otherRecommendationsLoaded = true;
            } else {
              this.recommendations = recommendedNodes;
              this.displayedRecommendations = this.recommendations.slice(0, pageSize);
              this.recommendationsCurrentIndex = pageSize;

              const count = this.recommendations.length;
              this.showNoDirectMatches = count === 0;
              this.showViewMoreRecommendations = this.moreRecommendationsAvailable;
              this.showShowOtherResources = !this.showViewMoreRecommendations;
            }
            this.recommendationsBelowThreshold = belowThreshold;
            this.recommendationsLoading = false;
            this.initialRecommendationsEvent(data, recommendations);
          } catch (error) {
            this.recommendationsLoading = false;
            this.recommendationsLoadingError = true;
          }
        }
      },
      async fetchRecommendedNodes(recommendations) {
        return await Promise.all(
          recommendations.map(async recommendation => {
            // loadPublicContentNode is cached, so multiple calls shouldn't be an issue.
            return await this.loadPublicContentNode({
              id: recommendation.id,
              nodeId: recommendation.node_id,
              rootId: recommendation.main_tree_id,
              parent: recommendation.parent_id,
            });
          }),
        );
      },
      updateDisplayedRecommendations(limit) {
        this.displayedRecommendations = [
          ...this.recommendations,
          ...this.otherRecommendations.slice(0, limit),
        ];
      },
      initialRecommendationsEvent(request, response) {
        const nodeToRank = {};
        const recommendedNodes = response || [];
        recommendedNodes.forEach(node => {
          nodeToRank[node.node_id] = node.rank;
        });

        const content = [...this.recommendations, ...this.otherRecommendations];
        this.recommendationsEvent = new RecommendationsEvent({
          context: { request },
          contentnode_id: this.importDestinationFolder.id,
          content_id: this.importDestinationFolder.content_id,
          target_channel_id: this.importDestinationFolder.channel_id,
          user_id: this.userId,
          content: content.map(node => ({
            content_id: node.content_id,
            node_id: node.id,
            channel_id: node.channel_id,
            rank: nodeToRank[node.id],
          })),
        });
      },
      handleNotRelevantRecommendation(node) {
        this.rejectedNode = node;
        const type = FeedbackTypeOptions.rejected;
        const reason = this.recommendationsFeedback ? this.recommendationsFeedback : type;
        const interactionEvent = new RecommendationsInteractionEvent({
          recommendation_event_id: this.recommendationsEvent.id,
          contentnode_id: node.id,
          content_id: node.content_id,
          context: {
            other_feedback: this.otherFeedback,
          },
          feedback_type: type,
          feedback_reason: reason,
        });
        sendRequest(interactionEvent)
          .then(() => {
            this.rejectedNodeIds.push(node.id);
            this.showSnackbar({
              text: this.feedbackConfirmationMessage$(),
              actionText: this.giveFeedbackText$(),
              actionCallback: () => (this.showFeedbackModal = true),
            });
          })
          .catch(error => {
            this.showSnackbar({ text: this.feedbackFailedMessage$() });
            throw error;
          });
      },
      isFeedbackReasonSelected(value) {
        return this.feedbackReason.includes(value);
      },
      handleFeedbackCheckboxChange(value, isChecked) {
        if (isChecked) {
          if (!this.feedbackReason.includes(value)) {
            this.feedbackReason.push(value);
          }
        } else {
          this.feedbackReason = this.feedbackReason.filter(item => item !== value);
        }
        this.clearOtherFeedbackText();
      },
      clearOtherFeedbackText() {
        if (!this.isFeedbackReasonSelected('other')) {
          this.otherFeedback = '';
          this.showOtherFeedbackInvalidText = false;
        }
      },
      submitRejectedRecommendationFeedback() {
        const rejectedEvent = new RecommendationsInteractionEvent({
          method: 'patch',
          recommendation_event_id: this.recommendationsEvent.id,
          contentnode_id: this.rejectedNode.id,
          content_id: this.rejectedNode.content_id,
          feedback_type: FeedbackTypeOptions.rejected,
          feedback_reason: this.recommendationsFeedback,
        });
        if (this.validateFeedbackForm) {
          sendRequest(rejectedEvent)
            .then(() => {
              this.showSnackbar({
                text: this.feedbackSubmittedMessage$(),
              });
            })
            .catch(error => {
              this.showSnackbar({ text: this.feedbackFailedMessage$() });
              throw error;
            });
          this.showFeedbackModal = false;
        } else {
          this.showOtherFeedbackInvalidText = !this.isOtherFeedbackValid;
        }
        this.showFeedbackErrorMessage = !this.isAnyFeedbackReasonSelected;
      },
      submitRecommendationsFeedback() {
        this.submitIgnoredRecommendationsFeedback();
        sendRequest(this.recommendationsEvent);
      },
      submitPreviewedRecommendationFeedback(node) {
        this.previewedNodeIds.push(node.id);

        const previewedEvent = new RecommendationsInteractionEvent({
          recommendation_event_id: this.recommendationsEvent.id,
          contentnode_id: node.id,
          content_id: node.content_id,
          context: {
            //ToDo: Add appropriate context to be sent with the interaction event
          },
          feedback_type: FeedbackTypeOptions.previewed,
          feedback_reason: '',
        });
        sendRequest(previewedEvent);
      },
      handlePreviewRecommendation(previewFunc, node) {
        previewFunc(node);
        this.submitPreviewedRecommendationFeedback(node);
      },
      async submitIgnoredRecommendationsFeedback() {
        for (const node of this.ignoredRecommendations) {
          const ignoredEvent = new RecommendationsInteractionEvent({
            recommendation_event_id: this.recommendationsEvent.id,
            contentnode_id: node.id,
            content_id: node.content_id,
            context: {
              //ToDo: Add appropriate context to be sent with the interaction event
            },
            feedback_type: FeedbackTypeOptions.ignored,
            feedback_reason: '',
          });
          await sendRequest(ignoredEvent);
        }
      },
    },
    $trs: {
      backToBrowseAction: 'Back to browse',
      searchLabel: 'Search for resources…',
      searchAction: 'Search',
      savedSearchesLabel: 'View saved searches',

      // Copy strings
      // undo: 'Undo',
      copiedToClipboard: 'Copied to clipboard',
      copyFailed: 'Failed to copy to clipboard',
    },
  };

</script>


<style lang="scss" scoped>

  .v-form {
    max-width: 100%;
  }

  .searchtext ::v-deep .v-input__append-outer {
    height: 57px;
    margin: 0;
    margin-top: 0 !important;
  }

  .search-btn {
    height: inherit;
    margin: 0;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }

  .over-app-bar {
    z-index: 3;
  }

  .recommendations-loader {
    margin-top: 24px;
  }

  .feedback-options {
    margin-top: 8px;
  }

  .feedback-form-error {
    padding: 16px;
    margin: 16px 0;
    border-radius: 4px;
  }

</style>
