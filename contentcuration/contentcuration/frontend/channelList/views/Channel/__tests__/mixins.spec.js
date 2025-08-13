import { mount } from '@vue/test-utils';
import router from '../../../router';
import { catalogFilterMixin } from '../mixins';

describe('mixins', () => {
  let wrapper;

  describe('catalogFilterMixin', () => {
    beforeEach(() => {
      wrapper = mount(
        {
          mixins: [catalogFilterMixin],
        },
        { router },
      );
    });

    it('clearFilters should remove all query params', () => {
      router.replace({ query: { keywords: true } });
      wrapper.vm.clearFilters();
      expect(wrapper.vm.$route.query.keywords).toBeUndefined();
    });
    it('change in filters should automatically navigate to page 1', () => {
      router.replace({ query: { page: 5 } });
      wrapper.vm.keywords = 'testing';
      expect(wrapper.vm.$route.query.page).toBe(1);
    });

    describe('should set query param on filter change', () => {
      it('keyword filter', () => {
        wrapper.vm.keywords = 'testing';
        expect(wrapper.vm.$route.query.keywords).toBe('testing');
      });
      it('languages filter', () => {
        wrapper.vm.languages = ['en', 'es'];
        expect(wrapper.vm.$route.query.languages).toBe('en,es');
      });
      it('licenses filter', () => {
        wrapper.vm.licenses = ['CC BY', 'CC BY-SA'];
        expect(wrapper.vm.$route.query.licenses).toBe('CC BY,CC BY-SA');
      });
      it('kinds filter', () => {
        wrapper.vm.kinds = ['audio', 'document'];
        expect(wrapper.vm.$route.query.kinds).toBe('audio,document');
      });
      it('bookmark filter', () => {
        wrapper.vm.bookmark = true;
        expect(wrapper.vm.$route.query.bookmark).toBe(true);
      });
      it('coach filter', () => {
        wrapper.vm.coach = true;
        expect(wrapper.vm.$route.query.coach).toBe(true);
      });
      it('assessments filter', () => {
        wrapper.vm.assessments = true;
        expect(wrapper.vm.$route.query.assessments).toBe(true);
      });
      it('subtitles filter', () => {
        wrapper.vm.subtitles = true;
        expect(wrapper.vm.$route.query.subtitles).toBe(true);
      });
      it('collection filter', () => {
        wrapper.vm.collection = 1;
        expect(wrapper.vm.$route.query.collection).toBe(1);
      });
    });
    describe('should remove query param if filter is empty', () => {
      beforeEach(() => {
        router.replace({
          query: {
            keywords: true,
            languages: true,
            licenses: true,
            kinds: true,
            bookmark: true,
            coach: true,
            assessments: true,
            subtitles: true,
            collection: true,
          },
        });
      });
      it('keyword filter', () => {
        wrapper.vm.keywords = '';
        expect(wrapper.vm.$route.query.keywords).toBeUndefined();
      });
      it('languages filter', () => {
        wrapper.vm.languages = [];
        expect(wrapper.vm.$route.query.languages).toBeUndefined();
      });
      it('licenses filter', () => {
        wrapper.vm.licenses = [];
        expect(wrapper.vm.$route.query.licenses).toBeUndefined();
      });
      it('kinds filter', () => {
        wrapper.vm.kinds = [];
        expect(wrapper.vm.$route.query.kinds).toBeUndefined();
      });
      it('bookmark filter', () => {
        wrapper.vm.bookmark = false;
        expect(wrapper.vm.$route.query.bookmark).toBeUndefined();
      });
      it('coach filter', () => {
        wrapper.vm.coach = false;
        expect(wrapper.vm.$route.query.coach).toBeUndefined();
      });
      it('assessments filter', () => {
        wrapper.vm.assessments = false;
        expect(wrapper.vm.$route.query.assessments).toBeUndefined();
      });
      it('subtitles filter', () => {
        wrapper.vm.subtitles = false;
        expect(wrapper.vm.$route.query.subtitles).toBeUndefined();
      });
      it('collection filter', () => {
        wrapper.vm.collection = '';
        expect(wrapper.vm.$route.query.collection).toBeUndefined();
      });
    });
  });
});
