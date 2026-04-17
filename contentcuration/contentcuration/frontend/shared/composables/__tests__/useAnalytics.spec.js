import useAnalytics, { Analytics } from '../useAnalytics';

describe('Studio Analytics Utilities', () => {
  let mockDataLayer;
  let resetIntervals = 0;

  beforeEach(() => {
    Analytics.destroyInstance();

    // Create mock dataLayer
    mockDataLayer = [];

    // Mock window.dataLayer
    Object.defineProperty(window, 'dataLayer', {
      value: mockDataLayer,
      writable: true,
      configurable: true,
    });

    // Mock setInterval to track intervals for cleanup
    jest.spyOn(global, 'setInterval').mockImplementation(() => {
      return resetIntervals++;
    });

    jest.spyOn(global, 'clearInterval').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Analytics.destroyInstance();
    resetIntervals = 0;
  });

  describe('useAnalytics', () => {
    describe('trackEvent', () => {
      it('should push event object to dataLayer', () => {
        const { trackEvent } = useAnalytics();
        trackEvent('test_event', { foo: 'bar' });

        expect(mockDataLayer).toHaveLength(1);
        expect(mockDataLayer[0]).toEqual({
          event: 'test_event',
          foo: 'bar',
        });
      });

      it('should handle event with no data', () => {
        const { trackEvent } = useAnalytics();
        trackEvent('simple_event');

        expect(mockDataLayer).toHaveLength(1);
        expect(mockDataLayer[0]).toEqual({
          event: 'simple_event',
        });
      });

      it('should handle event with empty data object', () => {
        const { trackEvent } = useAnalytics();
        trackEvent('empty_data_event', {});

        expect(mockDataLayer).toHaveLength(1);
        expect(mockDataLayer[0]).toEqual({
          event: 'empty_data_event',
        });
      });
    });

    describe('trackAction', () => {
      it('should push event with eventAction', () => {
        const { trackAction } = useAnalytics();
        trackAction('channel_editor', 'Open', { nodeId: '123' });

        expect(mockDataLayer).toHaveLength(1);
        expect(mockDataLayer[0]).toEqual({
          event: 'channel_editor',
          eventAction: 'Open',
          nodeId: '123',
        });
      });

      it('should handle action with no extra data', () => {
        const { trackAction } = useAnalytics();
        trackAction('simple_action', 'Execute');

        expect(mockDataLayer).toHaveLength(1);
        expect(mockDataLayer[0]).toEqual({
          event: 'simple_action',
          eventAction: 'Execute',
        });
      });
    });

    describe('trackClick', () => {
      it('should push click event with eventLabel', () => {
        const { trackClick } = useAnalytics();
        trackClick('clipboard', 'Copy', { source: 'toolbar' });

        expect(mockDataLayer).toHaveLength(1);
        expect(mockDataLayer[0]).toEqual({
          event: 'clipboard',
          eventAction: 'Click',
          eventLabel: 'Copy',
          source: 'toolbar',
        });
      });

      it('should handle click with no extra data', () => {
        const { trackClick } = useAnalytics();
        trackClick('button', 'Submit');

        expect(mockDataLayer).toHaveLength(1);
        expect(mockDataLayer[0]).toEqual({
          event: 'button',
          eventAction: 'Click',
          eventLabel: 'Submit',
        });
      });
    });

    describe('trackCurrentChannel', () => {
      const mockChannel = {
        id: 'abc123',
        name: 'Test Channel',
        last_published: '2024-01-01',
        public: true,
        edit: false,
      };

      it('should push channel data to dataLayer', () => {
        const { trackCurrentChannel } = useAnalytics();
        trackCurrentChannel(mockChannel, false);

        expect(mockDataLayer).toHaveLength(1);
        expect(mockDataLayer[0].currentChannel).toEqual({
          id: 'abc123',
          name: 'Test Channel',
          lastPublished: '2024-01-01',
          isPublic: true,
          allowEdit: false,
          staging: false,
        });
      });

      it('should not push duplicate channel data', () => {
        const { trackCurrentChannel } = useAnalytics();
        trackCurrentChannel(mockChannel);
        trackCurrentChannel(mockChannel);

        expect(mockDataLayer).toHaveLength(1);
      });

      it('should handle staging flag as true', () => {
        const { trackCurrentChannel } = useAnalytics();
        trackCurrentChannel(mockChannel, true);

        expect(mockDataLayer).toHaveLength(1);
        expect(mockDataLayer[0].currentChannel.staging).toBe(true);
      });
    });

    describe('push', () => {
      it('should push arbitrary data to dataLayer', () => {
        const { push } = useAnalytics();
        push({ custom: 'data' });

        expect(mockDataLayer).toHaveLength(1);
        expect(mockDataLayer[0]).toEqual({ custom: 'data' });
      });

      it('should push multiple arguments', () => {
        const { push } = useAnalytics();
        push({ first: 1 }, { second: 2 });

        expect(mockDataLayer).toHaveLength(2);
        expect(mockDataLayer[0]).toEqual({ first: 1 });
        expect(mockDataLayer[1]).toEqual({ second: 2 });
      });
    });

    describe('reset', () => {
      it('should skip reset if dataLayer unchanged', () => {
        const { reset } = useAnalytics();
        const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

        reset();

        expect(consoleSpy).toHaveBeenCalledWith('Skipping Analytics.reset()');
        consoleSpy.mockRestore();
      });

      it('should execute reset when dataLayer has changed', () => {
        const { push, reset } = useAnalytics();
        push({ test: 'data' });

        reset();

        // Reset function should be pushed to dataLayer
        expect(mockDataLayer.length).toBeGreaterThan(1);
      });

      it('should push reset function to dataLayer with counter', () => {
        const { push, reset } = useAnalytics();
        push({ test: 'data' });

        reset();

        // Reset pushes a function to dataLayer
        const resetFn = mockDataLayer.find(item => typeof item === 'function');
        expect(resetFn).toBeDefined();
        expect(typeof resetFn.counter).toBe('number');
      });
    });

    describe('initialization', () => {
      it('should set up reset interval on creation', () => {
        useAnalytics();

        expect(global.setInterval).toHaveBeenCalledWith(expect.any(Function), 5 * 60 * 1000);
      });
    });

    describe('method signatures', () => {
      it('should export all required methods', () => {
        const analytics = useAnalytics();

        expect(analytics).toHaveProperty('trackEvent');
        expect(analytics).toHaveProperty('trackAction');
        expect(analytics).toHaveProperty('trackClick');
        expect(analytics).toHaveProperty('trackCurrentChannel');
        expect(analytics).toHaveProperty('push');
        expect(analytics).toHaveProperty('reset');
      });

      it('should have trackEvent as a function', () => {
        const { trackEvent } = useAnalytics();
        expect(typeof trackEvent).toBe('function');
      });

      it('should have trackAction as a function', () => {
        const { trackAction } = useAnalytics();
        expect(typeof trackAction).toBe('function');
      });

      it('should have trackClick as a function', () => {
        const { trackClick } = useAnalytics();
        expect(typeof trackClick).toBe('function');
      });

      it('should have trackCurrentChannel as a function', () => {
        const { trackCurrentChannel } = useAnalytics();
        expect(typeof trackCurrentChannel).toBe('function');
      });

      it('should have push as a function', () => {
        const { push } = useAnalytics();
        expect(typeof push).toBe('function');
      });

      it('should have reset as a function', () => {
        const { reset } = useAnalytics();
        expect(typeof reset).toBe('function');
      });
    });
  });

  describe('Analytics', () => {
    describe('getInstance', () => {
      it('should create a new instance if one does not exist', () => {
        const instance = Analytics.getInstance();
        expect(instance).toBeInstanceOf(Analytics);
      });

      it('should return the same instance on subsequent calls', () => {
        const instance1 = Analytics.getInstance();
        const instance2 = Analytics.getInstance();
        expect(instance1).toBe(instance2);
      });

      it('should use window.dataLayer if available', () => {
        const instance = Analytics.getInstance();
        expect(instance.dataLayer).toBe(mockDataLayer);
      });
    });

    describe('destroyInstance', () => {
      it('should nullify the instance and clear interval', () => {
        const instance = Analytics.getInstance();
        const spy = jest.spyOn(instance, 'destroy');
        Analytics.destroyInstance();
        expect(spy).toHaveBeenCalled();
        expect(global.clearInterval).toHaveBeenCalled();
      });
    });
  });
});
