<template>

  <v-container>
    <v-card :to="catalogDetailsLink">
      <v-container>
        <h2 v-if="!item.channel" class="subheading draft-text">
          {{ $tr('draftItem') }}
        </h2>
        <v-layout row wrap>
          <v-flex xs12 sm3 class="image-wrapper">
            <VImg
              :src="item.thumbnail_url || '/static/img/kolibri_placeholder.png'"
              :aspect-ratio="16/9"
            />
          </v-flex>
          <v-flex xs12 sm9>

            <h1 class="display">
              {{ item.name }}
            </h1>
            <br>
            <p>{{ item.description }}</p>
          </v-flex>
        </v-layout>
      </v-container>
    </v-card>
  </v-container>

</template>


<script>

  import { mapGetters } from 'vuex';
  import { RouterNames } from '../../constants';

  export default {
    name: 'CatalogListItem',
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
            itemID: this.itemID,
          },
        };
      },
    },
    $trs: {
      draftItem: 'Coming soon!',
    },
  };

</script>


<style lang="less" scoped>

  .image-wrapper {
    padding-right: 24px;
  }

  .draft-text {
    margin: 0;
    margin-top: -16px;
    font-weight: bold;
    color: gray;
    text-align: right;
  }

</style>
