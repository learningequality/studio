<template>

  <v-card :to="catalogDetailsLink">
    <v-container>
      <v-layout row wrap>
        <v-flex xs12 sm3 class="wrapper">
          <VImg
            :src="item.thumbnail_url || '/static/img/kolibri_placeholder.png'"
            :aspect-ratio="16/9"
          />
          <template v-if="item.published">
            <br>
            <CopyToken
              :token="item.primary_token"
              persistent-hint
              :hint="published"
            />
          </template>

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
    </v-container>
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
      published() {
        let publishedDate = this.$formatDate(this.item.last_published, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
        return this.$tr('lastPublished', { published: publishedDate });
      },
      catalogDetailsLink() {
        return {
          name: RouterNames.CATALOG_DETAILS,
          params: {
            itemID: this.itemID,
          },
        };
      },
    },
    $trs: {
      resourceCount: '{count, plural,\n =1 {# Resource}\n other {# Resources}}',
      lastPublished: 'Published {published}',
    },
  };

</script>


<style lang="less" scoped>

  .v-card {
    margin-bottom: 24px;
  }

  .wrapper {
    padding: 15px;
  }
  .metadata {
    color: grey;
    span:not(:last-child)::after {
      content: ' • ';
    }
  }

</style>
