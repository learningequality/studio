Feature: Sync channel

	Background:
		Given I am signed in to Studio as a non-admin user
			And I am in the channel editor page
		When I click on the ellipsis button in the top-right corner
			And I click on the *Sync channel* menu option
		Then a *Sync resources* modal appears

	Scenario: Sync channel
		When I make sync selections via the checkboxes
			And click the *Continue* button
		Then a modal appears to confirm my sync choices
		When I click *Sync*
		Then a progress bar appears

	Scenario: Imported content is updated through syncing
		Given the original content (v1) resource has been changed (v2)
			And I still have the old version (v1) in my channel
		When the "Sync Resources" process has completed
		Then my channel should be updated (v2)

	Scenario: Edited content is replaced through syncing
		Given I have imported content (v1) from another channel
			And I have made edits to that content (v2)
		When the "Sync Resources" process has completed
		Then my channel content (v2) should be reverted to the imported version (v1)
