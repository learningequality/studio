<template>

  <div>
    <p>
      <h2>{{ storageUsagePercentage }}% storage used</h2>
      <KLinearLoader :progress="storageUsagePercentage" type="determinate" class="loader" />
      <div>{{ `${bytesToHuman(usedSpace)} GB of ${bytesToHuman(totalSpace)} GB` }}</div>
    </p>

    <KFixedGrid numCols="8" gutter="10">
      <template v-for="kind in kindKeys">
        <KFixedGridItem span="2" class='row' :key="`${kind}1`">
          <span :style="{ backgroundColor: kindColors(kind), padding: '8px', marginRight: '8px' }">
            <KIcon :icon="kind" :color="$themeTokens.textInverted" />
          </span>
          <span>{{ kindLabel(kind) }}</span>
        </KFixedGridItem>
        <KFixedGridItem span="6" class='row' :key="`${kind}2`">
          <span>{{ `${size(kind)} GB` }}</span>
        </KFixedGridItem>
      </template>
    </KFixedGrid>

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
    totalSpace() {
      return this.session.currentUser.disk_space;
    },
    availableSpace() {
      return this.session.currentUser.available_space;
    },
    usedSpace() {
      return this.totalSpace - this.availableSpace;
    },
    storageUsagePercentage() {
      return parseInt(this.usedSpace / this.totalSpace * 100);
    },
  },
  data() {
    return {
      showRequestForm: false,
    }
  },
  methods: {
    size(kind) {
      const bytes = this.storageUseByKind[kind] || 0;
      return this.bytesToHuman(bytes);
    },
    kindLabel(kind) {
      return kindLabels[kind];
    },
    kindColors(kind) {
      return kindColors[kind];
    },
    bytesToHuman(val) {
      const num = parseInt(val);
      const bytesPerGB = Math.pow(1024, 3);
      return parseFloat(val / bytesPerGB).toFixed(2);
    }
  },
}

</script>


<style lang="scss" scoped>

  .row {
    padding: 16px 0;
  }

  /deep/.ui-progress-linear {
    background: #e9e9e9;
    max-width: 75%;
    margin: 8px 0;
    height: 8px!important;

    /deep/.is-determinate {
      height: 8px!important;
    }

  }

</style>
