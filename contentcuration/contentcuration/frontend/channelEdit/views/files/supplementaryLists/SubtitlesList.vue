<template>

  <div>
    <h1 class="subheading">
      {{ $tr('subtitlesHeader') }}
      <HelpTooltip :text="$tr('acceptedFormatsTooltip', { extensions })" bottom />
    </h1>
    <SupplementaryList
      :presetID="subtitlePreset.id"
      :addText="$tr('addSubtitleText')"
      :readonly="readonly"
      :nodeId="nodeId"
      @upload="trackUpload"
      @addFile="addFileHandler"
    />
  </div>

</template>

<script>

  import uniq from 'lodash/uniq';
  import SupplementaryList from './SupplementaryList';
  import FormatPresets from 'shared/leUtils/FormatPresets';
  import HelpTooltip from 'shared/views/HelpTooltip';

  export default {
    name: 'SubtitlesList',
    components: {
      SupplementaryList,
      HelpTooltip,
    },
    props: {
      nodeId: {
        type: String,
        required: true,
      },
      readonly: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      extensions() {
        return uniq(this.subtitlePreset.allowed_formats).join(', ');
      },
      subtitlePreset() {
        return FormatPresets.get('video_subtitle');
      },
    },
    methods: {
      trackUpload() {
        this.$analytics.trackAction('file_uploader', 'Upload', {
          eventLabel: 'Related file',
        });
      },
      addFileHandler(f) {
        this.$emit('addFile', f);
      },
    },
    $trs: {
      subtitlesHeader: 'Captions and subtitles',
      acceptedFormatsTooltip: 'Supported formats: {extensions}',
      addSubtitleText: 'Add captions',
    },
  };

</script>

<style lang="scss" scoped>

  .subheading ::v-deep .v-icon {
    margin-left: 4px;
    vertical-align: text-top;
  }

</style>
