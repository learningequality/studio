<template>

  <PoliciesModal
    :policy="policy"
    :title="title"
    :needsAcceptance="needsAcceptance"
    data-test="community-standards-modal"
    @accept="$emit('accept', policy)"
    @close="$emit('close')"
  >
    <p>{{ $tr('description') }}</p>
    <p>
      <ActionLink
        href="https://learningequality.org/about/values/"
        target="_blank"
        :text="$tr('coreValuesLink')"
      />
    </p>

    <!-- Studio section -->
    <p>{{ $tr('studioDescription') }}</p>
    <ul class="pb-4 px-4">
      <li>{{ $tr('studioItem1') }}</li>
      <li>{{ $tr('studioItem2') }}</li>
      <li>{{ $tr('studioItem3') }}</li>
      <li>{{ $tr('studioItem4') }}</li>
      <li>{{ $tr('studioItem5') }}</li>
    </ul>

    <!-- Library section -->
    <p>{{ $tr('libraryDescription') }}</p>
    <ul class="pb-4 px-4">
      <li>{{ $tr('libraryItem1') }}</li>
      <li>{{ $tr('libraryItem2') }}</li>
      <li>{{ $tr('libraryItem3') }}</li>
      <li>{{ $tr('libraryItem4') }}</li>
    </ul>
  </PoliciesModal>

</template>


<script>

  import PoliciesModal from './PoliciesModal';
  import { policies } from 'shared/constants';

  export default {
    name: 'CommunityStandardsModal',
    components: {
      PoliciesModal,
    },
    props: {
      needsAcceptance: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        policies,
      };
    },
    computed: {
      policy() {
        return this.policies.COMMUNITY_STANDARDS;
      },
      title() {
        return this.$tr('communityStandardsHeader');
      },
    },
    $trs: {
      communityStandardsHeader: 'Community Standards',

      description:
        'Learning Equality is a nonprofit organization dedicated to enabling equitable access to quality educational experiences. Along with our statement of Core Values, these Community Standards are intended to foster a supportive and inclusive environment for our users.',
      coreValuesLink: "Learn more about Learning Equality's core values",

      // Studio section
      studioDescription:
        'Kolibri Studio gives you access to the Kolibri Library, a growing library of educational materials, which we encourage you to use as your own. We built Kolibri Studio to help you prepare educational materials in a variety of ways, including but not limited to:',
      studioItem1:
        'Browsing. Selecting appropriate educational materials for your situation from the Kolibri Library, the listing of sources available on the public channels page in Kolibri Studio',
      studioItem2:
        'Curating. Reorganizing the materials in these channels by selecting, deleting, and reordering appropriate items',
      studioItem3:
        'Sharing. Creating and publishing new channels with what you find, either to share with your own implementations privately or to share with others on Kolibri Studio.',
      studioItem4:
        'Modifying & Creating. Adding your own assessment exercises to any existing materials',
      studioItem5:
        'Hosting. Uploading your own materials (limited to materials you know are appropriately licensed to do so) from a local hard drive or other locations on the internet',

      // Library section
      libraryDescription:
        'The Kolibri Library is both a grassroots and curated effort to provide a wide variety of materials for all learners and learning purposes. To help us achieve these goals, we invite you to use Kolibri Studio in ways that:',
      libraryItem1:
        'Model good practices in open sharing and respect copyright. Create an ethical sharing community by labeling licenses, making sure you know the appropriate licenses for what you upload, and ensuring that appropriate written permissions are documented if needed. Studio is primarily designed to host materials which are openly licensed or come with special permissions for re-distribution and reproduction.',
      libraryItem2:
        'Keep materials clear, organized, and usable. We welcome resources created at all levels of production! To help them reach as many learners as possible, we invite you to fully utilize all metadata fields and aim for quality in comprehensibility, legibility, or digitization such that the content is usable and understandable.',
      libraryItem3:
        'Respect the community. Avoid obscenity and vulgarity, beyond specific educational purposes they might serve in some contexts. Hate speech of any kind, or promotion of violence or discrimination, will never be tolerated.',
      libraryItem4:
        'Kolibri Studio is for educational purposes only. It is not intended to be used for non-educational purposes such as recruitment, indoctrination, advertisement, file sharing, or personal media hosting.',
    },
  };

</script>
