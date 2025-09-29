import { createTranslator } from 'shared/i18n';

export const metadataStrings = createTranslator('CommonMetadataStrings', {
  // Titles/Headers

  learningActivity: {
    message: 'Learning Activity',
    context: 'A title for the category of education material interaction, i.e. watch, read, listen',
  },
  completion: {
    message: 'Completion',
    context: 'A title for the metadata that explains when an activity is finished',
  },
  duration: {
    message: 'Duration',
    context: 'A title for the metadata that explains how long an activity will take',
  },
  category: {
    message: 'Category',
    context: 'A title for the metadata that explains the subject matter of an activity',
  },
  // Completion criteria types
  reference: {
    message: 'Reference material',
    context:
      'One of the completion criteria types. Progress made on a resource with this criteria is not tracked.',
  },
  completeDuration: {
    message: 'When time spent is equal to duration',
    context:
      'One of the completion criteria types. A resource with this criteria is considered complete when learners spent given time studying it.',
  },
  exactTime: {
    message: 'Time to complete',
    context:
      'One of the completion criteria types. A subset of "When time spent is equal to duration". For example, for an audio resource with this criteria, learnes need to hear the whole length of audio for the resource to be considered complete.',
  },
  allContent: {
    message: 'Viewed in its entirety',
    context:
      'One of the completion criteria types. A resource with this criteria is considered complete when learners studied it all, for example they saw all pages of a document.',
  },
  determinedByResource: {
    message: 'Determined by the resource',
    context:
      'One of the completion criteria types. Typically used for embedded html5/h5p resources that contain their own completion criteria, for example reaching a score in an educational game.',
  },
  masteryMofN: {
    message: 'Goal: {m} out of {n}',
    context:
      'One of the completion criteria types specific to exercises. An exercise with this criteria is considered complete when learners answered m questions out of n correctly.',
  },
  goal: {
    message: 'When goal is met',
    context:
      'One of the completion criteria types specific to exercises. An exercise with this criteria is considered complete when learners reached a given goal, for example 100% correct.',
  },
  practiceQuiz: {
    message: 'Practice quiz',
    context:
      'One of the completion criteria types specific to exercises. An exercise with this criteria represents a quiz.',
  },
  survey: {
    message: 'Survey',
    context:
      'One of the completion criteria types specific to exercises. An exercise with this criteria represents a survey.',
  },

  // Learning Activities
  all: {
    message: 'All',
    context: 'A label for everything in the group of activities.',
  },
  watch: {
    message: 'Watch',
    context:
      'Resource and filter label for the type of learning activity with video. Translate as a VERB',
  },
  create: {
    message: 'Create',
    context: 'Resource and filter label for the type of learning activity. Translate as a VERB',
  },
  read: {
    message: 'Read',
    context:
      'Resource and filter label for the type of learning activity with documents. Translate as a VERB',
  },
  practice: {
    message: 'Practice',
    context:
      'Resource and filter label for the type of learning activity with questions and answers. Translate as a VERB',
  },
  reflect: {
    message: 'Reflect',
    context: 'Resource and filter label for the type of learning activity. Translate as a VERB',
  },
  listen: {
    message: 'Listen',
    context:
      'Resource and filter label for the type of learning activity with audio. Translate as a VERB',
  },
  explore: {
    message: 'Explore',
    context: 'Resource and filter label for the type of learning activity. Translate as a VERB',
  },

  // Library Categories
  school: {
    message: 'School',
    context: 'Category type.',
  },
  basicSkills: {
    message: 'Basic skills',
    context:
      'Category type. Basic skills refer to learning resources focused on aspects like literacy, numeracy and digital literacy.',
  },
  work: {
    message: 'Work',
    context:
      'Top level category group that contains resources for acquisition of professional skills.',
  },
  dailyLife: {
    message: 'Daily life',
    context: 'Category type. See https://en.wikipedia.org/wiki/Everyday_life',
  },
  forTeachers: {
    message: 'For teachers',
    context: 'Category type',
  },

  // School Categories
  mathematics: {
    message: 'Mathematics',
    context: 'Category type. See https://en.wikipedia.org/wiki/Mathematics',
  },
  sciences: {
    message: 'Sciences',
    context: 'Category type. See https://en.wikipedia.org/wiki/Science',
  },
  socialSciences: {
    message: 'Social sciences',
    context: 'Category type. See https://en.wikipedia.org/wiki/Social_science',
  },
  arts: {
    message: 'Arts',
    context: 'Refers to a category group type. See https://en.wikipedia.org/wiki/The_arts',
  },
  computerScience: {
    message: 'Computer science',
    context: 'Category type. See https://en.wikipedia.org/wiki/Computer_science',
  },
  languageLearning: {
    message: 'Language learning',
    context: 'Category type.',
  },
  history: {
    message: 'History',
    context: 'Category type.',
  },
  readingAndWriting: {
    message: 'Reading and writing',
    context: 'School subject category',
  },

  // Mathematics Subcategories
  arithmetic: {
    message: 'Arithmetic',
    context: 'Math category type. See https://en.wikipedia.org/wiki/Arithmetic',
  },
  algebra: {
    message: 'Algebra',
    context: 'A type of math category. See https://en.wikipedia.org/wiki/Algebra',
  },
  geometry: {
    message: 'Geometry',
    context: 'Category type.',
  },
  calculus: {
    message: 'Calculus',
    context: 'Math category type. https://en.wikipedia.org/wiki/Calculus',
  },
  statistics: {
    message: 'Statistics',
    context: 'A math category. See https://en.wikipedia.org/wiki/Statistics',
  },

  // Sciences Subcategories
  biology: {
    message: 'Biology',
    context: 'Science category type. See https://en.wikipedia.org/wiki/Biology',
  },
  chemistry: {
    message: 'Chemistry',
    context: 'Science category type. See https://en.wikipedia.org/wiki/Chemistry',
  },
  physics: {
    message: 'Physics',
    context: 'Category type. See https://en.wikipedia.org/wiki/Physics.',
  },
  earthScience: {
    message: 'Earth science',
    context: 'Category type. See https://en.wikipedia.org/wiki/Earth_science',
  },
  astronomy: {
    message: 'Astronomy',
    context: 'Science category type. See https://en.wikipedia.org/wiki/Astronomy',
  },

  //  Literature Subcategories
  literature: {
    message: 'Literature',
    context: 'Category type. See https://en.wikipedia.org/wiki/Literature',
  },
  readingComprehension: {
    message: 'Reading comprehension',
    context: 'Category type.',
  },
  writing: {
    message: 'Writing',
    context: 'Category type. See https://en.wikipedia.org/wiki/Writing',
  },
  logicAndCriticalThinking: {
    message: 'Logic and critical thinking',
    context: 'Category type. See https://en.wikipedia.org/wiki/Critical_thinking',
  },

  // Social Sciences Subcategories
  politicalScience: {
    message: 'Political science',
    context: 'Category type. See https://en.wikipedia.org/wiki/Political_science.',
  },
  sociology: {
    message: 'Sociology',
    context: 'Category type. See https://en.wikipedia.org/wiki/Sociology',
  },
  anthropology: {
    message: 'Anthropology',
    context: 'Category type. See https://en.wikipedia.org/wiki/Anthropology',
  },
  civicEducation: {
    message: 'Civic education',
    context:
      'Category type. Civic education is the study of the rights and obligations of citizens in society. See https://en.wikipedia.org/wiki/Civics',
  },

  // Arts Subcategories = {
  visualArt: {
    message: 'Visual art',
    context: 'Category type. See https://en.wikipedia.org/wiki/Visual_arts',
  },
  music: {
    message: 'Music',
    context: 'Category type. See https://en.wikipedia.org/wiki/Music',
  },
  dance: {
    message: 'Dance',
    context: 'Category type. See https://en.wikipedia.org/wiki/Dance',
  },
  drama: {
    message: 'Drama',
    context: 'Category type. See https://en.wikipedia.org/wiki/Drama',
  },

  //  Computer Science Subcategories
  programming: {
    message: 'Programming',
    context: 'Category type. See https://en.wikipedia.org/wiki/Computer_programming',
  },
  mechanicalEngineering: {
    message: 'Mechanical engineering',
    context: 'Category type. See https://en.wikipedia.org/wiki/Mechanical_engineering.',
  },
  webDesign: {
    message: 'Web design',
    context: 'Category type. See https://en.wikipedia.org/wiki/Web_design',
  },

  // Basic Skills
  literacy: {
    message: 'Literacy',
    context: 'Category type. See https://en.wikipedia.org/wiki/Literacy',
  },
  numeracy: {
    message: 'Numeracy',
    context: 'Category type. See https://en.wikipedia.org/wiki/Numeracy',
  },
  digitalLiteracy: {
    message: 'Digital literacy',
    context: 'Category type. See https://en.wikipedia.org/wiki/Digital_literacy',
  },
  learningSkills: {
    message: 'Learning skills',
    context:
      'A category label and type of basic skill.\nhttps://en.wikipedia.org/wiki/Study_skills',
  },

  // Work Categories
  professionalSkills: {
    message: 'Professional skills',
    context: 'Category type. Refers to skills that are related to a profession or a job.',
  },
  technicalAndVocationalTraining: {
    message: 'Technical and vocational training',
    context:
      'A level of education. See https://en.wikipedia.org/wiki/TVET_(Technical_and_Vocational_Education_and_Training)',
  },

  //  VocationalSubcategories
  softwareToolsAndTraining: {
    message: 'Software tools and training',
    context: 'Subcategory type for technical and vocational training.',
  },
  skillsTraining: {
    message: 'Skills training',
    context: 'Subcategory type for technical and vocational training.',
  },
  industryAndSectorSpecific: {
    message: 'Industry and sector specific',
    context: 'Subcategory type for technical and vocational training.',
  },

  // Daily Life Categories
  publicHealth: {
    message: 'Public health',
    context: 'Category type. See https://en.wikipedia.org/wiki/Public_health.',
  },
  entrepreneurship: {
    message: 'Entrepreneurship',
    context: 'Category type. See https://en.wikipedia.org/wiki/Entrepreneurship',
  },
  financialLiteracy: {
    message: 'Financial literacy',
    context: 'Category type. See https://en.wikipedia.org/wiki/Financial_literacy',
  },
  currentEvents: {
    message: 'Current events',
    context:
      "Category type. Could also be translated as 'News'. See https://en.wikipedia.org/wiki/News",
  },
  environment: {
    message: 'Environment',
    context: 'Category type. See https://en.wikipedia.org/wiki/Environmental_studies',
  },
  mediaLiteracy: {
    message: 'Media literacy',
    context: 'Category type. See https://en.wikipedia.org/wiki/Media_literacy',
  },
  diversity: {
    message: 'Diversity',
    context: 'Category type. See https://en.wikipedia.org/wiki/Diversity_(politics)',
  },
  mentalHealth: {
    message: 'Mental health',
    context: 'Category type. See https://en.wikipedia.org/wiki/Mental_health',
  },

  // Teacher-Specific Categories
  guides: {
    message: 'Guides',
    context:
      'Category label in the Kolibri resources library; refers to any guide-type material for teacher professional development.',
  },
  lessonPlans: {
    message: 'Lesson plans',
    context:
      'Category label in the Kolibri resources library; refers to lesson planning materials for teachers.',
  },

  // Resources Needed Categories = {
  forBeginners: {
    message: 'For beginners',
    context: 'Filter option and a label for the resources in the Kolibri Library.',
  },
  toUseWithPaperAndPencil: {
    message: 'Paper and pencil',
    context: 'Refers to a filter for resources.\n',
  },
  needsInternet: {
    message: 'Internet connection',
    context: 'Refers to a filter for resources.',
  },
  needsMaterials: {
    message: 'Other supplies',
    context: 'Refers to a filter for resources.\n',
  },
  softwareTools: {
    message: 'Other software tools',
    context: 'Refers to a filter for resources that need additional software to be used.',
  },
  peers: {
    message: 'Working with peers',
    context:
      'Refers to a filter for resources that require a learner to work with other learners to be used.',
  },
  teacher: {
    message: 'Working with a teacher',
    context:
      'Refers to a filter for resources that require a learner to work with a teacher to be used.',
  },

  // Accessibility category name
  accessibility: {
    message: 'Accessibility',
    context:
      'Allows the user to filter for all the resources with accessibility features for learners with disabilities.',
  },
  // Accessibility Categories
  signLanguage: {
    message: 'Includes sign language captions',
    context:
      'https://en.wikipedia.org/wiki/Sign_language\nhttps://en.wikipedia.org/wiki/List_of_sign_languages\nWherever communities of deaf people exist, sign languages have developed as useful means of communication, and they form the core of local Deaf cultures. Although signing is used primarily by the deaf and hard of hearing, it is also used by hearing individuals, such as those unable to physically speak, those who have trouble with spoken language due to a disability or condition (augmentative and alternative communication), or those with deaf family members, such as children of deaf adults. ',
  },
  audioDescription: {
    message: 'Includes audio descriptions',
    context:
      'Content has narration used to provide information surrounding key visual elements for the benefit of blind and visually impaired users.\nhttps://en.wikipedia.org/wiki/Audio_description',
  },
  taggedPdf: {
    message: 'Tagged PDF',
    context:
      'A tagged PDF includes hidden accessibility markups (tags) that make the document accessible to those who use screen readers and other assistive technology (AT).\n\nhttps://taggedpdf.com/what-is-a-tagged-pdf/',
  },
  altText: {
    message: 'Includes alternative text descriptions for images',
    context:
      'Alternative text, or alt text, is a written substitute for an image. It is used to describe information being provided by an image, graph, or any other visual element on a web page. It provides information about the context and function of an image for people with varying degrees of visual and cognitive impairments. When a screen reader encounters an image, it will read aloud the alternative text.\nhttps://www.med.unc.edu/webguide/accessibility/alt-text/',
  },
  highContrast: {
    message: 'Includes high contrast text for learners with low vision',
    context:
      "Accessibility filter used to search for resources that have high contrast color themes for users with low vision ('display' refers to digital content, not the hardware like screens or monitors).\nhttps://veroniiiica.com/2019/10/25/high-contrast-color-schemes-low-vision/",
  },
  captionsSubtitles: {
    message: 'Includes captions or subtitles',
    context:
      'Accessibility filter to search for video and audio resources that have text captions for users who are deaf or hard of hearing.\nhttps://www.w3.org/WAI/media/av/captions/',
  },

  // Used to categorize the level or audience of content
  // ContentLevels
  level: {
    message: 'Level',
    context: 'Refers to the educational learning level, such a preschool, primary, secondary, etc.',
  },
  preschool: {
    message: 'Preschool',
    context:
      'Refers to a level of education offered to children before they begin compulsory education at primary school.\n\nSee https://en.wikipedia.org/wiki/Preschool',
  },
  lowerPrimary: {
    message: 'Lower primary',
    context:
      'Refers to a level of learning. Approximately corresponds to the first half of primary school.',
  },
  upperPrimary: {
    message: 'Upper primary',
    context:
      'Refers to a level of education. Approximately corresponds to the second half of primary school.\n',
  },
  lowerSecondary: {
    message: 'Lower secondary',
    context:
      'Refers to a level of learning. Approximately corresponds to the first half of secondary school (high school).',
  },
  upperSecondary: {
    message: 'Upper secondary',
    context:
      'Refers to a level of education. Approximately corresponds to the second half of secondary school.',
  },
  tertiary: {
    message: 'Tertiary',
    context: 'A level of education. See https://en.wikipedia.org/wiki/Tertiary_education',
  },
  specializedProfessionalTraining: {
    message: 'Specialized professional training',
    context: 'Level of education that refers to training for a profession (job).',
  },
  allLevelsBasicSkills: {
    message: 'All levels -- basic skills',
    context: 'Refers to a type of educational level.',
  },
  allLevelsWorkSkills: {
    message: 'All levels -- work skills',
    context: 'Refers to a type of educational level.',
  },

  browseChannel: {
    message: 'Browse channel',
    context: 'Heading on page where a user can browse the content within a channel',
  },
  topicLabel: {
    message: 'Folder',
    context:
      'A collection of resources and other subfolders within a channel. Nested folders allow a channel to be organized as a tree or hierarchy.',
  },
  readReference: {
    message: 'Reference',
    context:
      "Label displayed for the 'Read' learning activity, used instead of the time duration information, to indicate a resource that may not need sequential reading from the beginning to the end. Similar concept as the 'reference' books in the traditional library, that the user just  'consults', and does not read from cover to cover.",
  },
  shortActivity: {
    message: 'Short activity',
    context: 'Label with time estimation for learning activities that take less than 30 minutes.',
  },
  longActivity: {
    message: 'Long activity',
    context: 'Label with time estimation for learning activities that take more than 30 minutes.',
  },
});
