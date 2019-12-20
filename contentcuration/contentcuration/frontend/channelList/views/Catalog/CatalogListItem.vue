<template>

  <v-card :to="catalogDetailsLink">
    <v-layout row wrap>
      <v-flex xs12 sm3 class="wrapper">
        <v-layout fill-height grid wrap>
          <v-flex grow xs12>
            <VImg
              :src="item.thumbnail_url || '/static/img/kolibri_placeholder.png'"
              :aspect-ratio="16/9"
            />
          </v-flex>
          <v-flex v-if="item.published" xs12 class="copy-text" d-flex>
            <CopyToken :token="item.primary_token" />
          </v-flex>
        </v-layout>
      </v-flex>
      <v-flex xs12 sm9 class="wrapper">
        <v-layout class="subheading" wrap>
          <v-flex class="metadata">
            <span v-if="item.language">
              {{ translateLanguage(item.language) }}
            </span>
            <span>
              {{ $tr('resourceCount', {count: item.count}) }}
            </span>
          </v-flex>
        </v-layout>
        <h1 class="display">
          {{ item.name }}
        </h1>
        <br>
        <p>{{ item.description }}</p>
      </v-flex>
    </v-layout>
  </v-card>

</template>

<script>

  import { mapGetters } from 'vuex';
  import { RouterNames } from '../../constants';
  import { constantsTranslationMixin } from 'shared/mixins';
  import CopyToken from 'shared/views/CopyToken';

  export default {
    name: 'CatalogListItem',
    components: {
      CopyToken,
    },
    mixins: [constantsTranslationMixin],
    props: {
      itemID: {
        type: String,
      },
    },
    computed: {
      ...mapGetters('catalog', ['getCatalogItem']),
      item() {
        return this.getCatalogItem(this.itemID);
      },
      catalogDetailsLink() {
        return {
          name: RouterNames.CATALOG_DETAILS,
          params: {
            channelId: this.itemID,
          },
        };
      },
    },
    $trs: {
      resourceCount: '{count, plural,\n =1 {# Resource}\n other {# Resources}}',
    },
  };

</script>


<style lang="less" scoped>

  .v-card {
    margin-bottom: 24px;
  }

  .wrapper {
    padding: 16px;
  }
  .metadata {
    color: grey;
    span:not(:last-child)::after {
      content: ' • ';
    }
  }

  .copy-text {
    height: min-content;
    /deep/ .v-text-field {
      height: min-content;
    }
  }

</style>
