<template>

  <div>
    <img
      height="99"
      width="148"
      :src="require('shared/images/le-logo.svg')"
    >
    <br>
    <h1 class="notranslate" dir="auto">
      {{ $tr("catalogHeader") }}
    </h1>
    <DetailsRow :label="$tr('exported')">
      <template #default>
        {{ $formatDate(Date.now(), {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}
      </template>
    </DetailsRow>
    <DetailsRow :label="$tr('formatsHeading')">
      <template #default>
        <ExpandableList
          :noItemsText="$tr('defaultNoItemsText')"
          :items="kinds.map(translateConstant)"
          :printing="true"
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
      <template #default>
        <ExpandableList
          :noItemsText="$tr('defaultNoItemsText')"
          :items="languages"
          :printing="true"
          inline
        />
      </template>
    </DetailsRow>
    <h2 class="notranslate" dir="auto">
      {{ $tr("numberOfChannels", { num: channelList.length }) }}
    </h2>
    <div v-for="(channel, index) in channelNames" :key="index" class="container">
      <span class="px-2 text">{{ channel }}</span>
      <span class="px-2 right text">{{ index + 1 }}</span>
    </div>
  </div>

</template>

<script>

  import flatMap from 'lodash/flatMap';
  import uniq from 'lodash/uniq';
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
      channelList: {
        type: Array,
        required: true,
      },
    },
    computed: {
      channelNames() {
        return this.channelList.map(channel => channel.name);
      },
      languages() {
        return uniq(flatMap(this.channelList, channel => channel.languages));
      },
      kinds() {
        return uniq(flatMap(this.channelList, channel => channel.kind_count.map(k => k.kind_id)));
      },
      coachContent() {
        return this.channelList.some(channel => channel.includes.coach_content);
      },
      exercises() {
        return this.channelList.some(channel => channel.includes.exercises);
      },
      subtitles() {
        return this.channelList.some(channel => {
          return channel.accessible_languages && channel.accessible_languages.length > 0;
        });
      },
    },
    $trs: {
      catalogHeader: 'Kolibri Content Library channels',
      exported: 'Exported',
      formatsHeading: 'Formats',
      coachHeading: 'Resources for coaches',
      containsHeading: 'Contains',
      languagesHeading: 'Languages',
      subtitlesIncludedText: 'Captions or subtitles',
      assessmentsIncludedText: 'Assessments',
      defaultNoItemsText: '---',
      numberOfChannels: '{ num } channels',
    },
  };

</script>


<style lang="scss" scoped>

  .container {
    min-width: 50%;
    max-width: 50%;
    margin: 0;
  }

  .right {
    float: right;
  }

</style>
