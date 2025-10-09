/**
 * Integration tests for KModal dialogs in EditModal
 * This mounts the actual EditModal component and verifies dialog behavior
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/vue';
import { createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';
import VueRouter from 'vue-router';
import EditModal from '../EditModal';

/* This is mocking all the constants used in the EditModal component */
jest.mock('shared/constants', () => ({
  AssessmentItemTypes: {
    SINGLE_SELECTION: 'single_selection',
    MULTIPLE_SELECTION: 'multiple_selection',
    TRUE_FALSE: 'true_false',
    INPUT_QUESTION: 'input_question',
    PERSEUS_QUESTION: 'perseus_question',
    FREE_RESPONSE: 'free_response',
  },
  RouteNames: {
    CONTENTNODE_DETAILS: 'CONTENTNODE_DETAILS',
    TREE_VIEW: 'TREE_VIEW',
    ADD_TOPICS: 'ADD_TOPICS',
    UPLOAD_FILES: 'UPLOAD_FILES',
    ADD_EXERCISE: 'ADD_EXERCISE',
  },
  TabNames: {
    DETAILS: 'details',
    PREVIEW: 'preview',
    QUESTIONS: 'questions',
    RELATED: 'related',
  },
  DELAYED_VALIDATION: 'delayed_validation',
  ChannelListTypes: {
    EDITABLE: 'EDITABLE',
    VIEW_ONLY: 'VIEW_ONLY',
    PUBLIC: 'PUBLIC',
    STARRED: 'STARRED',
  },
  ValidationErrors: {
    TITLE_REQUIRED: 'TITLE_REQUIRED',
  },
  AccessibilityCategories: {
    CAPTIONS_SUBTITLES: 'captions_subtitles',
    AUDIO_DESCRIPTION: 'audio_description',
    SIGN_LANGUAGE: 'sign_language',
    ALT_TEXT: 'alt_text',
    HIGH_CONTRAST: 'high_contrast',
    TAGGED_PDF: 'tagged_pdf',
  },
  ContentKindsNames: {
    TOPIC: 'topic',
    VIDEO: 'video',
    AUDIO: 'audio',
    EXERCISE: 'exercise',
    DOCUMENT: 'document',
    HTML5: 'html5',
    SLIDESHOW: 'slideshow',
  },
}));

// This Mock is of channelEdit/constants to use the mocked shared/constants
jest.mock('../../../constants', () => {
  const mockAssessmentItemTypes = {
    SINGLE_SELECTION: 'single_selection',
    MULTIPLE_SELECTION: 'multiple_selection',
    TRUE_FALSE: 'true_false',
    INPUT_QUESTION: 'input_question',
    PERSEUS_QUESTION: 'perseus_question',
    FREE_RESPONSE: 'free_response',
  };

  return {
    RouteNames: {
      TREE_ROOT_VIEW: 'TREE_ROOT_VIEW',
      TREE_VIEW: 'TREE_VIEW',
      STAGING_TREE_VIEW: 'STAGING_TREE_VIEW',
      STAGING_TREE_VIEW_REDIRECT: 'STAGING_TREE_VIEW_REDIRECT',
      ORIGINAL_SOURCE_NODE_IN_TREE_VIEW: 'ORIGINAL_SOURCE_NODE_IN_TREE_VIEW',
      CONTENTNODE_DETAILS: 'CONTENTNODE_DETAILS',
      MULTI_CONTENTNODE_DETAILS: 'MULTI_CONTENTNODE_DETAILS',
      IMPORT_FROM_CHANNELS: 'IMPORT_FROM_CHANNELS',
      IMPORT_FROM_CHANNELS_BROWSE: 'IMPORT_FROM_CHANNELS_BROWSE',
      IMPORT_FROM_CHANNELS_SEARCH: 'IMPORT_FROM_CHANNELS_SEARCH',
      IMPORT_FROM_CHANNELS_REVIEW: 'IMPORT_FROM_CHANNELS_REVIEW',
      ADD_TOPICS: 'ADD_TOPICS',
      ADD_EXERCISE: 'ADD_EXERCISE',
      UPLOAD_FILES: 'UPLOAD_FILES',
      TRASH: 'TRASH',
      ADD_PREVIOUS_STEPS: 'ADD_PREVIOUS_STEPS',
      ADD_NEXT_STEPS: 'ADD_NEXT_STEPS',
    },
    viewModes: {
      DEFAULT: 'DEFAULT_VIEW',
      COMFORTABLE: 'COMFORTABLE_VIEW',
      COMPACT: 'COMPACT_VIEW',
    },
    ChannelEditPageErrors: Object.freeze({
      CHANNEL_NOT_FOUND: 'CHANNEL_EDIT_ERROR_CHANNEL_NOT_FOUND',
      CHANNEL_DELETED: 'CHANNEL_EDIT_ERROR_CHANNEL_DELETED',
    }),
    AssessmentItemToolbarActions: {
      EDIT_ITEM: 'EDIT_ITEM',
      MOVE_ITEM_UP: 'MOVE_ITEM_UP',
      MOVE_ITEM_DOWN: 'MOVE_ITEM_DOWN',
      DELETE_ITEM: 'DELETE_ITEM',
      ADD_ITEM_ABOVE: 'ADD_ITEM_ABOVE',
      ADD_ITEM_BELOW: 'ADD_ITEM_BELOW',
    },
    AssessmentItemTypeLabels: {
      [mockAssessmentItemTypes.SINGLE_SELECTION]: 'questionTypeSingleSelection',
      [mockAssessmentItemTypes.MULTIPLE_SELECTION]: 'questionTypeMultipleSelection',
      [mockAssessmentItemTypes.TRUE_FALSE]: 'questionTypeTrueFalse',
      [mockAssessmentItemTypes.INPUT_QUESTION]: 'questionTypeInput',
      [mockAssessmentItemTypes.PERSEUS_QUESTION]: 'questionTypePerseus',
      [mockAssessmentItemTypes.FREE_RESPONSE]: 'questionTypeFreeResponse',
    },
    TabNames: {
      DETAILS: 'details',
      PREVIEW: 'preview',
      QUESTIONS: 'questions',
      RELATED: 'related',
    },
    modes: {
      EDIT: 'EDIT',
      NEW_TOPIC: 'NEW_TOPIC',
      NEW_EXERCISE: 'NEW_EXERCISE',
      UPLOAD: 'UPLOAD',
      VIEW_ONLY: 'VIEW_ONLY',
    },
    DraggableUniverses: {
      CONTENT_NODES: 'contentNodes',
    },
    DraggableRegions: {
      TREE: 'tree',
      TOPIC_VIEW: 'topicView',
      CLIPBOARD: 'clipboard',
    },
    ImportSearchPageSize: 10,
    QuickEditModals: {
      TITLE_DESCRIPTION: 'TITLE_DESCRIPTION',
      TAGS: 'TAGS',
      LANGUAGE: 'LANGUAGE',
      CATEGORIES: 'CATEGORIES',
      LEVELS: 'LEVELS',
      LEARNING_ACTIVITIES: 'LEARNING_ACTIVITIES',
      SOURCE: 'SOURCE',
      AUDIENCE: 'AUDIENCE',
      COMPLETION: 'COMPLETION',
      WHAT_IS_NEEDED: 'WHAT_IS_NEEDED',
    },
  };
});

jest.mock('shared/views/files/FileStorage', () => ({
  template: '<div />',
}));

jest.mock('shared/leUtils/FormatPresets', () => ({
  __esModule: true,
  default: new Map(),
  FormatPresetsList: [],
  FormatPresetsNames: {
    AUDIO: 'audio',
    AUDIO_DEPENDENCY: 'audio_dependency',
    AUDIO_THUMBNAIL: 'audio_thumbnail',
    BLOOMPUB: 'bloompub',
    CHANNEL_THUMBNAIL: 'channel_thumbnail',
    DOCUMENT: 'document',
    DOCUMENT_THUMBNAIL: 'document_thumbnail',
    EPUB: 'epub',
    EXERCISE: 'exercise',
    EXERCISE_GRAPHIE: 'exercise_graphie',
    EXERCISE_IMAGE: 'exercise_image',
    EXERCISE_THUMBNAIL: 'exercise_thumbnail',
    H5P: 'h5p',
    H5P_THUMBNAIL: 'h5p_thumbnail',
    HIGH_RES_VIDEO: 'high_res_video',
    HTML5_DEPENDENCY: 'html5_dependency',
    HTML5_THUMBNAIL: 'html5_thumbnail',
    HTML5_ZIP: 'html5_zip',
    IMSCP_ZIP: 'imscp_zip',
    KPUB: 'kpub',
    LOW_RES_VIDEO: 'low_res_video',
    QTI: 'qti',
    QTI_THUMBNAIL: 'qti_thumbnail',
    SLIDESHOW_IMAGE: 'slideshow_image',
    SLIDESHOW_MANIFEST: 'slideshow_manifest',
    SLIDESHOW_THUMBNAIL: 'slideshow_thumbnail',
    TOPIC_THUMBNAIL: 'topic_thumbnail',
    VIDEO_DEPENDENCY: 'video_dependency',
    VIDEO_SUBTITLE: 'video_subtitle',
    VIDEO_THUMBNAIL: 'video_thumbnail',
    ZIM: 'zim',
    ZIM_THUMBNAIL: 'zim_thumbnail',
  },
}));

jest.mock('shared/leUtils/ContentKinds', () => ({
  ContentKindLearningActivityDefaults: {},
}));

jest.mock('shared/utils/validation', () => ({
  isNodeComplete: jest.fn().mockReturnValue(true),
}));

// Mocking child components

jest.mock('../EditView', () => ({
  name: 'EditView',
  template: '<div data-test="edit-view-stub"></div>',
}));

jest.mock('../DetailsTabView', () => ({
  name: 'DetailsTabView',
  template: '<div></div>',
}));

jest.mock('../AccessibilityOptions', () => ({
  name: 'AccessibilityOptions',
  template: '<div></div>',
}));

/* Test setup and configuration */

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.use(VueRouter);

/* Vue prototype properties */
localVue.prototype.$isRTL = false;
localVue.prototype.$tr = msg => msg;
localVue.prototype.$themeTokens = { textInverted: 'white' };
localVue.prototype.$analytics = { trackAction: jest.fn() };
const mockRouter = new VueRouter({
  routes: [
    {
      path: '/',
      name: 'CONTENTNODE_DETAILS',
    },
    {
      path: '/tree',
      name: 'TREE_VIEW',
    },
  ],
});

const originalPush = mockRouter.push;
mockRouter.push = function push(location) {
  return originalPush.call(this, location).catch(err => {
    if (err.name === 'NavigationDuplicated') return;
    throw err;
  });
};

/* Component stubs */
const stubs = {
  VDialog: true,
  VCard: true,
  VToolbar: true,
  VToolbarTitle: true,
  VSpacer: true,
  VToolbarItems: true,
  VContent: true,
  VLayout: true,
  VFlex: true,
  Icon: true,
  OfflineText: true,
  ResizableNavigationDrawer: true,
  FileDropzone: true,
  ToolBar: true,
  LoadingText: true,
  BottomBar: true,
  SavingIndicator: true,
  MessageDialog: true,
  Uploader: true,
};

/* Vuex store configuration */
const baseModules = {
  contentNode: {
    namespaced: true,
    getters: {
      getContentNode: () => () => ({
        title: 'Test Node',
        complete: true,
        kind: 'video',
      }),
      getContentNodeIsValid: () => () => true,
    },
    actions: {
      loadContentNodes: jest.fn().mockResolvedValue([]),
      loadRelatedResources: jest.fn().mockResolvedValue([]),
      loadContentNode: jest.fn().mockResolvedValue({}),
      updateContentNode: jest.fn().mockResolvedValue({}),
    },
    mutations: {
      ENABLE_VALIDATION_ON_NODES: jest.fn(),
    },
  },
  assessmentItem: {
    namespaced: true,
    getters: {
      getAssessmentItems: () => () => [],
    },
    actions: {
      loadAssessmentItems: jest.fn().mockResolvedValue([]),
    },
  },
  currentChannel: {
    namespaced: true,
    getters: {
      currentChannel: () => ({ id: 'test-channel' }),
      canEdit: () => true,
    },
  },
  file: {
    namespaced: true,
    getters: {
      contentNodesAreUploading: () => () => false,
      getContentNodeFiles: () => () => [],
    },
    actions: {
      loadFiles: jest.fn().mockResolvedValue([]),
    },
  },
  connection: {
    namespaced: true,
    state: {
      online: true,
    },
    getters: {
      online: state => state.online,
    },
  },
};

let store;

describe('EditModal KModal Dialogs', () => {
  beforeEach(() => {
    store = new Vuex.Store({
      getters: {
        appendChannelName: jest.fn(name => name),
      },
      modules: baseModules,
    });
    mockRouter.push('/');
  });

  /* Upload in progress dialog */
  describe('Upload in progress dialog', () => {
    it('should show dialog when promptUploading is true', async () => {
      render(EditModal, {
        localVue,
        store,
        router: mockRouter,
        stubs,
        propsData: {
          detailNodeIds: 'test-node-id',
          tab: 'details',
        },
        data() {
          return {
            loading: false,
            loadError: false,
            promptUploading: true,
          };
        },
      });

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: /uploadInProgressHeader/i }),
        ).toBeInTheDocument();
        expect(screen.getByText('uploadInProgressText')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'dismissDialogButton' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'cancelUploadsButton' })).toBeInTheDocument();
      });
    });

    it('should close dialog when cancel is clicked', async () => {
      render(EditModal, {
        localVue,
        store,
        router: mockRouter,
        stubs,
        propsData: {
          detailNodeIds: 'test-node-id',
          tab: 'details',
        },
        data() {
          return {
            loading: false,
            loadError: false,
            promptUploading: true,
          };
        },
      });

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: /uploadInProgressHeader/i }),
        ).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: 'dismissDialogButton' });
      await fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(
          screen.queryByRole('heading', { name: /uploadInProgressHeader/i }),
        ).not.toBeInTheDocument();
      });
    });
  });

  /* Save failed dialog */
  describe('Save failed dialog', () => {
    it('should show dialog when promptFailed is true', async () => {
      render(EditModal, {
        localVue,
        store,
        router: mockRouter,
        stubs,
        propsData: {
          detailNodeIds: 'test-node-id',
          tab: 'details',
        },
        data() {
          return {
            loading: false,
            loadError: false,
            promptFailed: true,
          };
        },
      });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /saveFailedHeader/i })).toBeInTheDocument();
        expect(screen.getByText('saveFailedText')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'okButton' })).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: 'closeWithoutSavingButton' }),
        ).toBeInTheDocument();
      });
    });

    it('should close dialog when OK is clicked', async () => {
      render(EditModal, {
        localVue,
        store,
        router: mockRouter,
        stubs,
        propsData: {
          detailNodeIds: 'test-node-id',
          tab: 'details',
        },
        data() {
          return {
            loading: false,
            loadError: false,
            promptFailed: true,
          };
        },
      });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /saveFailedHeader/i })).toBeInTheDocument();
      });

      const okButton = screen.getByRole('button', { name: 'okButton' });
      await fireEvent.click(okButton);

      await waitFor(() => {
        expect(
          screen.queryByRole('heading', { name: /saveFailedHeader/i }),
        ).not.toBeInTheDocument();
      });
    });

    it('should close dialog when "Close without saving" is clicked', async () => {
      render(EditModal, {
        localVue,
        store,
        router: mockRouter,
        stubs,
        propsData: {
          detailNodeIds: 'test-node-id',
          tab: 'details',
        },
        data() {
          return {
            loading: false,
            loadError: false,
            promptFailed: true,
          };
        },
      });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /saveFailedHeader/i })).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: 'closeWithoutSavingButton' });
      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.queryByRole('heading', { name: /saveFailedHeader/i }),
        ).not.toBeInTheDocument();
      });
    });
  });

  /* Upload in progress dialog submit action */
  describe('Upload in progress dialog submit action', () => {
    it('should close dialog when "Exit" is clicked', async () => {
      render(EditModal, {
        localVue,
        store,
        router: mockRouter,
        stubs,
        propsData: {
          detailNodeIds: 'test-node-id',
          tab: 'details',
        },
        data() {
          return {
            loading: false,
            loadError: false,
            promptUploading: true,
          };
        },
      });

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: /uploadInProgressHeader/i }),
        ).toBeInTheDocument();
      });

      const exitButton = screen.getByRole('button', { name: 'cancelUploadsButton' });
      await fireEvent.click(exitButton);

      await waitFor(() => {
        expect(
          screen.queryByRole('heading', { name: /uploadInProgressHeader/i }),
        ).not.toBeInTheDocument();
      });
    });
  });
});
