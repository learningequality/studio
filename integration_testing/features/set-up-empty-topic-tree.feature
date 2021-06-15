Feature: Set up empty topic tree

	Background:
		Given I am signed in to Studio
			And I am on the channel editor page for an empty channel

	Scenario: Create an empty topic tree
		When I click the *Add* button in the top right corner
			And I click the *New topic* option
		Then I see the *New topic* modal
		When I fill in the required fields
			And I click the *Add new topic* button
		Then I can fill in the required fields for a new topic #repeat this process for as many empty topics you need
		When I click the *Finish* button
		Then I am on the channel editor page
			And I can see the empty topics

	Scenario: Create sub-topics
		Given I have created an empty topic tree
		When I click *⋮* (Options) button for a topic
			And I click the *New topic* option
		Then I see the *New topic* modal
		When I fill in the required fields
			And I click the *Add new topic* button
		Then I can fill in the required fields for a new topic #repeat this process for as many empty topics you need
		When I click the *Finish* button
		Then I am on the channel editor page
			And I can click on the topic to see the created sub-topics
			