describe('ImportContentProgressModal', () => {
  describe('when in-progress', () => {
    it('shows the correct copy and progress', () => {});

    it('clicking the "Stop Import" button causes component to go to cancelling state', () => {});
  });

  describe('when complete', () => {
    it('shows the correct copy and progress', () => {});

    it('clicking the "Refresh" button causes component to emit a "refresh" event', () => {});

    it('closing then re-opening component resets its state', () => {});
  });

  describe('when canceling', () => {
    it('shows the correct copy', () => {});

    it('clicking the "Yes..." button causes component to emit a "stop_task" event', () => {});

    it('clicking the "No..." button causes component to go to in-progress/complete state', () => {});

    it('closing then re-opening component resets its state', () => {});
  });
});
