Feature: Edit a collection

	Background:
		Given I am signed in to Studio
			And I am on the *Collections* tab
			And there is at least one collection

	Scenario: Edit a collection
		When I click the *Options* drop-down for the collection I want to edit
			And I select the *Edit collection* option
		Then I see the collection's details
			And I can change the collection name
		When I click the *Select channels* button
		Then I am on the *Content library* tab # alternatively I can select the *My channels* or *View-only* tab
		When I select one or several channels
			And I click the *Finish* button
		Then I see the the *New collection* screen with the selected channels
		When I click the *Remove* button
			Then I see a message *Channel removed*
		When I click the *Save and close* button
		Then I see the *Collections* tab
			And I see the edited collection
			And I see the number of channels in that collection
