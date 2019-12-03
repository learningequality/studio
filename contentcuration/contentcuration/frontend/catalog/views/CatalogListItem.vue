<template>

  <v-container>
    <v-card :to="{name: 'CatalogDetails', params: {itemID: item.id}}">
      <v-container>
        <v-layout row>
          <v-flex xs3>
            <v-container>
              <VImg
                :src="item.thumbnail_url || '/static/img/kolibri_placeholder.png'"
                :aspect-ratio="16/9"
              />
            </v-container>
          </v-flex>
          <v-flex xs9>
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
  };

</script>


<style lang="less" scoped>

</style>
