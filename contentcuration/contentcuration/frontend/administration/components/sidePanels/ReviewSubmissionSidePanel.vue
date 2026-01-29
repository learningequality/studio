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
      <div class="submission-side-panel-wrapper">
        <KCircularLoader
          v-if="isLoading"
          disableDefaultTransition
        />
        <div
          v-if="submissionIsFinished"
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
            {{ $formatRelative(submission.date_created) }}
          </span>
        </div>
        <div v-else-if="isLoading">Loading submission data...</div>
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
            v-if="submissionIsFinished"
            :status="submission.status"
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

        <SpecialPermissionsList
          v-if="channelVersionData"
          v-model="checkedSpecialPermissions"
          :channelVersionId="channelVersionData.id"
          :disabled="!canBeEdited"
          @update:allChecked="allSpecialPermissionsChecked = $event"
        >
          <template #description>
            <span>
              Please confirm that the submitter has the necessary distribution rights for all
              included content.
            </span>
          </template>
        </SpecialPermissionsList>

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
              :invalid="editorNotesRequiredButNotGiven"
              invalidText="Required when resource is flagged"
              showInvalidText
              :disabled="!canBeEdited"
              :appearanceOverrides="{
                maxWidth: 'none',
              }"
            />
          </section>

          <section>
            <h2 class="section-title">Personal notes (optional)</h2>
            <KTextbox
              ref="personalNotesRef"
              v-model="personalNotes"
              label="Personal notes on possible actions for this submission"
              textArea
              :appearanceOverrides="{
                maxWidth: 'none',
              }"
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

  import { computed, ref, watch, getCurrentInstance } from 'vue';
  import { themeTokens, themePalette } from 'kolibri-design-system/lib/styles/theme';

  import camelCase from 'lodash/camelCase';

  import { RouteNames } from '../../constants';
  import { AdminCommunityLibrarySubmission, ChannelVersion } from 'shared/data/resources';
  import LanguagesMap from 'shared/leUtils/Languages';
  import LicensesMap from 'shared/leUtils/Licenses';
  import SidePanelModal from 'shared/views/SidePanelModal';
  import countriesUtil from 'shared/utils/countries';
  import { translateMetadataString } from 'shared/utils/metadataStringsTranslation';
  import ActionLink from 'shared/views/ActionLink.vue';
  import SpecialPermissionsList from 'shared/views/communityLibrary/SpecialPermissionsList.vue';
  import CommunityLibraryStatusChip from 'shared/views/communityLibrary/CommunityLibraryStatusChip.vue';
  import {
    CategoriesLookup,
    CommunityLibraryStatus,
    CommunityLibraryResolutionReason,
  } from 'shared/constants';
  import { useFetch } from 'shared/composables/useFetch';
  import { getUiSubmissionStatus } from 'shared/utils/communityLibrary';

  export default {
    name: 'ReviewSubmissionSidePanel',
    components: {
      ActionLink,
      SidePanelModal,
      SpecialPermissionsList,
      CommunityLibraryStatusChip,
    },
    setup(props, { emit }) {
      const tokensTheme = themeTokens();
      const paletteTheme = themePalette();

      const { proxy } = getCurrentInstance();
      const store = proxy.$store;

      const checkedSpecialPermissions = ref([]);
      const allSpecialPermissionsChecked = ref(false);

      const {
        data: submission,
        isLoading: submissionIsLoading,
        isFinished: submissionIsFinished,
        fetchData: fetchSubmission,
      } = useFetch({
        asyncFetchFunc: () => AdminCommunityLibrarySubmission.fetchModel(props.submissionId),
      });

      const {
        data: channelVersionData,
        isLoading: channelVersionIsLoading,
        isFinished: channelVersionIsFinished,
        fetchData: fetchChannelVersion,
      } = useFetch({
        asyncFetchFunc: async () => {
          if (!submission.value) {
            throw new Error('Submission data not loaded yet');
          }
          const response = await ChannelVersion.fetchCollection({
            channel: submission.value.channel_id,
            version: submission.value.channel_version,
          });
          return response[0];
        },
      });

      const isLoading = computed(() => {
        return submissionIsLoading.value || channelVersionIsLoading.value;
      });

      const authorName = computed(() => {
        return submissionIsFinished.value ? submission.value.author_name : 'Loading...';
      });

      const channelVersionedName = computed(() => {
        return submissionIsFinished.value
          ? `${props.channel.name} v${submission.value.channel_version}`
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
        if (!submissionIsFinished.value) return '';
        return submission.value.countries.map(code => countryCodeToName(code)).join(', ');
      });

      const languagesString = computed(() => {
        if (!channelVersionIsFinished.value) return undefined;

        const languageCodes = channelVersionData.value.included_languages;

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
        if (!channelVersionIsFinished.value) return undefined;
        if (channelVersionData.value.included_categories.length === 0) return null;

        return channelVersionData.value.included_categories
          .map(categoryId => categoryIdToName(categoryId))
          .join(', ');
      });

      const licensesString = computed(() => {
        if (!channelVersionIsFinished.value) return undefined;
        if (channelVersionData.value.included_licenses.length === 0) return null;

        return channelVersionData.value.included_licenses
          .map(licenseId => LicensesMap.get(licenseId).license_name)
          .join(', ');
      });

      const submissionNotes = computed(() => {
        return submissionIsFinished.value ? submission.value.description : undefined;
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

      const editorNotes = ref('');
      const personalNotes = ref('');

      const editorNotesRequiredButNotGiven = computed(() => {
        return statusChoice.value === CommunityLibraryStatus.REJECTED && !editorNotes.value;
      });

      const currentlySubmitting = ref(false);

      const canBeEdited = computed(() => {
        return (
          submissionIsFinished.value &&
          uiSubmissionStatus.value === CommunityLibraryStatus.PENDING &&
          !currentlySubmitting.value
        );
      });

      const readyToSubmit = computed(() => {
        const conditions = [
          canBeEdited.value,
          !editorNotesRequiredButNotGiven.value,
          [CommunityLibraryStatus.APPROVED, CommunityLibraryStatus.REJECTED].includes(
            statusChoice.value,
          ),
        ];
        if (statusChoice.value === CommunityLibraryStatus.APPROVED) {
          conditions.push(allSpecialPermissionsChecked.value);
        }
        return conditions.every(condition => condition);
      });

      const uiSubmissionStatus = computed(() => {
        if (!submissionIsFinished.value) {
          return undefined;
        }
        return getUiSubmissionStatus(submission.value.status);
      });

      watch(submissionIsFinished, () => {
        if (submissionIsFinished.value) {
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

          editorNotes.value = submission.value.feedback_notes || '';
          personalNotes.value = submission.value.internal_notes || '';

          const resolutionReason = submission.value.resolution_reason;
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

        const timer = setTimeout(async () => {
          try {
            await AdminCommunityLibrarySubmission.resolve(submission.value.id, {
              status: statusChoice.value,
              feedback_notes: editorNotes.value,
              internal_notes: personalNotes.value,
              ...(statusChoice.value === CommunityLibraryStatus.REJECTED
                ? { resolution_reason: flagReasonChoice.value.value }
                : {}),
            });
            const snackbarText =
              statusChoice.value === CommunityLibraryStatus.APPROVED
                ? 'Submission approved'
                : 'Submission flagged for review';

            showSnackbar({ text: snackbarText });
            updateStatusInStore(statusChoice.value);
          } catch (error) {
            showSnackbar({ text: 'Changing channel status failed' });
          } finally {
            currentlySubmitting.value = false;
          }
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

      const {
        PENDING: STATUS_PENDING,
        APPROVED: STATUS_APPROVED,
        REJECTED: STATUS_REJECTED,
      } = CommunityLibraryStatus;

      const loadData = async () => {
        await fetchSubmission();
        await fetchChannelVersion();
      };

      loadData();

      return {
        isLoading,
        chipColor,
        chipTextColor,
        annotationColor,
        boxBackgroundColor,
        boxTitleColor,
        authorName,
        channelVersionData,
        checkedSpecialPermissions,
        allSpecialPermissionsChecked,
        submissionIsFinished,
        submission,
        channelLink,
        channelVersionedName,
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
      submissionId: {
        type: [String, Number],
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

  .submission-side-panel-wrapper {
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
