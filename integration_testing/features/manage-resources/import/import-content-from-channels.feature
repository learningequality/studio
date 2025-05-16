Feature: Import content from another channel

	Background:
		Given I am signed in to Studio
			And I am on the <channel> editing page

	Scenario: Import content from another channel
		When I click the *Add* button
			And I select the *Import from Channels* option
		Then I see the *Import from Other Channels* page
			And I see a list of channels that I have access to
		When I expand <channel> which I have access to
			And select some content under <channel>
			And press *Review* button
		Then I see the review screen
		When I finish reviewing my selections
			And I press *Import* button
		Then I see the *Copying content* modal which displays the import progress
			And I don't see the *Import from Other channels* page
			And I see the <channel> editing page again

	Scenario: Import content from the search results
		When I click the *Add* button
			And I select the *Import from Channels* option
		Then I see the *Import from Other Channels* page
		When I enter the <search_term> in the search bar
			And I click the *Search* button
		Then I see all the search results for my <search_term>
		When I select a <resource> from the results
			And I click the *Review* button
		Then I see the *Review selections for import* modal
		When I click the *Import* button
		Then I see *Copying Content* modal
			And I see the *Operation is complete!...* notification
		When I click the *Refresh* button
		Then I see the imported <resource> in the <channel>

	Scenario: Import content from the search results at *My Channels* <channel>
		When I click the *Add* button
			And I select the *Import from Channels* option
		Then I see the *Import from Other Channels* modal
		When I select a <topic> and a <resource> from the public channels
			And I click the *Review* button
		Then I see the *Review selections for import* page
		When I click the arrow button to open the topic tree for <topic>
		Then I see all the resources of the <topic> topic
		When I click the *Import* button
		Then I see *Copying Content* modal

	Scenario: Resource count gets updated properly
		When I click the *Add* button
			And I select the *Import from channels* option
		Then I see the *Import from other channels* page
		When I select the <topic> from <import_channel>
		Then I see the *N topics, '<num_resources>' resources* notification at the bottom
		When I select a single <resource>
		Then I see the *N topics, '<num_resources>+1' resources* notification at the bottom
		When I deselect the <topic>
		Then I see the *0 topics, 1 resource* notification at the bottom of the page

	Scenario: Review import selection at *My Channels*
		Given I click the *Add* button
		Then I see *Import from Channels* button
		When I click the *Import from Channels* button
		Then I see the *Import from Other Channels* page
		When I select <channel> contents
			And I click *Review* button
		Then I see the list of <channel> contents I selected