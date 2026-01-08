<template>

  <SidePanelModal
    alignment="right"
    sidePanelWidth="700px"
    @closePanel="$emit('close')"
  >
    <template #header>
      <h1 class="side-panel-title">Review Submission</h1>
    </template>

    <template #default>
      <div class="container">
        <div
          v-if="latestSubmissionIsFinished"
          class="submission-info-text"
        >
          <span class="author-name">{{ authorName }}</span>
          <div class="editor-chip">Editor</div>
          <span>
            submitted
            <ActionLink
              ref="channelLinkRef"
              :text="channelVersionedName"
              :notranslate="true"
              :to="channelLink"
              class="channel-link"
            />
          </span>
          <span data-test="submission-date">
            {{ $formatRelative(submissionDate) }}
          </span>
        </div>
        <div v-else-if="latestSubmissionIsLoading">Loading submission data...</div>
        <div v-else>Error loading submission data.</div>

        <div class="details">
          <span class="detail-annotation">Country(s)</span>
          <span
            v-if="countriesString"
            data-test="countries"
          >
            {{ countriesString }}
          </span>
          <template v-else>
            <KEmptyPlaceholder />
          </template>
          <span class="detail-annotation">Language(s)</span>
          <span
            v-if="languagesString"
            data-test="languages"
          >
            {{ languagesString }}
          </span>
          <template v-else>
            <KEmptyPlaceholder />
          </template>
          <span class="detail-annotation">Categories</span>
          <span
            v-if="categoriesString"
            data-test="categories"
          >
            {{ categoriesString }}
          </span>
          <template v-else>
            <KEmptyPlaceholder />
          </template>
          <span class="detail-annotation">License(s)</span>
          <span
            v-if="licensesString"
            data-test="licenses"
          >
            {{ licensesString }}
          </span>
          <template v-else>
            <KEmptyPlaceholder />
          </template>
          <span class="detail-annotation">Status</span>
          <CommunityLibraryStatusChip
            v-if="latestSubmissionIsFinished"
            :status="latestSubmissionData.status"
          />
          <template v-else>
            <KEmptyPlaceholder />
          </template>
        </div>

        <div class="box">
          <h3 class="box-title">Submission notes</h3>
          <span
            v-if="submissionNotes"
            data-test="submission-notes"
          >
            {{ submissionNotes }}
          </span>
        </div>

        <div>
          <section>
            <h2 class="section-title">Change status</h2>

            <KRadioButtonGroup>
              <KRadioButton
                v-model="statusChoice"
                label="Submitted"
                :buttonValue="STATUS_PENDING"
                :disabled="!canBeEdited"
              />
              <KRadioButton
                v-model="statusChoice"
                label="Approve"
                :buttonValue="STATUS_APPROVED"
                :disabled="!canBeEdited"
              />
              <KRadioButton
                v-model="statusChoice"
                label="Flag for review"
                :buttonValue="STATUS_REJECTED"
                :disabled="!canBeEdited"
              />
              <KSelect
                v-if="statusChoice === STATUS_REJECTED"
                ref="flagReasonSelectRef"
                v-model="flagReasonChoice"
                :options="flagReasonChoiceOptions"
                label="Reason"
                class="flag-reason-select"
                :disabled="!canBeEdited"
              />
            </KRadioButtonGroup>
          </section>

          <section>
            <h2 class="section-title">Editor's notes</h2>
            <KTextbox
              ref="editorNotesRef"
              v-model="editorNotes"
              label="Clarify your reasoning"
              textArea
              class="wide-textbox"
              :invalid="editorNotesRequiredButNotGiven"
              invalidText="Required when resource is flagged"
              showInvalidText
              :disabled="!canBeEdited"
            />
          </section>

          <section>
            <h2 class="section-title">Personal notes (optional)</h2>
            <KTextbox
              ref="personalNotesRef"
              v-model="personalNotes"
              label="Personal notes on possible actions for this submission"
              textArea
              class="wide-textbox"
              :disabled="!canBeEdited"
            />
          </section>
        </div>
      </div>
    </template>

    <template #bottomNavigation>
      <div class="button-panel">
        <KButtonGroup>
          <KButton @click="$emit('close')">Close</KButton>
          <KButton
            ref="confirmButtonRef"
            primary
            :disabled="!readyToSubmit"
            @click="submit()"
          >
            Confirm
          </KButton>
        </KButtonGroup>
      </div>
    </template>
  </SidePanelModal>

</template>


<script>

  import { computed, onMounted, ref, watch, getCurrentInstance } from 'vue';
  import { themeTokens, themePalette } from 'kolibri-design-system/lib/styles/theme';

  import camelCase from 'lodash/camelCase';

  import { RouteNames } from '../../constants';
  import { CommunityLibrarySubmission } from 'shared/data/resources';
  import LanguagesMap from 'shared/leUtils/Languages';
  import LicensesMap from 'shared/leUtils/Licenses';
  import SidePanelModal from 'shared/views/SidePanelModal';
  import countriesUtil from 'shared/utils/countries';
  import { translateMetadataString } from 'shared/utils/metadataStringsTranslation';
  import { useLatestCommunityLibrarySubmission } from 'shared/composables/useLatestCommunityLibrarySubmission';
  import ActionLink from 'shared/views/ActionLink.vue';
  import CommunityLibraryStatusChip from 'shared/views/communityLibrary/CommunityLibraryStatusChip.vue';
  import {
    CategoriesLookup,
    CommunityLibraryStatus,
    CommunityLibraryResolutionReason,
  } from 'shared/constants';

  export default {
    name: 'ReviewSubmissionSidePanel',
    components: {
      ActionLink,
      SidePanelModal,
      CommunityLibraryStatusChip,
    },
    setup(props, { emit }) {
      const tokensTheme = themeTokens();
      const paletteTheme = themePalette();

      const { proxy } = getCurrentInstance();
      const store = proxy.$store;

      const {
        isLoading: latestSubmissionIsLoading,
        isFinished: latestSubmissionIsFinished,
        data: latestSubmissionData,
        fetchData: fetchLatestSubmission,
      } = useLatestCommunityLibrarySubmission({ channelId: props.channel.id, admin: true });

      const submissionDate = computed(() => {
        return latestSubmissionIsFinished.value
          ? latestSubmissionData.value.date_created
          : undefined;
      });

      const authorName = computed(() => {
        return latestSubmissionIsFinished.value
          ? latestSubmissionData.value.author_name
          : 'Loading...';
      });

      const channelVersionedName = computed(() => {
        return latestSubmissionIsFinished.value
          ? `${props.channel.name} v${latestSubmissionData.value.channel_version}`
          : undefined;
      });

      const channelLink = computed(() => {
        return {
          name: RouteNames.CHANNEL,
          params: {
            channelId: props.channel.id,
          },
        };
      });

      function countryCodeToName(code) {
        return countriesUtil.getName(code, 'en');
      }

      const countriesString = computed(() => {
        if (!latestSubmissionIsFinished.value) return '';
        return latestSubmissionData.value.countries.map(code => countryCodeToName(code)).join(', ');
      });

      const versionPublishedData = computed(() => {
        if (!latestSubmissionIsFinished.value) return undefined;

        const publishedData = props.channel.published_data;
        return publishedData[latestSubmissionData.value.channel_version];
      });

      const languagesString = computed(() => {
        if (versionPublishedData.value === undefined) return undefined;

        // We need to filter out null values due to a backend bug
        // causing null values to sometimes be included in the list
        const languageCodes = versionPublishedData.value.included_languages.filter(
          code => code !== null,
        );

        // We distinguish here between "not loaded yet" (undefined)
        // and "loaded and none present" (null). This distinction is
        // not used in the UI and is mostly intended to convey the
        // state more accurately to the developer in case of debugging.
        // UI code should rely on XXXIsLoading and XXXIsFinished instead.
        if (!languageCodes) return undefined;
        if (languageCodes.length === 0) return null;

        return languageCodes.map(code => LanguagesMap.get(code).readable_name).join(', ');
      });

      function categoryIdToName(categoryId) {
        return translateMetadataString(camelCase(CategoriesLookup[categoryId]));
      }

      const categoriesString = computed(() => {
        if (versionPublishedData.value === undefined) return undefined;
        if (versionPublishedData.value.included_categories.length === 0) return null;

        return versionPublishedData.value.included_categories
          .map(categoryId => categoryIdToName(categoryId))
          .join(', ');
      });

      const licensesString = computed(() => {
        if (versionPublishedData.value === undefined) return undefined;
        if (versionPublishedData.value.included_licenses.length === 0) return null;

        return versionPublishedData.value.included_licenses
          .map(licenseId => LicensesMap.get(licenseId).license_name)
          .join(', ');
      });

      const submissionNotes = computed(() => {
        return latestSubmissionIsFinished.value
          ? latestSubmissionData.value.description
          : undefined;
      });

      // Start with being unchecked, the initial status will be set
      // once the submission data is loaded
      const statusChoice = ref(false);

      // Map from resolution reasons to option labels, used to generate the actual
      // option objects below
      const flagReasonChoiceLabelsMap = {
        [CommunityLibraryResolutionReason.INVALID_LICENSING]: 'Invalid or non-compliant licenses',
        [CommunityLibraryResolutionReason.TECHNICAL_QUALITY_ASSURANCE]: 'Quality assurance issues',
        [CommunityLibraryResolutionReason.INVALID_METADATA]: 'Invalid or missing metadata',
        [CommunityLibraryResolutionReason.PORTABILITY_ISSUES]: 'Portability problems',
        [CommunityLibraryResolutionReason.OTHER]: 'Other issues',
      };

      // Map from resolution reasons to option objects for KSelect
      const flagReasonChoiceOptionMap = Object.fromEntries(
        Object.entries(flagReasonChoiceLabelsMap).map(([value, label]) => [
          value,
          { value, label },
        ]),
      );

      // Array of all option objects for KSelect
      const flagReasonChoiceOptions = Object.values(flagReasonChoiceOptionMap);

      const flagReasonChoice = ref(flagReasonChoiceOptions[0]);

      watch(statusChoice, (newChoice, oldChoice) => {
        if (!oldChoice) {
          // The status was changed because the initial loading of the submission
          // data completed. In that case, the flag reason choice has already been
          // pre-filled from the submission data, so we do not want to overwrite it.
          return;
        }
        flagReasonChoice.value = flagReasonChoiceOptions[0];
      });

      const editorNotes = ref('');
      const personalNotes = ref('');

      const editorNotesRequiredButNotGiven = computed(() => {
        return statusChoice.value === CommunityLibraryStatus.REJECTED && !editorNotes.value;
      });

      const currentlySubmitting = ref(false);

      const canBeEdited = computed(() => {
        return (
          latestSubmissionIsFinished.value &&
          uiSubmissionStatus.value === CommunityLibraryStatus.PENDING &&
          !currentlySubmitting.value
        );
      });

      const readyToSubmit = computed(() => {
        return (
          canBeEdited.value &&
          !editorNotesRequiredButNotGiven.value &&
          [CommunityLibraryStatus.APPROVED, CommunityLibraryStatus.REJECTED].includes(
            statusChoice.value,
          )
        );
      });

      const uiSubmissionStatus = computed(() => {
        if (!latestSubmissionIsFinished.value) {
          return undefined;
        }

        if (latestSubmissionData.value.status === CommunityLibraryStatus.LIVE) {
          // Treat LIVE as APPROVED in the UI context
          return CommunityLibraryStatus.APPROVED;
        }
        return latestSubmissionData.value.status;
      });

      watch(latestSubmissionIsFinished, () => {
        if (latestSubmissionIsFinished.value) {
          if (
            [
              CommunityLibraryStatus.PENDING,
              CommunityLibraryStatus.APPROVED,
              CommunityLibraryStatus.REJECTED,
            ].includes(uiSubmissionStatus.value)
          ) {
            statusChoice.value = uiSubmissionStatus.value;
          } else {
            statusChoice.value = false;
          }

          editorNotes.value = latestSubmissionData.value.feedback_notes || '';
          personalNotes.value = latestSubmissionData.value.internal_notes || '';

          const resolutionReason = latestSubmissionData.value.resolution_reason;
          if (resolutionReason) {
            flagReasonChoice.value = flagReasonChoiceOptionMap[resolutionReason];
          }
        }
      });

      function showSnackbar(params) {
        return store.dispatch('showSnackbar', params);
      }

      function updateStatusInStore(newStatus) {
        return store.commit('channel/UPDATE_CHANNEL', {
          id: props.channel.id,
          latest_community_library_submission_status: newStatus,
        });
      }

      function submit() {
        // It should be possible to undo resolving the submission within a short time window
        // in case the user made a mistake and wants to change something.
        // To avoid having to deal with undoing logic, we simply show a "resolving"
        // snackbar for a few seconds with a cancel option, and only resolve
        // if the user doesn't cancel within that time window.
        const submitDelayMs = 5000;

        currentlySubmitting.value = true;

        const timer = setTimeout(() => {
          CommunityLibrarySubmission.resolveAsAdmin(latestSubmissionData.value.id, {
            status: statusChoice.value,
            feedback_notes: editorNotes.value,
            internal_notes: personalNotes.value,
            ...(statusChoice.value === CommunityLibraryStatus.REJECTED
              ? { resolution_reason: flagReasonChoice.value.value }
              : {}),
          })
            .then(async () => {
              const snackbarText =
                statusChoice.value === CommunityLibraryStatus.APPROVED
                  ? 'Submission approved'
                  : 'Submission flagged for review';

              showSnackbar({ text: snackbarText });
              updateStatusInStore(statusChoice.value);
            })
            .catch(async () => {
              showSnackbar({ text: 'Changing channel status failed' });
            })
            .finally(() => {
              currentlySubmitting.value = false;
            });
        }, submitDelayMs);

        showSnackbar({
          text: 'Channel status is changing',
          duration: null,
          actionText: 'Cancel',
          actionCallback: () => {
            clearTimeout(timer);
            showSnackbar({
              text: 'Action cancelled',
            });
          },
        });

        emit('close');
      }

      const chipColor = computed(() => paletteTheme.grey.v_200);
      const chipTextColor = computed(() => paletteTheme.grey.v_700);
      const annotationColor = computed(() => tokensTheme.annotation);
      const boxBackgroundColor = computed(() => paletteTheme.grey.v_100);
      const boxTitleColor = computed(() => paletteTheme.grey.v_800);

      onMounted(async () => {
        await fetchLatestSubmission();
      });

      const {
        PENDING: STATUS_PENDING,
        APPROVED: STATUS_APPROVED,
        REJECTED: STATUS_REJECTED,
      } = CommunityLibraryStatus;

      return {
        chipColor,
        chipTextColor,
        annotationColor,
        boxBackgroundColor,
        boxTitleColor,
        authorName,
        latestSubmissionIsFinished,
        latestSubmissionIsLoading,
        latestSubmissionData,
        channelLink,
        channelVersionedName,
        submissionDate,
        countriesString,
        languagesString,
        categoriesString,
        licensesString,
        submissionNotes,
        statusChoice,
        flagReasonChoice,
        flagReasonChoiceOptions,
        editorNotes,
        personalNotes,
        editorNotesRequiredButNotGiven,
        canBeEdited,
        readyToSubmit,
        STATUS_PENDING,
        STATUS_APPROVED,
        STATUS_REJECTED,
        submit,
      };
    },
    emits: ['close'],
    props: {
      channel: {
        type: Object,
        required: true,
      },
    },
  };

</script>


<style scoped lang="scss">

  .side-panel-title {
    padding-left: 16px;
    margin: 0;
    font-size: 20px;
  }

  .container {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .submission-info-text {
    display: flex;
    gap: 6px;
  }

  .author-name {
    font-weight: 600;
  }

  .editor-chip {
    display: inline-flex;
    align-items: center;
    height: 20px;
    padding: 2px 5px;
    font-size: 10px;
    color: v-bind('chipTextColor');
    background-color: v-bind('chipColor');
    border-radius: 16px;
  }

  .channel-link {
    vertical-align: baseline;
  }

  .status-line {
    display: flex;
    align-items: center;
  }

  .detail-annotation {
    grid-column-start: 1;
    color: v-bind('annotationColor');
  }

  .box {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background-color: v-bind('boxBackgroundColor');
    border-radius: 8px;
  }

  .details {
    display: grid;
    grid-template-columns: auto 1fr;
    row-gap: 8px;
    column-gap: 16px;
  }

  .box-title {
    font-size: 12px;
    font-weight: 600;
    color: v-bind('boxTitleColor');
  }

  .details-box-title {
    grid-column: span 2;
  }

  .section-title {
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 600;
  }

  .wide-textbox {
    width: 100%;
  }

  .wide-textbox ::v-deep .textbox {
    max-width: 100%;
  }

  .flag-reason-select {
    max-width: 300px;
    margin-left: 32px;
  }

  .button-panel {
    display: flex;
    justify-content: end;
    width: 100%;
  }

</style>
