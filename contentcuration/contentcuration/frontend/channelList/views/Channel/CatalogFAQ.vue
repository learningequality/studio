<template>

  <VContainer
    fluid
    class="py-1"
    :class="$vuetify.breakpoint.xsOnly ? 'px-0' : 'px-4'"
  >
    <h1 class="font-weight-bold mb-2 px-1 title">
      {{ $tr('aboutHeader') }}
    </h1>
    <p class="px-2 subheading">
      {{ $tr('descriptionP1') }}
      <ActionLink
        :text="$tr('channelLink')"
        href="#channel"
        @click="aboutPanel = 1"
      />
    </p>
    <p class="px-2 subheading">
      {{ $tr('descriptionP2') }}
    </p>
    <p class="mb-5 px-2 subheading">
      {{ $tr('descriptionP3') }}
    </p>

    <!-- ABOUT THIS LIBRARY -->
    <h1 class="font-weight-bold px-1 title">
      {{ $tr('aboutLibraryHeader') }}
    </h1>
    <VExpansionPanel
      class="mb-5 mt-2"
      expand
    >
      <!-- How do you determine what goes into this library? -->
      <VExpansionPanelContent>
        <template #header>
          <h2 class="font-weight-bold subheading">
            {{ $tr('selectionQuestion') }}
          </h2>
        </template>
        <VCard>
          <VCardText>
            <p>{{ $tr('selectionAnswerP1') }}</p>
            <p>{{ $tr('selectionAnswerP2') }}</p>
          </VCardText>
        </VCard>
      </VExpansionPanelContent>

      <!-- How is this library created and maintained? -->
      <VExpansionPanelContent>
        <template #header>
          <h2 class="font-weight-bold subheading">
            {{ $tr('maintenanceQuestion') }}
          </h2>
        </template>
        <VCard>
          <VCardText>
            <p>{{ $tr('maintenanceAnswerP1') }}</p>
            <p>
              {{ $tr('maintenanceAnswerP2') }}
              <ActionLink
                :text="$tr('viewIntegrationGuide')"
                target="_blank"
                href="http://learningequality.org/r/integration-guide"
              />
            </p>
          </VCardText>
        </VCard>
      </VExpansionPanelContent>

      <!-- Have these sources been vetted or endorsed as classroom-safe and ready? -->
      <VExpansionPanelContent>
        <template #header>
          <h2 class="font-weight-bold subheading">
            {{ $tr('endoresementQuestion') }}
          </h2>
        </template>
        <VCard>
          <VCardText>
            <p>{{ $tr('endorsementAnswer') }}</p>
          </VCardText>
        </VCard>
      </VExpansionPanelContent>

      <!-- Does Learning Equality own these resources? -->
      <VExpansionPanelContent>
        <template #header>
          <h2 class="font-weight-bold subheading">
            {{ $tr('ownershipQuestion') }}
          </h2>
        </template>
        <VCard>
          <VCardText>
            <p>{{ $tr('ownershipAnswer') }}</p>
          </VCardText>
        </VCard>
      </VExpansionPanelContent>

      <!-- Do you add new materials? -->
      <VExpansionPanelContent>
        <template #header>
          <h2 class="font-weight-bold subheading">
            {{ $tr('newContentQuestion') }}
          </h2>
        </template>
        <VCard>
          <VCardText>
            <p>{{ $tr('newContentAnswer') }}</p>
          </VCardText>
        </VCard>
      </VExpansionPanelContent>

      <!-- How can I add my own materials or recommend others' materials for this library? -->
      <VExpansionPanelContent>
        <template #header>
          <h2 class="font-weight-bold subheading">
            {{ $tr('customContentQuestion') }}
          </h2>
        </template>
        <VCard>
          <VCardText>
            <p>{{ $tr('customContentAnswer') }}</p>
          </VCardText>
        </VCard>
      </VExpansionPanelContent>
    </VExpansionPanel>

    <!-- USING THESE RESOURCES -->
    <h1 class="font-weight-bold px-1 title">
      {{ $tr('usingResourcesHeader') }}
    </h1>
    <VExpansionPanel
      v-model="aboutPanel"
      class="mb-5 mt-2"
      expand
    >
      <!-- I found something I'm interested in and would like to start using it.
            What should I do? -->
      <VExpansionPanelContent>
        <template #header>
          <h2 class="font-weight-bold subheading">
            {{ $tr('usingContentQuestion') }}
          </h2>
        </template>
        <VCard>
          <VCardText>
            <p>
              {{ $tr('usingContentAnswer') }}
              <ActionLink
                :text="$tr('viewGettingStartedLink')"
                target="_blank"
                href="https://learningequality.org/documentation/"
              />
            </p>
          </VCardText>
        </VCard>
      </VExpansionPanelContent>

      <!-- What is a channel? -->
      <VExpansionPanelContent id="channel">
        <template #header>
          <h2 class="font-weight-bold subheading">
            {{ $tr('channelQuestion') }}
          </h2>
        </template>
        <VCard>
          <VCardText>
            <p>{{ $tr('channelAnswer') }}</p>
          </VCardText>
        </VCard>
      </VExpansionPanelContent>

      <!-- How do I review the contents of the channels themselves? -->
      <VExpansionPanelContent>
        <template #header>
          <h2 class="font-weight-bold subheading">
            {{ $tr('sampleContentQuestion') }}
          </h2>
        </template>
        <VCard>
          <VCardText>
            <p>{{ $tr('sampleContentAnswer') }}</p>
            <ul>
              <li>{{ $tr('sampleContentAnswerItem1') }}</li>
              <li>{{ $tr('sampleContentAnswerItem2') }}</li>
              <li>
                {{ $tr('sampleContentAnswerItem3') }}
                <ActionLink
                  :text="$tr('downloadKolibriLink')"
                  target="_blank"
                  href="https://learningequality.org/download"
                />
              </li>
            </ul>
          </VCardText>
        </VCard>
      </VExpansionPanelContent>

      <!-- I want to use some of this resource, but not all of it. What should I do? -->
      <VExpansionPanelContent>
        <template #header>
          <h2 class="font-weight-bold subheading">
            {{ $tr('partialChannelQuestion') }}
          </h2>
        </template>
        <VCard>
          <VCardText>
            <p>{{ $tr('partialChannelAnswer') }}</p>
          </VCardText>
        </VCard>
      </VExpansionPanelContent>

      <!-- What is coach content? -->
      <VExpansionPanelContent>
        <template #header>
          <h2 class="font-weight-bold subheading">
            {{ $tr('coachContentQuestion') }}
          </h2>
        </template>
        <VCard>
          <VCardText>
            <p>{{ $tr('coachContentAnswer') }}</p>
          </VCardText>
        </VCard>
      </VExpansionPanelContent>

      <!-- I found a bug, broken link, or instance of mislabeled information
            within a resource. What should I do? -->
      <VExpansionPanelContent>
        <template #header>
          <h2 class="font-weight-bold subheading">
            {{ $tr('issueQuestion') }}
          </h2>
        </template>
        <VCard>
          <VCardText>
            <p>{{ $tr('issueAnswer') }}</p>
          </VCardText>
        </VCard>
      </VExpansionPanelContent>
    </VExpansionPanel>

    <!-- ABOUT KOLIBRI -->
    <h1 class="font-weight-bold pl-1 title">
      {{ $tr('aboutKolibriHeader') }}
    </h1>
    <VExpansionPanel
      class="mb-5 mt-2"
      expand
    >
      <!-- What is Kolibri? -->
      <VExpansionPanelContent>
        <template #header>
          <h2 class="font-weight-bold subheading">
            {{ $tr('KolibriQuestion') }}
          </h2>
        </template>
        <VCard>
          <VCardText>
            <p>{{ $tr('KolibriAnswer') }}</p>
            <ul>
              <li>{{ $tr('KolibriAnswerItem1') }}</li>
              <li>{{ $tr('KolibriAnswerItem2') }}</li>
              <li>{{ $tr('KolibriAnswerItem3') }}</li>
            </ul>
          </VCardText>
        </VCard>
      </VExpansionPanelContent>

      <!-- How can I use Kolibri? -->
      <VExpansionPanelContent>
        <template #header>
          <h2 class="font-weight-bold subheading">
            {{ $tr('usingKolibriQuestion') }}
          </h2>
        </template>
        <VCard>
          <VCardText>
            <p>{{ $tr('usingKolibriAnswerP1') }}</p>
            <ul>
              <li>
                {{ $tr('usingKolibriItem1') }}
                <ActionLink
                  target="_blank"
                  :text="$tr('visitWebsiteLink')"
                  href="https://learningequality.org/kolibri/"
                />
              </li>
              <li>
                {{ $tr('usingKolibriItem2') }}
                <ActionLink
                  target="_blank"
                  :text="$tr('viewDemoLink')"
                  href="https://kolibri-demo.learningequality.org/en/user/#/signin"
                />
              </li>
              <li>
                {{ $tr('usingKolibriItem3') }}
                <ActionLink
                  target="_blank"
                  :text="$tr('downloadLink')"
                  href="https://learningequality.org/download/"
                />
              </li>
            </ul>
            <p>
              {{ $tr('usingKolibriAnswerP2') }}
              <ActionLink
                target="_blank"
                :text="$tr('viewDocsLink')"
                href="https://learningequality.org/documentation/"
              />
            </p>
          </VCardText>
        </VCard>
      </VExpansionPanelContent>

      <!-- Who are the makers of Kolibri? -->
      <VExpansionPanelContent>
        <template #header>
          <h2 class="font-weight-bold subheading">
            {{ $tr('makerQuestion') }}
          </h2>
        </template>
        <VCard>
          <VCardText>
            <p>{{ $tr('makerAnswerP1') }}</p>
            <p>{{ $tr('makerAnswerP2') }}</p>
          </VCardText>
        </VCard>
      </VExpansionPanelContent>
    </VExpansionPanel>
  </VContainer>

</template>


<script>

  import { routerMixin } from 'shared/mixins';

  export default {
    name: 'CatalogFAQ',
    mixins: [routerMixin],
    data() {
      return {
        aboutPanel: null,
      };
    },
    beforeMount() {
      this.updateTabTitle(this.$tr('faqHeader'));
    },
    $trs: {
      faqHeader: 'Frequently asked questions',

      // DESCRIPTION
      aboutHeader: 'Welcome to the Kolibri Content Library Catalog! ',
      descriptionP1:
        'Here you can learn more about the educational resources publicly available for use in Kolibri, which are organized into "channels". Use the filters to browse channels by keyword, language, or formats of the materials inside.',
      channelLink: 'What is a channel?',
      descriptionP2:
        'Click on a channel to get a preview of what subjects and topics it covers, learn more about its creator, see how many resources the channel contains, and learn how to import it into Kolibri. You can also find coach-specific content (lesson plans, teacher professional guides, and other supplementary facilitation material), assessments and exercises, and captions for accessibility.',
      descriptionP3:
        "Sharing the work of these resource creators is what inspires Learning Equality's efforts. We hope you find something that excites you about the potential of digital learning, online or off!",

      // ABOUT THE LIBRARY
      aboutLibraryHeader: 'About the Kolibri Content Library',
      selectionQuestion: 'How does Learning Equality determine what goes into this library?',
      selectionAnswerP1:
        'Our approach is unique in that we aim to assemble a library of resources which supports the diversity of needs Kolibri is designed to meet, rather than collecting all possible open educational resources.',
      selectionAnswerP2:
        'To inform what we select, the Learning Equality team is continually maintaining our awareness of openly licensed digital resources available in the educational landscape. Most of our resources come from an organization, institution, or creator with learning design experience and an educational mandate. We prioritize providing a diversity of grade levels, subject areas and languages. Where possible, we also evaluate and seek input on the degree to which the materials may be suitable for the unique blended learning settings in which we work.',

      maintenanceQuestion: 'How is this library created and maintained?',
      maintenanceAnswerP1:
        'Because Kolibri is designed for learners and educators who are disconnected from the internet, content must first be packaged so that it can be used without internet connection. For most sources, our content team uses custom-written, automated scripts to bring content into Kolibri from a website, an app, or a private source such as a hard drive (with the appropriate permissions).',
      maintenanceAnswerP2:
        'To learn more about how content is packaged for use on Kolibri and what types of formats are supported, please refer to our content integration guide.',
      viewIntegrationGuide: 'View content integration guide',

      endoresementQuestion:
        'Have these sources been vetted or endorsed as classroom-safe and ready?',
      endorsementAnswer:
        'We select sources with an educational affiliation or mandate, so you can trust that most resources in the Kolibri Content Library were designed for learning purposes. However,  we are not able to guarantee the appropriateness of each individual item within any particular source. We recommend that educators and administrators conduct a thorough review of any digital content using their own criteria - including reorganization and re-curation, if necessary - before using it with learners. Since we recognize that there may be many different standards across situations for criteria like preferred levels of interactivity, subject/age appropriateness, cultural sensitivity and tone, among others, we have intentionally offered a wide range of materials to help meet the needs of all learners whatever they may be.',

      ownershipQuestion: 'Does Learning Equality own these resources?',
      ownershipAnswer:
        'No. Just like an online learning repository with links to external websites, we gather useful digital learning resources to help our community discover a rich variety of learning materials they may not have known about otherwise. All the materials in this educational library are fully credited to the creating organization, reformatted for best display on digital devices, and include any additional information the creator has shared with us. We only include content which is either openly licensed, available to distribute for special nonprofit or noncommercial purposes, or shared with us for distribution through agreement with the creator. Since materials in the library are intended for use in an open source platform, we do not profit financially from their use.',

      newContentQuestion: 'Does Learning Equality add new materials?',
      newContentAnswer:
        'Our content team routinely adds new sources and channels to the library and updates existing channels as content creators make new materials available.',

      customContentQuestion:
        'How can I add my own materials or recommend materials from other creators for this library?',
      customContentAnswer:
        'To add your own materials, create an account on Kolibri Studio by going to https://studio.learningequality.org. Recommendations for public materials to be added to the Kolibri Content Library can be made by contacting content@learningequality.org.',

      // USING THESE RESOURCES
      usingResourcesHeader: 'About using these resources',
      usingContentQuestion:
        "I found something I'm interested in and would like to start using it. What should I do?",
      usingContentAnswer:
        'Great! All of these resources have been specially packaged for use on Kolibri, our open source platform for offline learning, so please review how to get started with Kolibri first, then follow the instructions to import materials.',
      viewGettingStartedLink: 'Documentation resources to get started with Kolibri',

      channelQuestion: 'What is a channel?',
      channelAnswer:
        "A channel is Kolibri’s unit of organization for digital content. It's a collection of resources organized by single institutions or creators, each of which may contain a set of books, games, textbooks, articles, simulations, exercises, and many more types of educational materials, all made available for use in Kolibri without the need for internet access. A channel isn't necessarily a course or a sequence, it's simply a collection of materials published or gathered together by one organization, as close to the provider's original layout as possible, while still organized for the best possible navigation in Kolibri.",

      sampleContentQuestion: 'How do I review the contents of the channels themselves?',
      sampleContentAnswer: 'You can do this in three ways:',
      sampleContentAnswerItem1:
        "To see the original content source, click the ⋮  button and select 'Go to source website'",
      sampleContentAnswerItem2:
        "To preview the content on one of our online demo servers (available in English, Spanish, Arabic, French, and Hindi), click the ⋮ button and select 'View channel on Kolibri'",
      sampleContentAnswerItem3:
        'Download Kolibri and import the channel on your device for full access offline.',
      downloadKolibriLink: 'Download Kolibri',

      partialChannelQuestion:
        'I want to use some of the resources in this channel, but not all of it. What should I do?',
      partialChannelAnswer:
        "When importing content into Kolibri, you can select the specific subsections of a channel you're interested in. If you’d like to make changes such as editing the title or folder descriptions, or changing the order in which materials appear, please contact us at content@learningequality.org for early access to our Kolibri Studio tool, which can be used to make these changes.",

      coachContentQuestion: "What are 'resources for coaches'?",
      coachContentAnswer:
        'Most resources are directed at learners, but some, such as lesson plans, subject refreshers, professional learning guides, and similar, are directed at teachers and facilitators. In Kolibri, we mark this content as "for coaches" and limit its visibility to those with coach accounts. If you see coach materials here, they may require less planning for any facilitators using the resource!',

      issueQuestion:
        'I found a bug, broken link, or some mislabeled information within a resource. What should I do?',
      issueAnswer:
        "Please email us at content@learningequality.org and include the channel name, along with a description of the issue. If you notice an issue on a specific resource, please be sure to link that as well. We'd be happy to investigate and grateful for your feedback!",

      // ABOUT KOLIBRI
      aboutKolibriHeader: 'About Kolibri',
      KolibriQuestion: 'What is Kolibri?',
      KolibriAnswer:
        'Kolibri is an open source ed-tech platform designed for low-resource communities, focused on:',
      KolibriAnswerItem1:
        'Overcoming infrastructural barriers that prevent equitable access to quality education for learners in low-resource and low-connectivity contexts',
      KolibriAnswerItem2:
        'Increasing the availability of open learning materials suitable for many curricula, learning goals, and situations',
      KolibriAnswerItem3: 'Fostering innovative pedagogy and effective learning outcomes',

      usingKolibriQuestion: 'How can I use Kolibri?',
      usingKolibriAnswerP1: 'You can learn more about using Kolibri by doing any of the following:',
      usingKolibriItem1: 'Visit the Learning Equality website',
      visitWebsiteLink: 'Visit website',
      usingKolibriItem2: 'View a demo of the platform',
      viewDemoLink: 'View demo',
      usingKolibriItem3: 'Download the software',
      downloadLink: 'Download',
      usingKolibriAnswerP2:
        'We invite you to use the Kolibri user documentation for further guidance.',
      viewDocsLink: 'View docs',

      makerQuestion: 'Who are the makers of Kolibri?',
      makerAnswerP1:
        'Learning Equality, a 501(c)(3) nonprofit based in San Diego, California, is committed to enabling every person in the world to realize their right to a quality education, by supporting the creation, adaptation, and distribution of open educational resources, and creating supportive tools for innovative pedagogy.',
      makerAnswerP2:
        'In recognition of the digital divide, Learning Equality started by bringing the Khan Academy experience offline to more than 6 million learners around the globe. Its second-generation product, Kolibri, is part of a broader ecosystem of products and tools that support curriculum alignment, blended learning pedagogies, and broader use of Open Educational Resources to improve learning.',
    },
  };

</script>


<style scoped>

  /deep/ .action-link {
    font-size: inherit;
    vertical-align: text-bottom;
  }

  p {
    font-size: 12pt;
    word-wrap: break-word;
  }

  .v-card__text ul {
    padding: 0 32px;
  }

  /* Don't set text alignment so we can handle RTL */
  .v-expansion-panel {
    text-align: unset;
  }

</style>
