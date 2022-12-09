Feature: Create a collection

	Background:
		Given I am signed in to Studio
			And I am on the *Collections* tab

	Scenario: Create an empty collection
		When I click the *New collection* button
			And I fill in the *Collection name* field
			And I click the *Create* button
		Then I see the *Collections* tab
			And I see the newly created collection

	Scenario: Create a collection by selecting channels
		When I click the *New collection* button
			And I click the *Select channels* button
		Then I see the *Select channels* page
			And I am on the *Content library* tab # alternatively I can select the *My channels* or *View-only* tab
		When I select one or several channels
			And I click the *Finish* button
		Then I see the the *New collection* screen with the selected channels
			When I click the *Create* button
		Then I see the *Collections* tab
			And I see the newly created collection
			And I see the number of channels in that collection

	Scenario: Create a collection by searching for channels
		When I click the *New collection* button
			And I click the *Select channels* button
		Then I see the *Select channels* page
			And I am on the *Content library* tab # alternatively I can select the *My channels* or *View-only* tab
		When I enter a search term in the *Search for a channel* field
            And I select one or several channels
			And I click the *Finish* button
		Then I see the the *New collection* screen with the selected channels
			When I click the *Create* button
		Then I see the *Collections* tab
			And I see the newly created collection
			And I see the number of channels in that collection
