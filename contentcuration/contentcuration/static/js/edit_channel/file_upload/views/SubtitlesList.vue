<template>

  <div>
    <h1 class="subheading">
      {{ $tr('subtitlesHeader') }}
      <VTooltip bottom>
        <template v-slot:activator="{ on }">
          <Icon color="primary" v-on="on">
            help_outline
          </Icon>
        </template>
        <span>{{ $tr('acceptedFormatsTooltip', {extensions}) }}</span>
      </VTooltip>
    </h1>
    <SupplementaryList
      :presetID="subtitlePreset.id"
      :addText="$tr('addSubtitleText')"
      :readonly="readonly"
      :nodeIndex="nodeIndex"
    />
  </div>

</template>

<script>

  import uniq from 'lodash/uniq';
  import SupplementaryList from './SupplementaryList';
  import Constants from 'edit_channel/constants/index';

  export default {
    name: 'SubtitlesList',
    components: {
      SupplementaryList,
    },
    props: {
      nodeIndex: {
        type: Number,
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
        return Constants.FormatPresets.filter(p => p.subtitle)[0];
      },
    },
    $trs: {
      subtitlesHeader: 'Subtitles',
      acceptedFormatsTooltip: 'Accepted formats: {extensions}',
      addSubtitleText: 'Add subtitle',
    },
  };

</script>

<style lang="less" scoped>

  .v-icon {
    font-size: 14pt;
    vertical-align: top;
  }

</style>
