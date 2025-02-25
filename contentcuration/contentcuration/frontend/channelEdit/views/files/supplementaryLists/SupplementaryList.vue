<template>

  <VList>
    <SupplementaryItem
      v-for="file in files"
      :key="file.id"
      :file="file"
      :presetID="presetID"
      :readonly="readonly"
      :uploadCompleteHandler="newFile => replace(file, newFile)"
      @remove="deleteFile(file)"
    />
    <Uploader
      v-if="!readonly"
      :readonly="!addingFile || !selectedLanguage"
      :presetID="presetID"
      :uploadingHandler="add"
      @upload="$emit('upload')"
    >
      <template #default="{ openFileDialog }">
        <VListTile
          inactive
          class="languageTile py-2"
          :class="
            $computedClass({
              ':hover': { backgroundColor: $themePalette.grey.v_100 },
            })
          "
        >
          <VListTileContent v-if="!addingFile">
            <ActionLink
              data-test="add-file"
              :text="addText"
              @click="addingFile = true"
            />
          </VListTileContent>
          <VListTileContent
            v-else
            class="captionLanguageDropdown"
          >
            <LanguageDropdown
              id="captionLanguage"
              v-model="selectedLanguage"
              data-test="select-language"
              dropAbove
              :excludeLanguages="currentLanguages"
              hide-details
            />
          </VListTileContent>
          <VListTileContent v-if="selectedLanguage">
            <VListTileTitle>
              <ActionLink
                data-test="upload-file"
                style="margin-left: 16px"
                :text="$tr('selectFileText')"
                @click="openFileDialog"
              />
            </VListTileTitle>
          </VListTileContent>
          <VSpacer />
          <VListTileAction v-if="addingFile">
            <VBtn
              icon
              @click="reset"
            >
              <Icon icon="clear" />
            </VBtn>
          </VListTileAction>
        </VListTile>
      </template>
    </Uploader>
  </VList>

</template>


<script>

  import { mapActions, mapGetters } from 'vuex';
  import sortBy from 'lodash/sortBy';
  import uniqBy from 'lodash/uniqBy';
  import SupplementaryItem from './SupplementaryItem';
  import LanguageDropdown from 'shared/views/LanguageDropdown';
  import Uploader from 'shared/views/files/Uploader';

  export default {
    name: 'SupplementaryList',
    components: {
      SupplementaryItem,
      LanguageDropdown,
      Uploader,
    },
    props: {
      presetID: {
        type: String,
        required: true,
      },
      addText: {
        type: String,
        default: '',
      },
      readonly: {
        type: Boolean,
        default: false,
      },
      nodeId: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        addingFile: false,
        selectedLanguage: null,
      };
    },
    computed: {
      ...mapGetters('file', ['getContentNodeFiles']),
      files() {
        return uniqBy(
          sortBy(
            this.getContentNodeFiles(this.nodeId).filter(f => f.preset.id === this.presetID),
            f => f.language.native_name,
          ),
          f => f.language.id,
        );
      },
      currentLanguages() {
        return this.files.map(f => f.language.id);
      },
    },
    methods: {
      ...mapActions('file', ['updateFile', 'deleteFile']),
      add(file) {
        this.makeFile(file).then(f => {
          this.$emit('addFile', f);
          this.reset();
        });
      },
      makeFile(file) {
        return this.updateFile({
          ...file,
          language: file.language || this.selectedLanguage,
          preset: this.presetID,
          contentnode: this.nodeId,
        });
      },
      replace(oldFile, newFile) {
        newFile.language = oldFile.language;
        return Promise.all([this.makeFile(newFile), this.deleteFile(oldFile)]);
      },
      reset() {
        this.addingFile = false;
        this.selectedLanguage = null;
      },
    },
    $trs: {
      selectFileText: 'Select file',
    },
  };

</script>


<style lang="scss" scoped>

  ::v-deep .languageTile > .v-list__tile {
    height: 56px;
  }

  .captionLanguageDropdown {
    max-width: 250px;
    height: auto;
    overflow: visible;
  }

</style>
