<template>

  <div>
    <img
      height="24"
      width="74"
      class="mr-2 mb-1"
      :src="require('shared/images/le-logo.svg')"
    >
    <h1 class="notranslate" dir="auto">
      {{ $tr("catalogHeader") }}
    </h1>
    <DetailsRow :label="$tr('exported')">
      <template v-slot>
        {{ $formatDate(Date.now(), {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}
      </template>
    </DetailsRow>
    <DetailsRow :label="$tr('formatsHeading')">
      <template v-slot>
        <ExpandableList
          :noItemsText="$tr('defaultNoItemsText')"
          :items="kinds.map(translateConstant)"
          :expanded="true"
          inline
        />
      </template>
    </DetailsRow>
    <DetailsRow :label="$tr('containsHeading')">
      <span v-if="coachContent">
        {{ $tr('coachHeading') }}
      </span>
      <span v-if="exercises">
        {{ $tr('assessmentsIncludedText') }}
      </span>
      <span v-if="subtitles">
        {{ $tr('subtitlesIncludedText') }}
      </span>
    </DetailsRow>
    <DetailsRow :label="$tr('languagesHeading')">
      <template v-slot>
        <ExpandableList
          :noItemsText="$tr('defaultNoItemsText')"
          :items="languages"
          :expanded="true"
          inline
        />
      </template>
    </DetailsRow>
    <h2 class="notranslate" dir="auto">
      {{ $tr("numberOfChannels") }}
    </h2>
    <div v-for="(channel, index) in channelNames" :key="index">
      <span>{{ channel }}</span>
      <span class="right">{{ index + 1 }}</span>
    </div>
  </div>

</template>

<script>

  import DetailsRow from '../details/DetailsRow';
  import { constantsTranslationMixin } from 'shared/mixins';
  import ExpandableList from 'shared/views/ExpandableList';

  export default {
    name: 'ChannelCatalogFrontPage',
    components: {
      ExpandableList,
      DetailsRow,
    },
    mixins: [constantsTranslationMixin],
    props: {
      channelNames: {
        type: Array,
        required: true,
      },
      languages: {
        type: Array,
        required: true,
      },
      kinds: {
        type: Array,
        required: true,
      },
      coachContent: {
        type: Boolean,
        default: false,
      },
      exercises: {
        type: Boolean,
        default: false,
      },
      subtitles: {
        type: Boolean,
        default: false,
      },
    },
    computed: {},
    $trs: {
      catalogHeader: 'Kolibri Content Library channels',
      exported: 'Exported',
      formatsHeading: 'Formats',
      coachHeading: 'Coach resources',
      containsHeading: 'Contains',
      languagesHeading: 'Languages',
      subtitlesIncludedText: 'Subtitles',
      assessmentsIncludedText: 'Assessments',
      defaultNoItemsText: '---',
      numberOfChannels: '{ num } channels',
    },
  };

</script>


<style lang="less" scoped>

  .right {
    float: right;
  }

</style>
