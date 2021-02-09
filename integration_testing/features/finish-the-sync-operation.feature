Feature: Finish the sync operation

	Background:
		Given I have made sync parameter selections
			And my sync task is in-progress

	Scenario: Finish the sync operation
		When the sync progress bar finishes
		Then the progress dialog disappears
			And I am back in the channel editor page
			And a snackbar appears to confirm the sync completion