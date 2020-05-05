<template>
  
  <form @submit.prevent="submit">
  </form>

</template>


<script>
  const formElements = {
    "Nature of your content": [
      {
        key: 'storage_amount',
        placeholder: 'Storage amount requested (e.g. 10GB)',
        label: '',
      },
      {
        key: 'num_resource',
        placeholder: 'Number of resources',
        label: 'Approximately how many individual resources are you planning to upload?',
      },
      {
        key: 'avg_size',
        placeholder: 'Size',
        label: 'Average size of each resource',
      },
      {
        key: 'type_of_content',
        placeholder: 'Type of content',
        label: 'What kind of content are you uploading? Please specify',
      },
      {
        key: 'author_curator_aggregator',
        placeholder: 'Response',
        label: 'Who is the author (creator), curator (organizer), and/or aggregator (maintainer) of your content? Please specify',
      },
      {
        key: 'sample_link',
        placeholder: 'Paste link here',
        label: 'Please provide a link to a sample of your content (on Studio or from source site)',
      },
    ],
    "Who can use your content?": [
      {
        key: 'license',
        checkbox_options: [
          "CC BY",
          "CC BY-SA",
          "CC BY-ND",
          "CC BY-NC",
          "CC BY-NC-SA",
          "CC BY-NC-ND",
          "All rights reserved",
          "Public domain",
          "Special permissions",
        ],
      },
    ],
  }


  export default {
    name: 'RequestForm',
    methods: {
      submit() {
        return undefined;
      },
    },
  }

</script>


<style lang="scss" scoped>

</style>
