<template>

  <Uploader ref="uploader" :presetID="presetID">
    <Alert
      ref="error"
      :header="$tr('thumbnailGenerationFailedHeader')"
      :text="$tr('thumbnailGenerationFailedText')"
    />
    <slot :generate="generate"></slot>
  </Uploader>

</template>

<script>

  import { mapActions } from 'vuex';
  import chunk from 'lodash/chunk';
  import min from 'lodash/min';
  import map from 'lodash/map';
  import max from 'lodash/max';
  import pdfJSLib from 'pdfjs-dist';
  import Alert from 'shared/views/Alert';
  import Uploader from 'frontend/channelEdit/views/files/Uploader';

  const MAX_AUDIO_SAMPLE_SIZE = 64000;

  export default {
    name: 'ThumbnailGenerator',
    components: {
      Alert,
      Uploader,
    },
    props: {
      width: {
        type: Number,
        default: 320,
      },
      presetID: {
        type: String,
        required: true,
      },
      filePath: {
        type: String,
        required: false,
      },
    },
    computed: {
      height() {
        return (this.width * 9) / 16;
      },
      isVideo() {
        return this.filePath.endsWith('mp4');
      },
      isAudio() {
        return this.filePath.endsWith('mp3');
      },
      isHTML() {
        return this.filePath.endsWith('zip');
      },
      isPDF() {
        return this.filePath.endsWith('pdf');
      },
      isEPub() {
        return this.filePath.endsWith('epub');
      },
    },
    methods: {
      ...mapActions('task', ['startTask', 'clearCurrentTask']),
      ...mapActions('file', ['getAudioData', 'generateThumbnail']),
      handleError(error) {
        this.$emit('error', error);
        this.$refs.error.prompt();
      },
      generateVideoThumbnail() {
        let video = document.createElement('video');
        video.width = this.width;
        video.height = this.height;
        video.crossOrigin = 'anonymous';
        video.preload = 'metadata';
        video.src = this.filePath;
        video.onloadedmetadata = () => {
          video.currentTime = (video.duration / 4) * 3;
        };
        video.ontimeupdate = () => {
          let canvas = document.createElement('canvas');
          canvas.getContext('2d').drawImage(video, 0, 0, this.width, this.height);
          this.handleGenerated(canvas.toDataURL('image/png'));
        };
      },
      generateAudioThumbnail() {
        let canvas = document.createElement('canvas');
        let context = canvas.getContext('2d');
        // Add light background
        context.fillStyle = this.$vuetify.theme.primaryBackground;
        context.fillRect(0, 0, this.width, this.height);
        context.fillStyle = this.$vuetify.theme.primary;
        this.getAudioData(this.filePath)
          .then(data => {
            let sampleStart = Math.max(0, (data.length - MAX_AUDIO_SAMPLE_SIZE) / 2);
            let sampleEnd = Math.min(data.length, (data.length + MAX_AUDIO_SAMPLE_SIZE) / 2);
            data = data.slice(sampleStart, sampleEnd);
            let amp = this.height / 2;
            let peaks = chunk(data, Math.ceil(data.length / this.width));

            // Go through set of peaks and draw the max range (highest peak to lowest peak)
            peaks.forEach((peakArray, x) => {
              let minPeak = min(peakArray);
              let maxPeak = max(peakArray);
              context.fillRect(x, (1 + minPeak) * amp, 1, Math.max(1, (maxPeak - minPeak) * amp));
            });
            this.handleGenerated(canvas.toDataURL('image/png'));
          })
          .catch(this.handleError);
      },
      generatePDFThumbnail() {
        let canvas = document.createElement('canvas');
        pdfJSLib
          .getDocument(this.filePath)
          .promise.then(pdf => {
            pdf
              .getPage(1)
              .then(page => {
                let viewport = page.getViewport({ scale: 1 });
                page
                  .render({
                    canvasContext: canvas.getContext('2d'),
                    viewport: page.getViewport({
                      scale: this.width / viewport.width,
                    }),
                  })
                  .promise.then(() => {
                    this.handleGenerated(canvas.toDataURL('image/png'));
                  })
                  .catch(this.handleError);
              })
              .catch(this.handleError);
          })
          .catch(this.handleError);
      },
      generateThumbnailOnServer() {
        let filename = this.filePath.split('/');
        this.generateThumbnail(filename[filename.length - 1])
          .then(response => {
            let payload = {
              task: response.data,
              resolveCallback: result => {
                this.clearCurrentTask();
                this.handleGenerated(result);
              },
              rejectCallback: this.handleError,
            };
            this.startTask(payload);
          })
          .catch(this.handleError);
      },
      handleGenerated(encoding) {
        // If there isn't an encoding, throw an error
        if (!encoding) {
          this.handleError();
          return;
        }
        let chunks = chunk(atob(encoding.split(',')[1]), 512);
        let byteArrays = map(
          chunks,
          chunk => new Uint8Array(map(chunk.join('').toString(), s => s.charCodeAt(0)))
        );
        let filename = this.$tr('generatedDefaultFilename') + '.png';
        let file = new File(byteArrays, filename, { type: 'image/png' });
        this.$refs.uploader
          .handleUploads([file])
          .then(files => {
            if (files.length) {
              this.$emit('uploading', files);
            } else {
              this.handleError();
            }
          })
          .catch(this.handleError);
      },
      generate() {
        this.$emit('generating');
        if (this.isVideo) {
          this.generateVideoThumbnail();
        } else if (this.isAudio) {
          this.generateAudioThumbnail();
        } else if (this.isPDF) {
          this.generatePDFThumbnail();
        } else if (this.isEPub) {
          // TODO: getCoverURL isn't working on epubjs, but would be good to
          // to update once that's fixed to keep logic on client side
          // Issue: https://github.com/futurepress/epub.js/issues/1023
          this.generateThumbnailOnServer();
        } else if (this.isHTML) {
          this.generateThumbnailOnServer();
        } else {
          this.handleError();
        }
      },
    },
    $trs: {
      thumbnailGenerationFailedHeader: 'Unable to generate thumbnail',
      thumbnailGenerationFailedText: 'There was a problem generating a thumbnail for this item',
      generatedDefaultFilename: 'Generated thumbnail',
    },
  };

</script>
