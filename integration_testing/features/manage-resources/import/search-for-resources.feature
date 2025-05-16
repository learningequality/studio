Feature: Search for resources

	Background:
		Given I am signed in to Studio
			And I am at the channel editing page
		When I click the *Add* button
			And I select the *Import from channels* option
		Then I see the *Import from other channels* modal

	Scenario: Search for resources from the *Content library*
		When I enter a <search_term> in the search bar # *Content library* is selected by default in the *Channels* drop-down
			And I click the *Search* button
		Then I see all the search results from the *Content library* for my <search_term>

	Scenario: Search for resources from *My channels*
		When I enter a <search_term> in the search bar
			And I select *My channels* from the *Channels* drop-down
			And I click the *Search* button
		Then I see all the search results from *My channels* for my <search_term>

	Scenario: Search for resources from *Starred*
		When I enter a <search_term> in the search bar
			And I select *Starred* from the *Channels* drop-down
			And I click the *Search* button
		Then I see all the search results from *Starred* for my <search_term>

	Scenario: Search for resources from *View-only*
		When I enter a <search_term> in the search bar
			And I select *View-only* from the *Channels* drop-down
			And I click the *Search* button
		Then I see all the search results from *View-only* for my <search_term>

	Scenario: Search for resources by applying the *Language* filter
		When I enter a <search_term> in the search bar
			And I select a <language> from the *Language* drop-down
			And I click the *Search* button
		Then I see search results only from channels in the selected <language>
