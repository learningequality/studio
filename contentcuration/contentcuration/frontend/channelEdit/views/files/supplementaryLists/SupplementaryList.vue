<template>

  <VList two-line>
    <SupplementaryItem
      v-for="file in files"
      :key="file.id"
      :file="file"
      :presetID="presetID"
      :readonly="readonly"
      @uploading="replace"
      @remove="remove"
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

  import { mapGetters, mapMutations } from 'vuex';
  import sortBy from 'lodash/sortBy';
  import SupplementaryItem from './SupplementaryItem';
  import Constants from 'edit_channel/constants/index';
  import LanguageDropdown from 'edit_channel/sharedComponents/LanguageDropdown';
  import ActionLink from 'edit_channel/sharedComponents/ActionLink';
  import Uploader from 'frontend/channelEdit/views/files/Uploader';

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
      ...mapGetters('contentNode', ['getContentNode']),
      ...mapGetters('file', ['getFiles']),
      node() {
        return this.getContentNode(this.nodeId);
      },
      files() {
        return sortBy(
          this.getFiles(this.node.files).filter(f => f.preset.id === this.presetID),
          f => f.language.native_name
        );
      },
      currentLanguages() {
        return this.files.map(f => f.language);
      },
    },
    methods: {
      ...mapMutations('edit_modal', {
        addFileToNode: 'ADD_FILE_TO_NODE',
        removeFileFromNode: 'REMOVE_FILE_FROM_NODE',
      }),
      add(files) {
        files[0].language = Constants.Languages.filter(l => l.id === this.selectedLanguage)[0];
        this.addFileToNode({
          index: this.nodeIndex,
          file: files[0],
        });
        this.reset();
      },
      replace(newFile) {
        this.addFileToNode({
          index: this.nodeIndex,
          file: newFile,
        });
      },
      remove(fileID) {
        this.removeFileFromNode({
          fileID,
          index: this.nodeIndex,
        });
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
