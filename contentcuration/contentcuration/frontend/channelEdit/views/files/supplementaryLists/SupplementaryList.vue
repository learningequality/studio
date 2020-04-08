<template>

  <VList two-line>
    <SupplementaryItem
      v-for="file in files"
      :key="file.id"
      :file="file"
      :languageId="file.language.id"
      :presetID="presetID"
      :readonly="readonly"
      @uploading="newFile => replace(file, newFile)"
      @remove="deleteFile(file)"
    />
    <Uploader
      v-if="!readonly"
      :readonly="!addingFile || !selectedLanguage"
      :presetID="presetID"
      @uploading="add"
    >
      <template #default="{openFileDialog}">
        <VListTile @click.stop>
          <VListTileContent v-if="!addingFile">
            <ActionLink
              data-test="add-file"
              :text="addText"
              @click="addingFile = true"
            />
          </VListTileContent>
          <VListTileContent v-else style="max-width: 150px;">
            <LanguageDropdown
              v-model="selectedLanguage"
              data-test="select-language"
              :excludeLanguages="currentLanguages"
            />
          </VListTileContent>
          <VListTileContent v-if="selectedLanguage">
            <VListTileTitle>
              <ActionLink
                data-test="upload-file"
                style="margin-left: 16px;"
                :text="$tr('selectFileText')"
                @click="openFileDialog"
              />
            </VListTileTitle>
          </VListTileContent>
          <VSpacer />
          <VListTileAction v-if="addingFile">
            <VBtn icon @click="reset">
              <Icon>
                clear
              </Icon>
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
  import SupplementaryItem from './SupplementaryItem';
  import LanguageDropdown from 'edit_channel/sharedComponents/LanguageDropdown';
  import ActionLink from 'edit_channel/sharedComponents/ActionLink';
  import Uploader from 'shared/views/files/Uploader';

  export default {
    name: 'SupplementaryList',
    components: {
      SupplementaryItem,
      LanguageDropdown,
      ActionLink,
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
        return sortBy(
          this.getContentNodeFiles(this.nodeId).filter(f => f.preset.id === this.presetID),
          f => f.language.native_name
        );
      },
      currentLanguages() {
        return this.files.map(f => f.language.id);
      },
    },
    methods: {
      ...mapActions('file', ['createFile', 'deleteFile']),
      add(files) {
        Promise.all(files.map(this.makeFile)).then(() => this.reset);
      },
      makeFile(file) {
        return this.createFile({
          ...file,
          language: this.selectedLanguage,
          preset: this.presetID,
          contentnode: this.nodeId,
        });
      },
      replace(oldFile, newFile) {
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
