Feature: Delete a collection

	Background:
		Given I am signed in to Studio
			And I am on the *Collections* tab
			And there is at least one collection

	Scenario: Delete a collection
		When I click the *Options* drop-down for the collection I want to edit
			And I select the *Delete collection* option
		Then I see the *Delete collection* modal window
		When I click the *Delete collection* button
		Then I see the *Collections* tab
			And I see that the deleted collection is no longer displayed
