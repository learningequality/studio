<template>

  <div>
    <!-- Resources -->
    <h2>{{ $tr('resourcesHeader') }}</h2>
    <p>
      <KButton
        appearance="basic-link"
        :text="$tr('privacyLink')"
        @click="showPrivacyPolicy = true"
      />
      <span
        v-if="showPrivacyPolicy"
        style="text-decoration:underline; color: red; cursor: pointer"
        @click="showPrivacyPolicy = false"
      >
        NOT YET IMPLEMENTED
      </span>
    </p>
    <p>
      <KExternalLink
        href="https://kolibri-studio.readthedocs.io/en/latest/index.html"
        target="_blank"
        :text="$tr('userDocsLink')"
        rel="noopener noreferrer"
      />
    </p>

    <!-- About Studio -->
    <h2>{{ $tr('aboutStudio') }}</h2>
    <p>{{ $tr('aboutStudioText') }}</p>

    <!-- Best practices -->
    <h2>{{ $tr('bestPractices') }}</h2>
    <p>
      <ul>
        <li>{{ $tr('bestPractice1') }}</li>
        <li>{{ $tr('bestPractice2') }}</li>
        <li>{{ $tr('bestPractice3') }}</li>
        <li>{{ $tr('bestPractice4') }}</li>
        <li>{{ $tr('bestPractice5') }}</li>
        <li>{{ $tr('bestPractice6') }}</li>
        <li>{{ $tr('bestPractice7') }}</li>
        <li>{{ $tr('bestPractice8') }}</li>
      </ul>
    </p>

    <!-- Issues -->
    <h2>{{ $tr('notableIssues') }}</h2>
    <KExternalLink
      href="https://github.com/learningequality/studio/issues/1052"
      :text="$tr('issueLink1')"
      target="_blank"
      rel="noopener noreferrer"
    />
    <p>{{ $tr('issue1') }}</p>
    <KExternalLink
      href="https://github.com/learningequality/studio/issues/1072"
      :text="$tr('issueLink2')"
      target="_blank"
      rel="noopener noreferrer"
    />
    <p>{{ $tr('issue2') }}</p>
    <KButton primary :text="$tr('reportIssueButton')" @click="showReportIssueForm = true" />
    <ReportIssueForm v-model="showReportIssueForm" />
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
      };
    },
    $trs: {
      privacyLink: 'Kolibri Studio privacy policy',
      userDocsLink: 'Kolibri Studio User Guide',
      resourcesHeader: 'Resources',
      aboutStudio: 'About Kolibri Studio Beta',
      aboutStudioText:
        'Kolibri Studio is Beta software, which means it is currently undergoing active development. As such, it is being regularly updated, and some changes could cause unexpected behavior or challenges (also known as "issues"). While we make every effort to ensure your work is saved and backed up, during active development it\'s possible that some issues could cause data loss, so we recommend you save and publish changes regularly, and notify us of issues as soon as they occur to help us resolve them. (See below for instructions on how to report issues.)',

      bestPractices: 'Best practices',
      bestPractice1:
        ' When using import and clipboard operations, work with small subsets of topics instead of whole channels at once (especially for large channels).',
      bestPractice2:
        'It is preferable to create multiple small channels rather than one giant channel with many layers of topics.',
      bestPractice3:
        'Reload the page often to ensure your work was saved to the server and no network errors have occurred. Use CTRL+R on linux/windows or ⌘+R on mac.',
      bestPractice4:
        'Avoid concurrent edits on the same channel. Channels should not be edited by multiple users at the same time or by the same user in multiple browser windows.',
      bestPractice5:
        "It is possible that you will encounter timeout errors in your browser when performing operations like import and sync, on large channels. Don't be alarmed by this error message and do not repeat the same operation again right away. It doesn't mean the operation has failed—Studio is still working in the background. Wait a few minutes and reload the page before continuing your edits.",
      bestPractice6: 'Compress videos before uploading them (see these instructions).',
      bestPractice7:
        'PUBLISH periodically and import your channel into Kolibri to preview the content and obtain a local backup copy of your channel.',
      bestPractice8:
        'Do not edit the channel after you click PUBLISH. Wait for the notification email before resuming editing operations. Report issues as you encounter them.',

      notableIssues: 'Notable issues',
      issue1:
        'Two users have reported isolated incidents where content they imported from another channel disappeared, leaving only empty topics and subtopics. In one report, the content later re-appeared. They did not experience these problems consistently, and the incidents may possibly involve issues with a slow or unstable internet connection. If you run into this issue, please contact us as soon as possible and let us know as much information as you can remember.',
      issueLink1: 'Reports of disappearing content',
      issue2:
        'Some operations in Studio are currently very slow, and so it may appear that the change you attempted to make timed out or did not take effect. In many cases, the change is still being processed and will appear once it is complete. If, after 5-10 minutes, the change still has not taken effect even after a browser refresh, please file an issue. We are working on solutions to these issues.',
      issueLink2: 'Slow performance can lead to unexpected UI state',
      reportIssueButton: 'Report an issue',
    },
  };

</script>

<style scoped>
  h2 {
    margin-top: 32px;
  }
</style>
