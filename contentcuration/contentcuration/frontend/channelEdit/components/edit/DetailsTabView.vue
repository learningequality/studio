<template>

  <div
    v-if="nodes.length"
    class="details-edit-view"
  >
    <VForm
      ref="form"
      v-model="valid"
      :lazy-validation="newContent"
      class="px-2"
    >
      <!-- File upload and preview section -->
      <template v-if="oneSelected && allResources && !allExercises">
        <FileUpload
          v-if="oneSelected && allResources && !allExercises"
          :key="firstNode.id"
          :nodeId="firstNode.id"
          @previewClick="trackPreview"
        />
      </template>

      <!-- Basic information section -->
      <VLayout
        row
        wrap
        class="section"
      >
        <VFlex xs12>
          <h1 class="subheading">
            {{ $tr('basicInfoHeader') }}
          </h1>
          <!-- Title -->
          <VTextField
            v-if="oneSelected"
            ref="title"
            v-model="title"
            maxlength="200"
            counter
            :rules="titleRules"
            :label="$tr('titleLabel')"
            autofocus
            required
            box
            @focus="trackClick('Title')"
          />
          <VLayout
            row
            wrap
          >
            <VFlex
              v-if="oneSelected"
              xs12
              md6
              class="basicInfoColumn"
              :class="{ 'pr-2': $vuetify.breakpoint.mdAndUp }"
            >
              <!-- Description -->
              <VTextarea
                ref="description"
                v-model="description"
                :label="$tr('descriptionLabel')"
                maxlength="400"
                counter
                autoGrow
                box
                height="100%"
                class="descriptionTextArea"
                @focus="trackClick('Description')"
              />
            </VFlex>
            <VFlex
              xs12
              :[mdValue]="true"
              :class="{ 'pl-2': $vuetify.breakpoint.mdAndUp && oneSelected }"
            >
              <!-- Learning activity -->
              <LearningActivityOptions
                v-if="oneSelected"
                ref="learning_activities"
                v-model="contentLearningActivities"
                :disabled="anyIsTopic"
                :nodeIds="nodeIds"
                @focus="trackClick('Learning activities')"
              />
              <!-- Level -->
              <LevelsOptions
                v-if="oneSelected"
                ref="contentLevel"
                v-model="contentLevel"
                :nodeIds="nodeIds"
                @focus="trackClick('Levels dropdown')"
              />
              <!-- What you will need -->
              <ResourcesNeededOptions
                v-if="oneSelected"
                ref="resourcesNeeded"
                v-model="resourcesNeeded"
                :nodeIds="nodeIds"
                @focus="trackClick('What you will need')"
              />
              <!-- Tags -->
              <VCombobox
                ref="tags"
                v-model="contentTags"
                class="tagbox"
                :items="tags"
                :searchInput.sync="tagText"
                chips
                box
                :label="$tr('tagsLabel')"
                multiple
                deletableChips
                hideSelected
                maxlength="30"
                autoSelectFirst
                @focus="trackClick('Tags')"
              >
                <template #no-data>
                  <VListTile v-if="tagText && tagText.trim()">
                    <VListTileContent>
                      <VListTileTitle>
                        {{ $tr('noTagsFoundText', { text: tagText.trim() }) }}
                      </VListTileTitle>
                    </VListTileContent>
                  </VListTile>
                </template>
              </VCombobox>
            </VFlex>
          </VLayout>
          <!-- Category -->
          <CategoryOptions
            v-if="oneSelected"
            ref="categories"
            v-model="categories"
            :nodeIds="nodeIds"
          />
        </VFlex>
      </VLayout>

      <!-- Completion section for exercises -->
      <VLayout
        v-if="allExercises"
        row
        wrap
        class="section"
      >
        <VFlex xs12>
          <h1 class="subheading">
            {{ $tr('assessmentOptionsLabel') }}
          </h1>
          <!-- Randomize question order -->
          <Checkbox
            ref="randomize"
            v-model="randomizeOrder"
            :label="$tr('randomizeQuestionLabel')"
            :indeterminate="!isUnique(randomizeOrder)"
            style="font-size: 16px"
          />
        </VFlex>
      </VLayout>

      <!-- Completion section for all resources -->
      <VLayout
        v-if="!anyIsTopic && allSameKind"
        row
        wrap
        class="section"
      >
        <VFlex xs12>
          <h1 class="subheading">
            {{ $tr('completionLabel') }}
          </h1>
          <CompletionOptions
            v-model="completionAndDuration"
            :kind="firstNode.kind"
            :fileDuration="fileDuration"
            :required="!anyIsDocument"
          />
        </VFlex>
      </VLayout>

      <!-- Thumbnail section -->
      <VLayout
        row
        wrap
        class="section"
      >
        <VFlex
          v-if="oneSelected"
          xs12
        >
          <h1 class="subheading">
            {{ $tr('thumbnailHeader') }}
          </h1>
          <!-- Thumbnail -->
          <div style="width: 250px">
            <ContentNodeThumbnail
              v-model="thumbnail"
              :nodeId="firstNode.id"
              :encoding="thumbnailEncoding"
              @encoded="setEncoding"
            />
          </div>
        </VFlex>
      </VLayout>

      <!-- Audience section -->
      <VLayout
        row
        wrap
        class="section"
      >
        <VFlex xs12>
          <h1 class="subheading">
            {{ $tr('audienceHeader') }}
          </h1>
          <!-- Language -->
          <LanguageDropdown
            ref="language"
            v-model="language"
            class="mb-2"
            :hint="languageHint"
            :placeholder="getPlaceholder('language')"
            clearable
            persistent-hint
            @focus="trackClick('Language')"
          />

          <!-- Visibility -->
          <VisibilityDropdown
            v-if="allResources"
            ref="role_visibility"
            v-model="role"
            :placeholder="getPlaceholder('role')"
            :required="isUnique(role)"
            @focus="trackClick('Role visibility')"
          />

          <!-- For Beginners -->
          <KCheckbox
            v-if="oneSelected"
            id="beginners"
            ref="beginners"
            :checked="forBeginners"
            @change="value => (forBeginners = value)"
          >
            <span
              class="text-xs-left v-label"
              style="padding-left: 8px"
            >
              {{ translateMetadataString('forBeginners') }}
            </span>
          </KCheckbox>
        </VFlex>
      </VLayout>

      <!-- Accessibility section -->
      <VLayout
        row
        wrap
        class="section"
      >
        <template v-if="requiresAccessibility">
          <VFlex xs12>
            <h1 class="subheading">
              {{ translateMetadataString('accessibility') }}
            </h1>
            <AccessibilityOptions
              v-model="accessibility"
              :checked="accessibility"
              :kind="firstNode.kind"
            />
          </VFlex>
        </template>
      </VLayout>

      <!-- Source section -->
      <VLayout
        row
        wrap
        class="section"
      >
        <template v-if="allResources">
          <VFlex
            xs12
            class="auth-section"
          >
            <h1 class="subheading">
              {{ $tr('sourceHeader') }}
            </h1>
            <p
              v-if="disableAuthEdits"
              class="grey--text"
            >
              {{ detectedImportText }}
            </p>
            <p v-if="oneSelected && isImported">
              <ActionLink
                :href="importedChannelLink"
                target="_blank"
                :text="$tr('importedFromButtonText', { channel: importedChannelName })"
              />
            </p>

            <!-- Author -->
            <VCombobox
              ref="author"
              :items="authors"
              :label="$tr('authorLabel')"
              :disabled="disableSourceEdits"
              maxlength="200"
              counter
              autoSelectFirst
              box
              :placeholder="getPlaceholder('author')"
              :value="author && author.toString()"
              @input.native="e => (author = e.srcElement.value)"
              @input="author = $event"
              @focus="trackClick('Author')"
            >
              <template #append-outer>
                <HelpTooltip
                  :text="$tr('authorToolTip')"
                  top
                  :small="false"
                />
              </template>
            </VCombobox>
            <p
              v-if="disableSourceEdits"
              class="help"
            >
              {{ helpTextString.$tr('cannotEditPublic') }}
            </p>

            <!-- Provider -->
            <VCombobox
              ref="provider"
              :items="providers"
              :label="$tr('providerLabel')"
              :disabled="disableSourceEdits"
              maxlength="200"
              counter
              :placeholder="getPlaceholder('provider')"
              autoSelectFirst
              box
              :value="provider && provider.toString()"
              @input.native="e => (provider = e.srcElement.value)"
              @input="provider = $event"
              @focus="trackClick('Provider')"
            >
              <template #append-outer>
                <HelpTooltip
                  :text="$tr('providerToolTip')"
                  top
                  :small="false"
                />
              </template>
            </VCombobox>

            <!-- Aggregator -->
            <VCombobox
              ref="aggregator"
              :items="aggregators"
              :label="$tr('aggregatorLabel')"
              :disabled="disableSourceEdits"
              maxlength="200"
              counter
              autoSelectFirst
              :placeholder="getPlaceholder('aggregator')"
              box
              :value="aggregator && aggregator.toString()"
              @input.native="e => (aggregator = e.srcElement.value)"
              @input="aggregator = $event"
              @focus="trackClick('Aggregator')"
            >
              <template #append-outer>
                <HelpTooltip
                  :text="$tr('aggregatorToolTip')"
                  top
                  :small="false"
                />
              </template>
            </VCombobox>

            <!-- License -->
            <LicenseDropdown
              ref="license"
              v-model="licenseItem"
              :required="isUnique(license) && isUnique(license_description) && !disableAuthEdits"
              :disabled="disableSourceEdits"
              :placeholder="getPlaceholder('license')"
              :descriptionPlaceholder="getPlaceholder('license_description')"
              :helpText="disableSourceEdits ? helpTextString.$tr('cannotEditPublic') : ''"
              @focus="trackClick('License')"
              @descriptionFocus="trackClick('License description')"
            />

            <!-- Copyright Holder -->
            <VCombobox
              v-if="copyrightHolderRequired"
              ref="copyright_holder"
              :items="copyrightHolders"
              :label="$tr('copyrightHolderLabel')"
              maxlength="200"
              counter
              :required="isUnique(copyright_holder) && !disableAuthEdits"
              :rules="copyrightHolderRules"
              :placeholder="getPlaceholder('copyright_holder')"
              autoSelectFirst
              :disabled="disableSourceEdits"
              box
              :value="copyright_holder && copyright_holder.toString()"
              @input.native="e => (copyright_holder = e.srcElement.value)"
              @input="copyright_holder = $event"
              @focus="trackClick('Copyright holder')"
            />
            <p
              v-if="disableSourceEdits"
              class="help"
            >
              {{ helpTextString.$tr('cannotEditPublic') }}
            </p>
          </VFlex>
        </template>
      </VLayout>

      <!-- Subtitles -->
      <VLayout
        v-if="videoSelected"
        row
        wrap
        class="section"
      >
        <VFlex xs12>
          <SubtitlesList
            :nodeId="firstNode.id"
            @addFile="subtitleFileLanguageComparison"
          />
        </VFlex>
      </VLayout>

      <!-- Audio accessibility section -->
      <VLayout
        row
        wrap
        class="section"
      >
        <template v-if="audioAccessibility">
          <VFlex xs12>
            <SubtitlesList :nodeId="firstNode.id" />
          </VFlex>
        </template>
      </VLayout>
    </VForm>
  </div>

</template>


<script>

  import difference from 'lodash/difference';
  import get from 'lodash/get';
  import intersection from 'lodash/intersection';
  import isEqual from 'lodash/isEqual';
  import uniq from 'lodash/uniq';
  import uniqWith from 'lodash/uniqWith';
  import { mapGetters, mapActions } from 'vuex';
  import ContentNodeThumbnail from '../../views/files/thumbnails/ContentNodeThumbnail';
  import FileUpload from '../../views/files/FileUpload';
  import SubtitlesList from '../../views/files/supplementaryLists/SubtitlesList';
  import { isImportedContent, isDisableSourceEdits, importedChannelLink } from '../../utils';
  import EditSourceModal from '../QuickEditModal/EditSourceModal.vue';
  import AccessibilityOptions from './AccessibilityOptions.vue';
  import LevelsOptions from 'shared/views/contentNodeFields/LevelsOptions';
  import CategoryOptions from 'shared/views/contentNodeFields/CategoryOptions';
  import CompletionOptions from 'shared/views/contentNodeFields/CompletionOptions';
  import LearningActivityOptions from 'shared/views/contentNodeFields/LearningActivityOptions';
  import ResourcesNeededOptions from 'shared/views/contentNodeFields/ResourcesNeededOptions';
  import {
    getTitleValidators,
    getCopyrightHolderValidators,
    translateValidator,
  } from 'shared/utils/validation';
  import { findLicense, memoizeDebounce, getFileDuration } from 'shared/utils/helpers';
  import LanguageDropdown from 'shared/views/LanguageDropdown';
  import HelpTooltip from 'shared/views/HelpTooltip';
  import LicenseDropdown from 'shared/views/LicenseDropdown';
  import VisibilityDropdown from 'shared/views/VisibilityDropdown';
  import Checkbox from 'shared/views/form/Checkbox';
  import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
  import {
    NEW_OBJECT,
    AccessibilityCategories,
    ResourcesNeededTypes,
    nonUniqueValue,
  } from 'shared/constants';
  import { constantsTranslationMixin, metadataTranslationMixin } from 'shared/mixins';
  import { crossComponentTranslator } from 'shared/i18n';

  function getValueFromResults(results) {
    if (results.length === 0) {
      return null;
    } else if (results.length === 1) {
      return results[0];
    } else {
      return nonUniqueValue;
    }
  }

  function generateGetterSetter(key) {
    return {
      get() {
        return this.getValueFromNodes(key);
      },
      set(value) {
        this.update({ [key]: value });
      },
    };
  }

  function generateExtraFieldsGetterSetter(key, defaultValue) {
    return {
      get() {
        return this.getExtraFieldsValueFromNodes(key, defaultValue);
      },
      set(value) {
        this.updateExtraFields({ [key]: value });
      },
    };
  }

  /**
   * This function is used to generate getter/setters having its value as
   * an array for metadata fields that are boolean maps:
   * - `accessibility_labels` (accessibility options)
   */
  function generateNestedNodesGetterSetter(key) {
    return {
      get() {
        // Return the unique values...
        return uniq(
          // for which all selected nodes share...
          intersection(
            // by mapping the fields for each selected node...
            ...this.nodes.map(node => {
              // checking the diffTracker first, then the node...
              for (const obj of [this.diffTracker[node.id] || {}, node]) {
                // returning the keys of the field
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                  return Object.keys(obj[key]);
                }
              }
              // otherwise an empty array, which will cause `intersection`
              // to result in an empty array
              return [];
            }),
          ),
        );
      },
      set(value) {
        const newMap = {};
        for (const label of value) {
          newMap[label] = true;
        }
        this.update({ [key]: newMap });
      },
    };
  }

  /**
   * This function is used to generate getter/setters having its value as
   * an object for metadata fields that are boolean maps:
   * - `grade_levels` (sometimes referred to as `content_levels`)
   * - `learner_needs` (resources needed)
   * - `learning_activities` (learning activities)
   * - `categories` (categories)
   */
  function generateNestedNodesGetterSetterObject(key) {
    return {
      get() {
        const value = {};
        for (const node of this.nodes) {
          const diffTrackerNode = this.diffTracker[node.id] || {};
          const currentValue = diffTrackerNode[key] || node[key] || {};
          Object.entries(currentValue).forEach(([option, optionValue]) => {
            if (optionValue) {
              value[option] = value[option] || [];
              value[option].push(node.id);
            }
          });
        }
        return value;
      },
      set(value) {
        const newMap = {};
        for (const option in value) {
          if (value[option].length === this.nodes.length) {
            newMap[option] = true;
          }
        }
        this.update({ [key]: newMap });
      },
    };
  }

  export default {
    name: 'DetailsTabView',
    components: {
      LanguageDropdown,
      HelpTooltip,
      LicenseDropdown,
      VisibilityDropdown,
      FileUpload,
      SubtitlesList,
      ContentNodeThumbnail,
      Checkbox,
      AccessibilityOptions,
      LevelsOptions,
      ResourcesNeededOptions,
      LearningActivityOptions,
      CategoryOptions,
      CompletionOptions,
    },
    mixins: [constantsTranslationMixin, metadataTranslationMixin],
    props: {
      nodeIds: {
        type: Array,
        default: () => [],
      },
    },
    data() {
      return {
        tagText: null,
        valid: true,
        diffTracker: {},
        changed: false,
        helpTextString: crossComponentTranslator(EditSourceModal),
      };
    },
    computed: {
      ...mapGetters('contentNode', [
        'getContentNodes',
        'authors',
        'providers',
        'aggregators',
        'copyrightHolders',
        'tags',
      ]),
      ...mapGetters('currentChannel', ['currentChannel']),
      ...mapGetters('file', ['getContentNodeFiles']),
      nodes() {
        return this.getContentNodes(this.nodeIds);
      },
      firstNode() {
        return this.nodes.length ? this.nodes[0] : null;
      },
      allExercises() {
        return this.nodes.every(node => node.kind === ContentKindsNames.EXERCISE);
      },
      allResources() {
        return !this.nodes.some(node => node.kind === ContentKindsNames.TOPIC);
      },
      allSameKind() {
        const kind = this.firstNode.kind;
        return !this.nodes.some(node => node.kind !== kind);
      },
      anyIsDocument() {
        return this.nodes.some(n => n.kind === ContentKindsNames.DOCUMENT);
      },
      anyIsTopic() {
        return this.nodes.some(n => n.kind === ContentKindsNames.TOPIC);
      },
      isImported() {
        return isImportedContent(this.firstNode);
      },
      newContent() {
        return !this.nodes.some(n => n[NEW_OBJECT]);
      },
      importedChannelLink() {
        return importedChannelLink(this.firstNode, this.$router);
      },
      importedChannelName() {
        return this.firstNode.original_channel_name;
      },
      requiresAccessibility() {
        return this.oneSelected && this.nodes.every(node => node.kind !== ContentKindsNames.TOPIC);
      },
      audioAccessibility() {
        return this.oneSelected && this.firstNode.kind === 'audio';
      },
      /* FORM FIELDS */
      title: generateGetterSetter('title'),
      description: generateGetterSetter('description'),
      randomizeOrder: generateExtraFieldsGetterSetter('randomize', true),
      author: generateGetterSetter('author'),
      provider: generateGetterSetter('provider'),
      aggregator: generateGetterSetter('aggregator'),
      copyright_holder: generateGetterSetter('copyright_holder'),
      contentTags: {
        get() {
          return intersection(...this.nodes.map(node => node.tags));
        },
        set(value) {
          const oldValue = intersection(...this.nodes.map(node => node.tags));
          // If selecting a tag, clear the text field
          if (value.length > (oldValue || []).length) {
            this.tagText = null;
            this.addNodeTags(difference(value, oldValue));
          } else {
            this.removeNodeTags(difference(oldValue, value));
          }
        },
      },
      role: generateGetterSetter('role_visibility'),
      language: generateGetterSetter('language'),
      accessibility: generateNestedNodesGetterSetter('accessibility_labels'),
      contentLevel: generateNestedNodesGetterSetterObject('grade_levels'),
      resourcesNeeded: generateNestedNodesGetterSetterObject('learner_needs'),
      forBeginners: {
        get() {
          const value = this.resourcesNeeded[ResourcesNeededTypes.FOR_BEGINNERS];
          return value && value.length === this.nodes.length;
        },
        set(value) {
          if (value) {
            this.resourcesNeeded = {
              ...this.resourcesNeeded,
              [ResourcesNeededTypes.FOR_BEGINNERS]: this.nodeIds,
            };
          } else {
            const newMap = { ...this.resourcesNeeded };
            delete newMap[ResourcesNeededTypes.FOR_BEGINNERS];
            this.resourcesNeeded = newMap;
          }
        },
      },
      contentLearningActivities: generateNestedNodesGetterSetterObject('learning_activities'),
      categories: generateNestedNodesGetterSetterObject('categories'),
      license() {
        return this.getValueFromNodes('license');
      },
      license_description() {
        return this.getValueFromNodes('license_description');
      },
      licenseItem: {
        get() {
          return {
            license: this.license && this.license.toString() ? this.license : null,
            license_description: (this.license_description || '').toString(),
          };
        },
        set(value) {
          this.update(value);
        },
      },
      thumbnail: {
        get() {
          return this.nodeFiles.find(f => f.preset.thumbnail);
        },
        set(file) {
          file ? this.updateFile(file) : this.thumbnail ? this.deleteFile(this.thumbnail) : null;
        },
      },
      thumbnailEncoding: generateGetterSetter('thumbnail_encoding'),
      completionAndDuration: {
        get() {
          const options = this.getExtraFieldsValueFromNodes('options', {});
          if (options === nonUniqueValue) {
            return nonUniqueValue;
          }
          const { completion_criteria, modality } = options;
          const suggested_duration_type =
            this.getExtraFieldsValueFromNodes('suggested_duration_type');
          const suggested_duration = this.getValueFromNodes('suggested_duration');
          return {
            suggested_duration,
            suggested_duration_type,
            modality,
            ...(completion_criteria || {}),
          };
        },
        set({ completion_criteria, suggested_duration, suggested_duration_type, modality }) {
          const options = { completion_criteria, modality };
          this.updateExtraFields({ options });
          this.updateExtraFields({ suggested_duration_type });
          this.update({ suggested_duration });
        },
      },
      /* COMPUTED PROPS */
      disableAuthEdits() {
        return this.nodes.some(node => node.freeze_authoring_data);
      },
      disableSourceEdits() {
        return this.nodes.some(isDisableSourceEdits);
      },
      detectedImportText() {
        const count = this.nodes.filter(node => node.freeze_authoring_data).length;
        return this.$tr('detectedImportText', { count });
      },
      oneSelected() {
        return this.nodes.length === 1;
      },
      languageHint() {
        const topLevel = this.nodes.some(node => node.parent === this.currentChannel.main_tree);
        return topLevel ? this.$tr('languageChannelHelpText') : this.$tr('languageHelpText');
      },
      copyrightHolderRequired() {
        // Needs to appear when any of the selected licenses require a copyright holder
        return this.nodes.some(
          node =>
            findLicense(node.license, { copyright_holder_required: false })
              .copyright_holder_required,
        );
      },
      titleRules() {
        return getTitleValidators().map(translateValidator);
      },
      copyrightHolderRules() {
        if (this.disableAuthEdits || !this.isUnique(this.copyright_holder)) {
          return [];
        }
        return getCopyrightHolderValidators().map(translateValidator);
      },
      nodeFiles() {
        return (this.firstNode && this.getContentNodeFiles(this.firstNode.id)) || [];
      },
      fileDuration() {
        return getFileDuration(this.nodeFiles, this.firstNode.kind);
      },
      videoSelected() {
        return this.oneSelected && this.firstNode.kind === ContentKindsNames.VIDEO;
      },
      // Dynamically compute the size of the VFlex used
      /* eslint-disable-next-line vue/no-unused-properties */
      mdValue() {
        return this.oneSelected ? 'md6' : 'md12';
      },
    },
    watch: {
      nodes: {
        deep: true,
        handler() {
          // Handles both when loading a node and when making a change
          this.tagText = null;
          this.$nextTick(this.handleValidation);
        },
      },
    },
    mounted() {
      this.$nextTick(this.handleValidation);
    },
    methods: {
      ...mapActions(['setUnsavedChanges']),
      ...mapActions('contentNode', ['updateContentNode', 'addTags', 'removeTags']),
      ...mapActions('file', ['updateFile', 'deleteFile']),
      saveNode: memoizeDebounce(
        function (id) {
          this.saveFromDiffTracker(id);
        },
        1000,
        { trailing: true },
      ),
      saveFromDiffTracker(id) {
        if (this.diffTracker[id]) {
          this.changed = true;
          return this.updateContentNode({ id, checkComplete: true, ...this.diffTracker[id] }).then(
            () => {
              delete this.diffTracker[id];
              return this.changed;
            },
          );
        }
        return Promise.resolve(this.changed);
      },
      /*
       * @public
       */
      immediateSaveAll() {
        return Promise.all(Object.keys(this.diffTracker).map(this.saveFromDiffTracker)).then(
          results => this.changed || results.some(Boolean),
        );
      },
      update(payload) {
        this.nodeIds.forEach(id => {
          this.$set(this.diffTracker, id, {
            ...(this.diffTracker[id] || {}),
            ...payload,
          });
          this.setUnsavedChanges(true);
          this.saveNode(id);
        });
      },
      updateExtraFields(extra_fields) {
        this.nodeIds.forEach(id => {
          const existingData = this.diffTracker[id] || {};
          this.$set(this.diffTracker, id, {
            ...existingData,
            extra_fields: {
              ...(existingData.extra_fields || {}),
              ...extra_fields,
            },
          });
          this.setUnsavedChanges(true);
          this.saveNode(id);
        });
      },
      addNodeTags(tags) {
        this.addTags({ ids: this.nodeIds, tags });
      },
      removeNodeTags(tags) {
        this.removeTags({ ids: this.nodeIds, tags });
      },
      isUnique(value) {
        return value !== nonUniqueValue;
      },
      getValueFromNodes(key) {
        const results = uniq(
          this.nodes.map(node => {
            if (Object.prototype.hasOwnProperty.call(this.diffTracker[node.id] || {}, key)) {
              return this.diffTracker[node.id][key];
            }
            return node[key] || null;
          }),
        );
        return getValueFromResults(results);
      },
      getExtraFieldsValueFromNodes(key, defaultValue = null) {
        const results = uniqWith(
          this.nodes.map(node => {
            if (
              Object.prototype.hasOwnProperty.call(
                this.diffTracker[node.id] || {},
                'extra_fields',
              ) &&
              Object.prototype.hasOwnProperty.call(this.diffTracker[node.id].extra_fields, key)
            ) {
              return this.diffTracker[node.id].extra_fields[key];
            }
            return get(node.extra_fields, key, defaultValue);
          }),
          isEqual,
        );
        return getValueFromResults(results);
      },
      getPlaceholder(field) {
        // Should only show if multiple nodes are selected with different
        // values for the field (e.g. if author field is different on the selected nodes)
        return this.oneSelected || this.isUnique(this[field]) ? '' : '---';
      },
      handleValidation() {
        if (this.$refs.form) {
          !this.newContent ? this.$refs.form.resetValidation() : this.$refs.form.validate();
        }
      },
      setEncoding(encoding) {
        this.thumbnailEncoding = encoding;
      },
      trackClick(label) {
        this.$analytics.trackClick('channel_editor_modal_details', label);
      },
      trackPreview() {
        this.$analytics.trackAction('channel_editor_modal_preview', 'Preview', {
          eventLabel: 'File',
        });
      },
      subtitleFileLanguageComparison(file) {
        if (this.oneSelected && this.language === file.language) {
          this.accessibility = [...this.accessibility, AccessibilityCategories.CAPTIONS_SUBTITLES];
        }
      },
    },
    $trs: {
      basicInfoHeader: 'Basic information',
      audienceHeader: 'Audience',
      sourceHeader: 'Source',
      thumbnailHeader: 'Thumbnail',
      titleLabel: 'Title',
      languageHelpText: 'Leave blank to use the folder language',
      languageChannelHelpText: 'Leave blank to use the channel language',
      importedFromButtonText: 'Imported from {channel}',
      detectedImportText:
        '{count, plural,\n =1 {# resource has view-only permission}\n other {# resources have view-only permission}}',
      authorLabel: 'Author',
      authorToolTip: 'Person or organization who created this content',
      providerLabel: 'Provider',
      providerToolTip: 'Organization that commissioned or is distributing the content',
      aggregatorLabel: 'Aggregator',
      aggregatorToolTip:
        'Website or org hosting the content collection but not necessarily the creator or copyright holder',
      copyrightHolderLabel: 'Copyright holder',
      descriptionLabel: 'Description',
      tagsLabel: 'Tags',
      noTagsFoundText: 'No results found for "{text}". Press \'Enter\' key to create a new tag',
      assessmentOptionsLabel: 'Assessment options',
      randomizeQuestionLabel: 'Randomize question order for learners',
      completionLabel: 'Completion',
    },
  };

</script>


<style lang="scss" scoped>

  // decrese default Vuetify margin to allow for precise
  // alignment of help and info icons
  ::v-deep .v-input__append-outer {
    margin-top: 6px !important;
  }

  ::v-deep a,
  ::v-deep a:hover {
    color: inherit;
    text-decoration: none;
  }

  .details-edit-view {
    padding: 10px;

    ::v-deep .subheading {
      margin-bottom: 8px;
      font-weight: bold;
    }

    .section .flex {
      margin: 12px 0 !important;
    }

    .auth-section {
      ::v-deep .v-autocomplete .v-input__append-inner {
        visibility: hidden;
      }
    }

    .v-form {
      max-width: 960px;

      .tagbox {
        ::v-deep .v-select__selections {
          min-height: 0 !important;
        }

        ::v-deep .v-chip__content {
          color: black; // Read-only tag box grays out tags
        }

        ::v-deep .v-input__append-inner {
          display: none;
        }
      }

      ::v-deep .v-input--is-readonly {
        ::v-deep label {
          color: var(--v-grey-darken2) !important;
        }

        ::v-deep .v-input__append-inner {
          display: none;
        }

        ::v-deep .v-input__slot {
          &::before {
            border-style: dotted;
          }

          &::after {
            border: 0;
          }
        }
      }

      .basicInfoColumn {
        display: flex;

        ::v-deep .v-input {
          // Stretches the "Description" text area to fill the column vertically
          align-items: stretch;
        }

        ::v-deep .v-input__control {
          // Makes sure that the character count does not get pushed to second column
          flex-wrap: nowrap;
        }
      }
    }
  }

  // Positions help text underneath
  p.help {
    position: relative;
    top: -20px;
    left: 10px;
    margin-bottom: 14px;
    font-size: 12px;
    color: var(--v-text-lighten4);
  }

</style>
