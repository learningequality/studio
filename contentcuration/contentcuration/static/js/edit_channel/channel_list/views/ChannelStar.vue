<template>
  <Star
    :starred="isStarred"
    @starred="addStar(channelID)"
    @unstarred="removeStar(channelID)"
  />
</template>

<script>

  import { mapActions, mapGetters } from 'vuex';
  import Star from 'edit_channel/sharedComponents/Star.vue';

  export default {
    name: 'ChannelStar',
    components: {
      Star,
    },
    props: {
      channelID: {
        type: String,
        required: true,
      },
    },
    computed: {
      ...mapGetters('channel_list', ['getChannel']),
      isStarred() {
        return this.getChannel(this.channelID).STARRED;
      },
    },
    methods: mapActions('channel_list', ['addStar', 'removeStar']),
  };

</script>
