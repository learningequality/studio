<template>

  <div dir="auto">
    <VContainer fluid class="py-1" :class="$vuetify.breakpoint.xsOnly? 'px-0' : 'px-4'">
      <h1 class="title font-weight-bold px-1 mb-2">
        {{ $tr('aboutHeader') }}
      </h1>
      <p class="subheading px-2">
        {{ $tr('descriptionP1') }}
        <ActionLink
          :text="$tr('channelLink')"
          href="#channel"
          @click="aboutPanel = 1"
        />
      </p>
      <p class="subheading px-2">
        {{ $tr('descriptionP2') }}
      </p>
      <p class="subheading px-2 mb-5">
        {{ $tr('descriptionP3') }}
      </p>


      <!-- ABOUT THIS LIBRARY -->
      <h1 class="title font-weight-bold px-1">
        {{ $tr('aboutLibraryHeader') }}
      </h1>
      <VExpansionPanel class="mt-2 mb-5" focusable>

        <!-- How do you determine what goes into this library? -->
        <VExpansionPanelContent>
          <template v-slot:header>
            <h2 class="subheading font-weight-bold">
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
          <template v-slot:header>
            <h2 class="subheading font-weight-bold">
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
          <template v-slot:header>
            <h2 class="subheading font-weight-bold">
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
          <template v-slot:header>
            <h2 class="subheading font-weight-bold">
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
          <template v-slot:header>
            <h2 class="subheading font-weight-bold">
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
          <template v-slot:header>
            <h2 class="subheading font-weight-bold">
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
      <h1 class="title font-weight-bold px-1">
        {{ $tr('usingResourcesHeader') }}
      </h1>
      <VExpansionPanel v-model="aboutPanel" class="mt-2 mb-5" focusable>

        <!-- I found something I'm interested in and would like to start using it.
              What should I do? -->
        <VExpansionPanelContent>
          <template v-slot:header>
            <h2 class="subheading font-weight-bold">
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
          <template v-slot:header>
            <h2 class="subheading font-weight-bold">
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
          <template v-slot:header>
            <h2 class="subheading font-weight-bold">
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
          <template v-slot:header>
            <h2 class="subheading font-weight-bold">
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
          <template v-slot:header>
            <h2 class="subheading font-weight-bold">
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
          <template v-slot:header>
            <h2 class="subheading font-weight-bold">
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
      <h1 class="title font-weight-bold pl-1">
        {{ $tr('aboutKolibriHeader') }}
      </h1>
      <VExpansionPanel class="mt-2 mb-5" focusable>

        <!-- What is Kolibri? -->
        <VExpansionPanelContent>
          <template v-slot:header>
            <h2 class="subheading font-weight-bold">
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
          <template v-slot:header>
            <h2 class="subheading font-weight-bold">
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
          <template v-slot:header>
            <h2 class="subheading font-weight-bold">
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
  </div>

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
        'Here, you can learn more about the educational resources publicly available for use in Kolibri, which are organized into "channels". Use the filters to browse channels by keyword, language, or formats of the materials inside.',
      channelLink: 'What is a channel?',
      descriptionP2:
        'Click on a channel to get a preview of what subjects and topics it covers, learn more about its creator, see how much material the channel contains, and learn how to import its contents into Kolibri. You can also check for special enhancements for learning, such as coach-specific content (lesson plans, teacher professional guides, and other supplementary facilitation material), assessments and exercises, and subtitles for accessibility.',
      descriptionP3:
        "Sharing the work of these resource creators is what inspires Learning Equality's efforts. We hope you find something that excites you about the potential of digital learning, online or off!",

      // ABOUT THE LIBRARY
      aboutLibraryHeader: 'About the Kolibri Content Library',
      selectionQuestion: 'How do you determine what goes into this library?',
      selectionAnswerP1:
        'We aim to support the diverse learner needs that Kolibri is designed to meet. Our approach is unique in that we aim to assemble a library of resources which supports this diversity of needs, rather than collecting all possible open educational resources.',
      selectionAnswerP2:
        'To inform what we select, the Learning Equality team is continually maintaining our awareness of openly licensed digital resources available in the educational landscape - as well as those with the potential to be used this way - to fill gaps in our library. Most of our resources come from an organization, institution, or creator with learning design experience and an educational mandate. We prioritize providing a diversity of grade levels, subject areas and languages. Where possible, we also evaluate and seek input on the degree to which the materials may be suitable for the unique blended learning settings in which we work.',

      maintenanceQuestion: 'How is this library created and maintained?',
      maintenanceAnswerP1:
        'Because Kolibri is designed for learners and educators who are disconnected from the internet, content must first be packaged so that it runs without needing connectivity. For most sources, our content team uses custom-written, automated scripts to bring content into Kolibri from a website, an app, or a private source such as a hard drive (with the appropriate permissions).',
      maintenanceAnswerP2:
        'To learn more about how content is packaged for use on Kolibri and what types of formats are supported, please refer to our integration guide.',
      viewIntegrationGuide: 'View guide',

      endoresementQuestion:
        'Have these sources been vetted or endorsed as classroom-safe and ready?',
      endorsementAnswer:
        'We select sources with an educational affiliation or mandate, so you can trust that most resources in the Kolibri Content Library were designed for learning purposes. However,  we are not able to guarantee the appropriateness of each individual item within any particular source. We recommend that educators and administrators conduct a thorough review of any digital content using their own criteria - including reorganization and re-curation, if necessary - before using it with learners. Since we recognize that there may be many different standards across situations for criteria like preferred levels of interactivity, subject/age appropriateness, cultural sensitivity and tone, and others, we have intentionally offered a wide range of materials to help meet all learners where they might be.',

      ownershipQuestion: 'Does Learning Equality own these resources?',
      ownershipAnswer:
        'No. Just like an online learning repository with links to external websites, we gather useful digital learning resources to help our community discover a rich variety of learning materials they may not have known about otherwise. All the materials in this educational library are fully credited to the creating organization, reformatted for best display on digital devices, and include any information the creator has shared with us. We only include content which is either openly licensed, available to distribute for special nonprofit or noncommercial purposes, or shared with us for distribution through agreement with the creator. Since materials in the library are intended for use in an Open Source platform, we do not profit financially from their use.',

      newContentQuestion: 'Do you add new materials?',
      newContentAnswer:
        'Our content team routinely adds new sources and channels to the library and updates existing channels as content creators make new materials available.',

      customContentQuestion:
        "How can I add my own materials or recommend others' materials for this library?",
      customContentAnswer:
        'To add your own materials, create an account on Kolibri Studio by going to https://studio.learningequality.org. Recommendations for public materials to be added to the Kolibri Content Library can be made by contacting content@learningequality.org.',

      // USING THESE RESOURCES
      usingResourcesHeader: 'About using these resources',
      usingContentQuestion:
        "I found something I'm interested in and would like to start using it. What should I do?",
      usingContentAnswer:
        'Great! All of these resources have been specially packaged for use on Kolibri, our Open Source platform for offline learning, so please review how to get started with Kolibri first, then follow the instructions to import materials.',
      viewGettingStartedLink: 'View the "getting started" docs',

      channelQuestion: 'What is a channel?',
      channelAnswer:
        "A channel is Kolibri’s unit of organization for digital content. It's a collection of resources organized by single institutions or creators, each of which contains a set of books, games, textbooks, articles, simulations, exercises, and many more types of educational materials, all made available for use in Kolibri without any internet access needed. A channel isn't necessarily a course or a sequence- it's simply a collection of materials published or gathered together by one organization, as close to the provider's original layout as possible, while still organized for the best possible navigation in Kolibri.",

      sampleContentQuestion: 'How do I review the contents of the channels themselves?',
      sampleContentAnswer: 'You can do this in three ways:',
      sampleContentAnswerItem1:
        "To see the content, click on the link to its original source in the channel's ⋮ menu",
      sampleContentAnswerItem2:
        'Preview the content on one of our online demo servers as linked on the channel (available in English, Spanish, Arabic, French, and Hindi)',
      sampleContentAnswerItem3:
        'Download Kolibri and import the channel on your device for full access offline.',
      downloadKolibriLink: 'Download Kolibri',

      partialChannelQuestion:
        'I want to use some of this resource, but not all of it. What should I do?',
      partialChannelAnswer:
        'When importing content into Kolibri, you can select the specific subsections of a channel you’re interested in. If you’d like to make changes such as editing the title or folder descriptions, or changing the order in which materials appear, please contact us at content@learningequality.org for early access to our Kolibri Studio tool, which can be used to make these changes.',

      coachContentQuestion: 'What is coach content?',
      coachContentAnswer:
        'Most resources are directed at learners, but some, such as lesson plans, subject refreshers, professional learning guides, and more, are directed at teachers and facilitators. In Kolibri, we mark this content as "coach support" and limit its visibility to those with coach accounts. If you see coach materials here, they\'re an extra benefit which may indicate classroom-readiness and require less planning for any facilitators using the resource!',

      issueQuestion:
        'I found a bug, broken link, or instance of mislabeled information within a resource. What should I do?',
      issueAnswer:
        "Please email us at content@learningequality.org and include the channel name, along with a description of the issue. If you notice an issue on a specific resource, please be sure to link that as well. We'd be happy to investigate and grateful for your feedback!",

      // ABOUT KOLIBRI
      aboutKolibriHeader: 'About Kolibri',
      KolibriQuestion: 'What is Kolibri?',
      KolibriAnswer:
        'Kolibri is an Open Source ed-tech platform designed for low-resource communities, focused on:',
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
        'We invite you to reference the Kolibri documentation for further guidance.',
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
    vertical-align: text-bottom;
    font-size: inherit;
  }

  p {
    font-size: 12pt;
    word-wrap: break-word;
  }

  .v-card__text ul {
    padding: 0px 32px;
  }

  /* Don't set text alignment so we can handle RTL */
  .v-expansion-panel {
    text-align: unset;
  }
</style>
