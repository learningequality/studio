<template>

  <div>
    <p>
      <h2>10% storage used</h2>
      <KLinearLoader :progress="10" type="determinate" />
    </p>

    <p v-for="kind in kindKeys" :key="kind">
      <span :style="{ backgroundColor: kindColors(kind), padding: '8px' }">
        <KIcon :icon="kind" :color="$themeTokens.textInverted" />
      </span>
      <span>{{ kindLabel(kind) }}</span>
      <span>{{ `${size(kind)} GB` }}</span>
    </p>

    <p>
      <h2>Request more space</h2>
      <p>
        <span>Kindly use this form to request additional uploading storage for your Kolibri Studio account. If you import content from our public library in your channels, this content does not count towards your storage limit. <KButton appearance="basic-link" style="display: inline;" text="Learn more how to import content from other channels." @click="() => console.log('toimplement')" /></span>
      </p>
      <KButton appearance="basic-link" :text="showRequestForm ? 'Hide form' : 'Show form'" @click="showRequestForm = !showRequestForm" />
    </p>
    <RequestForm v-if="showRequestForm" />
  </div>

</template>


<script>

import { mapState } from 'vuex';
import RequestForm from './RequestForm';

const kindKeys = [
  'video',
  'exercise',
  'html5',
  'document',
  'audio',
  'slideshow',
];

const kindLabels = {
  video: "Videos",
  exercise: "Exercises",
  html5: "HTML apps",
  document: "Books",
  audio: "Audio",
  slideshow: "Slideshows",
};

const kindColors = {
  video: '#283593',
  exercise: '#4db6ac',
  html5: '#ff8f00',
  document: '#ff3d00',
  audio: '#f06292',
  slideshow: '#4ece90',
};



export default {
  name: 'Storage',
  components: { RequestForm },
  computed: {
    ...mapState(['session']),
    storageUseByKind() {
      return this.session.currentUser.space_used_by_kind
    },
    kindKeys() {
      return kindKeys;
    },
  },
  data() {
    return {
      showRequestForm: false,
    }
  },
  methods: {
    size(kind) {
      const bytes = this.storageUseByKind[kind];
      return bytes ? this.bytesToHuman(bytes) : 0;
    },
    kindLabel(kind) {
      return kindLabels[kind];
    },
    kindColors(kind) {
      return kindColors[kind];
    },
    bytesToHuman(val) {
      const num = parseInt(val);
      const bytesPerGB = 1073741824;
      return parseFloat(val / bytesPerGB).toFixed(2);
    }
  },
}

</script>


<style>

</style>
