Feature: Finishing the sync operation

	Background:
		Given I have made syncing parameter selections
			And my sync task is in-progress

	Scenario: Finishing the sync operation
		When the sync progress bar finishes
		Then the progress dialog disappears
			And I am back in the channel editor apge
			And a snackbar appears confirming the sync completion