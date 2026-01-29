<template>

  <div>
    <!-- Resources -->
    <h2>{{ $tr('resourcesHeader') }}</h2>
    <p>
      <KButton
        appearance="basic-link"
        :text="$tr('policiesLink')"
        data-test="policy-link"
        @click="showPrivacyPolicy"
      />
    </p>
    <p>
      <KButton
        appearance="basic-link"
        :text="$tr('termsOfServiceLink')"
        data-test="tos-link"
        @click="showTermsOfService"
      />
    </p>
    <p>
      <KButton
        appearance="basic-link"
        :text="$tr('communityStandardsLink')"
        data-test="communitystandards-link"
        @click="showCommunityStandards"
      />
    </p>
    <p>
      <KExternalLink
        href="https://kolibri-studio.readthedocs.io/en/latest/index.html"
        openInNewTab
        :text="$tr('userDocsLink')"
        rel="noopener noreferrer"
      />
    </p>

    <!-- About Studio -->
    <h2>{{ $tr('aboutStudio') }}</h2>
    <p>{{ $tr('aboutStudioText') }}</p>

    <!-- Best practices -->
    <h2>{{ $tr('bestPractices') }}</h2>
    <ul class="px-4">
      <li>
        <p>{{ $tr('bestPractice1') }}</p>
      </li>
      <li>
        <p>{{ $tr('bestPractice2') }}</p>
      </li>
      <li>
        <p>{{ $tr('bestPractice3') }}</p>
      </li>
      <li>
        <p>{{ $tr('bestPractice5') }}</p>
      </li>
      <li>
        <p>
          <KExternalLink
            href="https://ricecooker.readthedocs.io/en/latest/video_compression.html"
            :text="$tr('bestPractice6')"
            openInNewTab
            rel="noopener noreferrer"
          />
        </p>
      </li>
      <li>
        <p>{{ $tr('bestPractice7') }}</p>
      </li>
      <li>
        <p>{{ $tr('bestPractice9') }}</p>
      </li>
    </ul>

    <!-- Issues -->
    <h2>{{ $tr('notableIssues') }}</h2>
    <KExternalLink
      href="https://github.com/learningequality/studio/issues/3992"
      :text="$tr('issueLink1')"
      openInNewTab
      rel="noopener noreferrer"
    />
    <p>{{ $tr('issue1') }}</p>
    <KExternalLink
      href="https://github.com/learningequality/studio/issues"
      :text="$tr('issuesPageLink')"
      openInNewTab
      rel="noopener noreferrer"
    />
  </div>

</template>


<script>

  import { policies } from 'shared/constants';

  export default {
    name: 'UsingStudio',
    methods: {
      showTermsOfService() {
        this.$router.push({ query: { showPolicy: policies.TERMS_OF_SERVICE } });
      },
      showPrivacyPolicy() {
        this.$router.push({ query: { showPolicy: policies.PRIVACY } });
      },
      showCommunityStandards() {
        this.$router.push({ query: { showPolicy: policies.COMMUNITY_STANDARDS } });
      },
    },
    $trs: {
      policiesLink: 'Privacy policy',
      termsOfServiceLink: 'Terms of service',
      communityStandardsLink: 'Community standards',
      userDocsLink: 'User guide',
      resourcesHeader: 'Kolibri Studio resources',
      aboutStudio: 'About Kolibri Studio',
      aboutStudioText:
        'Kolibri Studio is undergoing active development, and as such, some changes could cause unexpected behavior or challenges (also known as "issues"). If you encounter an issue, please  notify us as soon as they occur to help us resolve them. (See below for instructions on how to report issues.)',

      bestPractices: 'Best practices',
      bestPractice1:
        'When using import and clipboard operations, work with small subsets of folders instead of whole channels at once (especially for large channels).',
      bestPractice2:
        'It is preferable to create multiple small channels rather than one giant channel with many layers of folders.',
      bestPractice3:
        'Reload the page to confirm your work has been saved to the server. Use CTRL+R on Linux/Windows or ⌘+R on Mac.',
      bestPractice5:
        "It is possible that you will encounter timeout errors in your browser when performing operations like import and sync, on large channels. Don't be alarmed by this error message and do not repeat the same operation again right away. It doesn't mean the operation has failed- Kolibri Studio is still working in the background. Wait a few minutes and reload the page before continuing your edits.",
      bestPractice6: 'Compress videos before uploading them (see these instructions).',
      bestPractice7:
        'PUBLISH periodically and import your channel into Kolibri to preview the content and obtain a local backup copy of your channel.',
      bestPractice9: 'Report issues as you encounter them.',

      notableIssues: 'Notable issues',
      issue1: {
        message:
          "There have been reports where users have observed the disappearance of changes they've recently made to their channels. The issue seems related to opening multiple tabs of Kolibri Studio, and eventually signing out. We advise that you disable any ‘Memory Saver/Sleeping’ tab browser feature for Kolibri Studio, and reload each tab before signing out. We're actively investigating this issue, so if you run into it, please contact us with as much information as possible.",
        context: 'A user facing description of an issue that has been reported by users.',
      },
      issueLink1: 'Reports of disappearing content',
      issuesPageLink: 'View all issues',
    },
  };

</script>


<style scoped>

  h2 {
    margin-top: 32px;
  }


</style>
