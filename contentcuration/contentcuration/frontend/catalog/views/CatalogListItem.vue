<template>

  <v-container>
    <v-card :to="{name: 'CatalogDetails', params: {itemID: item.id}}">
      <v-container>
        <v-layout row>
          <v-flex xs3 class="image-wrapper">
            <VImg
              :src="item.thumbnail_url || '/static/img/kolibri_placeholder.png'"
              :aspect-ratio="16/9"
            />
          </v-flex>
          <v-flex xs9>
            <h2 v-if="!item.channel" class="subheading draft-text">
              {{ $tr('draftItem') }}
            </h2>
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

  export default {
    name: 'CatalogListItem',
    props: {
      item: {
        type: Object,
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
