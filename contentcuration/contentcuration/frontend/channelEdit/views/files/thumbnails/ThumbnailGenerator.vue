<template>

  <div>
    <Alert
      v-model="showErrorAlert"
      :header="$tr('thumbnailGenerationFailedHeader')"
      :text="$tr('thumbnailGenerationFailedText')"
    />
    <slot :generate="generate"></slot>
  </div>

</template>


<script>

  import { mapActions } from 'vuex';
  import chunk from 'lodash/chunk';
  import min from 'lodash/min';
  import map from 'lodash/map';
  import max from 'lodash/max';
  import epubJS from 'epubjs';
  import PDFJSWorker from '!!file-loader!pdfjs-dist/build/pdf.worker.min.js';
  import client from 'shared/client';
  import Alert from 'shared/views/Alert';
  import { ASPECT_RATIO, THUMBNAIL_WIDTH } from 'shared/constants';
  // Based off of solution here: https://github.com/mozilla/pdf.js/issues/7612#issuecomment-576807171
  const pdfJSLib = require('pdfjs-dist');

  pdfJSLib.GlobalWorkerOptions.workerSrc = PDFJSWorker;
  const MAX_AUDIO_SAMPLE_SIZE = 64000;

  export default {
    name: 'ThumbnailGenerator',
    components: {
      Alert,
    },
    props: {
      filePath: {
        type: String,
        required: false,
        default: '',
      },
      fileName: {
        type: String,
        required: false,
        default: '',
      },
      // Method to call to handle generated files
      handleFiles: {
        type: Function,
        required: true,
      },
    },
    data() {
      return {
        showErrorAlert: false,
        cancelled: false,
      };
    },
    computed: {
      width() {
        return THUMBNAIL_WIDTH;
      },
      height() {
        return this.width / ASPECT_RATIO;
      },
      isVideo() {
        return this.filePath.endsWith('mp4') || this.filePath.endsWith('webm');
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
      ...mapActions('file', ['getAudioData']),
      handleError(error) {
        this.$emit('error', error);
        this.showErrorAlert = true;
      },
      generateVideoThumbnail() {
        const video = document.createElement('video');
        video.width = this.width;
        video.height = this.height;
        video.crossOrigin = 'anonymous';
        video.preload = 'metadata';
        video.src = this.filePath;
        video.onloadedmetadata = () => {
          video.currentTime = (video.duration / 4) * 3;
        };
        video.ontimeupdate = () => {
          const canvas = document.createElement('canvas');
          canvas.getContext('2d').drawImage(video, 0, 0, this.width, this.height);
          this.handleGenerated(canvas.toDataURL('image/png'));
        };
      },
      generateAudioThumbnail() {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        // Add light background
        context.fillStyle = 'black';
        context.fillRect(0, 0, this.width, this.height);
        context.fillStyle = this.$vuetify.theme.primary;
        this.getAudioData(this.filePath)
          .then(data => {
            const sampleStart = Math.max(0, (data.length - MAX_AUDIO_SAMPLE_SIZE) / 2);
            const sampleEnd = Math.min(data.length, (data.length + MAX_AUDIO_SAMPLE_SIZE) / 2);
            data = data.slice(sampleStart, sampleEnd);
            const amp = this.height / 2;
            const peaks = chunk(data, Math.ceil(data.length / this.width));

            // Go through set of peaks and draw the max range (highest peak to lowest peak)
            peaks.forEach((peakArray, x) => {
              const minPeak = min(peakArray);
              const maxPeak = max(peakArray);
              context.fillRect(x, (1 + minPeak) * amp, 1, Math.max(1, (maxPeak - minPeak) * amp));
            });
            this.handleGenerated(canvas.toDataURL('image/png'));
          })
          .catch(this.handleError);
      },
      generatePDFThumbnail() {
        const canvas = document.createElement('canvas');
        pdfJSLib
          .getDocument(this.filePath)
          .promise.then(pdf => {
            pdf
              .getPage(1)
              .then(page => {
                const viewport = page.getViewport({ scale: 1 });
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
      generateEPubThumbnail() {
        const book = epubJS(this.filePath);
        return book.ready.then(() => {
          return book.loaded.cover.then(() => {
            if (!book.cover) {
              this.handleError();
              return;
            }
            return book.archive.createUrl(book.cover, { base64: true }).then(this.handleGenerated);
          });
        });
      },
      generateHTMLThumbnail() {
        const iframe = document.createElement('iframe');
        iframe.sandbox = 'allow-scripts allow-same-origin';
        const handleScreenshot = event => {
          if (event.data && event.data.__screenshotDataURI) {
            window.removeEventListener('message', handleScreenshot);
            document.body.removeChild(iframe);
            this.handleGenerated(event.data.__screenshotDataURI);
          }
        };
        iframe.height = this.width * 2;
        iframe.width = this.height * 2;
        iframe.style = 'position: fixed; top: 0; left: 0; z-index: -1000;';
        iframe.src = `${window.Urls.zipcontent(this.fileName, '')}?screenshot=true`;
        window.addEventListener('message', handleScreenshot);
        document.body.appendChild(iframe);
      },
      handleGenerated(encoding) {
        // If there isn't an encoding, throw an error
        if (!encoding) {
          this.handleError();
          return;
        }
        // If this operation has been cancelled in the mean time, return
        if (this.cancelled) {
          return;
        }
        const chunks = chunk(atob(encoding.split(',')[1]), 512);
        const byteArrays = map(
          chunks,
          chunk => new Uint8Array(map(chunk.join('').toString(), s => s.charCodeAt(0))),
        );
        const filename = `${this.$tr('generatedDefaultFilename')}.png`;
        const file = new File(byteArrays, filename, { type: 'image/png' });
        this.handleFiles([file]);
      },
      async fileExists() {
        try {
          await client.head(this.filePath);
          return true;
        } catch (e) {
          this.handleError(e);
        }
        return false;
      },
      async generate() {
        if (!this.fileExists()) {
          return;
        }
        this.cancelled = false;
        this.$emit('generating');
        if (this.isVideo) {
          this.generateVideoThumbnail();
        } else if (this.isAudio) {
          this.generateAudioThumbnail();
        } else if (this.isPDF) {
          this.generatePDFThumbnail();
        } else if (this.isEPub) {
          this.generateEPubThumbnail();
        } else if (this.isHTML) {
          this.generateHTMLThumbnail();
        } else {
          this.handleError('Unrecognized content!');
        }
      },
      /**
       * @public
       */
      cancel() {
        this.cancelled = true;
      },
    },
    $trs: {
      thumbnailGenerationFailedHeader: 'Unable to generate thumbnail',
      thumbnailGenerationFailedText: 'There was a problem generating a thumbnail',
      generatedDefaultFilename: 'Generated thumbnail',
    },
  };

</script>
