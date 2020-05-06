<template>

  <div>
    <div>
      <h2>Resources</h2>
      <p>
        <KButton appearance="basic-link" @click="showPrivacyPolicy = true" text="Kolibri Studio privacy policy" />
        <span v-if="showPrivacyPolicy" style="text-decoration:underline; color: red; cursor: pointer" @click="showPrivacyPolicy = false">NOT YET IMPLEMENTED</span>
      </p>
      <p>
        <KExternalLink href="https://kolibri-studio.readthedocs.io/en/latest/index.html" text="Kolibri Studio User Guide" target="_blank" rel="noopener noreferrer" />
      </p>
    </div>

    <div>
      <h2>About Kolibri Studio Beta</h2>
      <p>
        Kolibri Studio is Beta software, which means it is currently undergoing active development. As such, it is being regularly updated, and some changes could cause unexpected behavior or challenges (also known as "issues"). While we make every effort to ensure your work is saved and backed up, during active development it's possible that some issues could cause data loss, so we recommend you save and publish changes regularly, and notify us of issues as soon as they occur to help us resolve them. (See below for instructions on how to report issues.)
      </p>
    </div>

    <div>
      <h2>Best practices</h2>
      <p>
        <ul>
          <li>When using import and clipboard operations, work with small subsets of topics instead of whole channels at once (especially for large channels).
          <li>It is preferable to create multiple small channels rather than one giant channel with many layers of topics.</li>
          <li>Reload the page often to ensure your work was saved to the server and no network errors have occurred. Use CTRL+R on linux/windows or ⌘+R on mac.</li>
          <li>Avoid concurrent edits on the same channel. Channels should not be edited by multiple users at the same time or by the same user in multiple browser windows.</li>
          <li>It is possible that you will encounter timeout errors in your browser when performing operations like import and sync, on large channels. Don't be alarmed by this error message and do not repeat the same operation again right away. It doesn't mean the operation has failed—Studio is still working in the background. Wait a few minutes and reload the page before continuing your edits.</li>
          <li>Compress videos before uploading them (see these instructions).</li>
          <li>PUBLISH periodically and import your channel into Kolibri to preview the content and obtain a local backup copy of your channel.</li>
          <li>Do not edit the channel after you click PUBLISH. Wait for the notification email before resuming editing operations. Report issues as you encounter them.</li>
        </ul>
      </p>
    </div>

    <div>
      <h2>Notable issues</h2>
      <KExternalLink href="https://github.com/learningequality/studio/issues/1052" text="Reports of disappearing content" target="_blank" rel="noopener noreferrer" />
      <p>Two users have reported isolated incidents where content they imported from another channel disappeared, leaving only empty topics and subtopics. In one report, the content later re-appeared. They did not experience these problems consistently, and the incidents may possibly involve issues with a slow or unstable internet connection. If you run into this issue, please contact us as soon as possible and let us know as much information as you can remember.</p>
      <KExternalLink href="https://github.com/learningequality/studio/issues/1072" text="Slow performance can lead to unexpected UI state" target="_blank" rel="noopener noreferrer" />
      <p>Some operations in Studio are currently very slow, and so it may appear that the change you attempted to make timed out or did not take effect. In many cases, the change is still being processed and will appear once it is complete. If, after 5-10 minutes, the change still has not taken effect even after a browser refresh, please file an issue. We are working on solutions to these issues.</p>
    </div>

    <KButton :primary="true" text="Report an issue" @click="toggleReportIssueForm " />

    <KModal
      v-if="showReportIssueForm"
      size="medium"
      title="Report an issue"
    >
      <ReportIssueForm @close="showReportIssueForm = false" />
    </KModal>
  </div>

</template>


<script>

import ReportIssueForm from './ReportIssueForm';

export default {
  name: 'UsingStudio',
  components: { ReportIssueForm },
  data() {
    return {
      showReportIssueForm: false,
      showPrivacyPolicy: false,
    }
  },
  methods: {
    toggleReportIssueForm() {
      this.showReportIssueForm = !this.showReportIssueForm
    },
  },
}

</script>


<style lang="scss" scoped></style>
