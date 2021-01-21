<template>

  <!-- Wait for node to load before listing -->
  <VListTile
    v-if="node"
    :style="{ backgroundColor }"
    class="px-1 py-0"
    @click.stop="selected = [nodeId]"
  >
    <VListTileAction style="min-width:min-content;" @click.stop>
      <Checkbox
        v-model="selected"
        :value="nodeId"
      />
    </VListTileAction>

    <VListTileAction style="min-width:min-content;">
      <ContentNodeIcon :kind="node.kind" :showColor="false" />
    </VListTileAction>
    <VListTileContent class="px-2 py-0">
      <VListTileTitle class="notranslate">
        {{ node.title }}
      </VListTileTitle>
      <VListTileSubTitle v-if="subtitleText">
        {{ subtitleText }}
      </VListTileSubTitle>
    </VListTileContent>
    <VSpacer />
    <VListTileAction class="mr-1 status-indicator">
      <div>
        <div v-if="!uploadingFiles.length">
          <Icon v-if="!nodeIsValid" color="red" class="error-icon">
            error
          </Icon>
        </div>
        <VTooltip v-else-if="erroredFiles.length" top>
          <template v-slot:activator="{ on }">
            <Icon color="red" v-on="on">
              error
            </Icon>
          </template>
          <span>{{ errorMessage(erroredFiles[0].checksum) }}</span>
        </VTooltip>
        <Icon
          v-else-if="showUploadProgress && progress >= 1"
          color="secondary"
          data-test="done"
        >
          check_circle
        </Icon>
        <VProgressCircular
          v-else-if="showUploadProgress"
          :size="20"
          :width="4"
          :value="progress * 100"
          color="greenSuccess"
          rotate="270"
          data-test="progress"
        />
      </div>
    </VListTileAction>
    <VListTileAction v-if="canRemove">
      <VBtn icon flat class="remove-item" @click.stop="removeNode">
        <Icon>clear</Icon>
      </VBtn>
    </VListTileAction>
    <Uploader :presetID="thumbnailPresetID" :uploadCompleteHandler="handleUploadComplete">
      <template #default="{ handleFiles }">
        <ThumbnailGenerator
          ref="generator"
          :nodeId="nodeId"
          :handleFiles="handleFiles"
        />
      </template>
    </Uploader>

  </VListTile>

</template>

<script>

  import differenceBy from 'lodash/differenceBy';
  import { mapActions, mapGetters } from 'vuex';
  import { RouterNames } from '../../constants';
  import { fileSizeMixin, fileStatusMixin } from 'shared/mixins';
  import ContentNodeIcon from 'shared/views/ContentNodeIcon';
  import Checkbox from 'shared/views/form/Checkbox';
  import {ContentKindsNames} from 'shared/leUtils/ContentKinds';

  import ThumbnailGenerator from '../../views/files/thumbnails/ThumbnailGenerator';
  import Uploader from 'shared/views/files/Uploader';

  const kindToContentDefaultKeyMap = {
    [ContentKindsNames.AUDIO]: 'auto_derive_audio_thumbnail',
    [ContentKindsNames.HTML5]: 'auto_derive_html5_thumbnail',
    [ContentKindsNames.VIDEO]: 'auto_derive_video_thumbnail',
    [ContentKindsNames.DOCUMENT]: 'auto_derive_document_thumbnail',
  };

  export default {
    name: 'EditListItem',
    components: {
      Checkbox,
      ContentNodeIcon,
      Uploader,
      ThumbnailGenerator,
    },
    mixins: [fileSizeMixin, fileStatusMixin],
    props: {
      value: {
        type: Array,
        default: () => [],
      },
      nodeId: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        showUploadProgress: false,
      };
    },
    computed: {
      ...mapGetters('currentChannel', ['currentChannel', 'canEdit']),
      ...mapGetters('contentNode', [
        'getContentNode',
        'getContentNodeIsValid',
        'getContentNodeThumbnailPreset'
      ]),
      ...mapGetters('file', ['getContentNodeFiles', 'getFileUpload']),
      selected: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
      node() {
        return this.getContentNode(this.nodeId);
      },
      nodeIsValid() {
        return this.getContentNodeIsValid(this.nodeId);
      },
      files() {
        return this.getContentNodeFiles(this.nodeId);
      },
      backgroundColor() {
        if (this.selected.includes(this.nodeId)) {
          return this.selected.length > 1
            ? this.$vuetify.theme.primaryBackground
            : this.$vuetify.theme.greyBackground;
        }
        return 'transparent';
      },
      subtitleText() {
        if (this.node.kind === 'exercise') {
          return this.$tr('questionCount', { count: this.node.assessment_item_count || 0 });
        }
        return this.statusMessage(this.node.files);
      },
      canRemove() {
        return (
          this.canEdit &&
          (this.$route.name === RouterNames.ADD_TOPICS ||
            this.$route.name === RouterNames.UPLOAD_FILES ||
            this.$route.name === RouterNames.ADD_EXERCISE)
        );
      },
      uploadingFiles() {
        return this.files.map(f => this.getFileUpload(f.id));
      },
      erroredFiles() {
        return this.files.filter(f => f.error);
      },
      progress() {
        return this.uploadingFiles.reduce((sum, f) => {
          if(f.progress === undefined) {
            return 1 + sum;
          } else if(f.progress) {
            return f.progress + sum;
          }
          return sum
        }, 0) / this.uploadingFiles.length;
      },
      thumbnailPresetID() {
        return this.getContentNodeThumbnailPreset(this.nodeId);
      },
    },
    watch: {
      uploadingFiles(newList, oldList) {
        // Show progress spinner if there are new uploads
        const newFiles = differenceBy(newList, oldList, 'id');
        if(newFiles.length) {
          this.showUploadProgress = true;
        } else {
          setTimeout(() => {
            this.showUploadProgress = false;
          }, 2000);
        }

        // Trigger automatic thumbnail generation on first upload for a node
        if(
          this.$route.name === RouterNames.UPLOAD_FILES &&
          !oldList.length && newList.length
        ) {
          this.autoGenerateThumbnail();
        }
      }
    },
    methods: {
      ...mapActions('contentNode', ['deleteContentNode']),
      ...mapActions('file', ['updateFile']),
      removeNode() {
        this.deleteContentNode(this.nodeId).then(() => {
          this.$emit('removed', this.nodeId);
        });
      },
      autoGenerateThumbnail() {
        // Check if thumbnail exists or user has turned off automatic thumbnail
        // generation for this node kind
        const contentDefaultKey = kindToContentDefaultKeyMap[this.node.kind];
        console.log(this.node.kind, kindToContentDefaultKeyMap, this.currentChannel.content_defaults)
        if(
          !this.files.some(f => f.preset.thumbnail) &&
          this.currentChannel.content_defaults[contentDefaultKey]
        ) {
          this.$refs.generator.generate();
        }
      },
      handleUploadComplete(fileUpload) {
        this.updateFile({
          ...fileUpload,
          contentnode: this.nodeId,
        });
      },
    },
    $trs: {
      questionCount: '{count, plural,\n =1 {# question}\n other {# questions}}',
    },
  };

</script>

<style lang="less" scoped>

  .v-list__tile__action {
    min-width: 30px;
    &.changed {
      min-width: 15px;
      font-weight: bold;
    }
  }

  .remove-item {
    display: none;
  }

  /deep/ .v-list__tile {
    height: max-content !important;
    min-height: 64px;
    &:hover .remove-item {
      display: block;
    }
    .v-list__tile__sub-title {
      white-space: unset;
    }
  }

  .status-indicator {
    min-width: max-content;
  }

</style>
