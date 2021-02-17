Feature: Use channels with view-only access

	Background: 
		Given I am signed in to Studio as a non-admin user
			And I am on the <channel> editor page
			And I have view-only permissions for <channel>

	Scenario: Navigate topic tree
		When I click the <topic> topic
		Then I see its subtopics and resources
		When I click the *>* button for the <topic> topic when collapsed
		Then I see the its subtopics unfold
		When I click the *Collapse all* button
		Then I see that all topics with subtopics collapse
		When I hover over a topic
			And I click on a *···* button for more options
		Then I can see the *View details* option
			And I can see the *Copy to clipboard* option
				But I do not see any other options

	Scenario: View details for a topic
		When I hover over a <topic> topic
			And I click on a *···* button for more options
		Then I can see the *View details* option
		When I select the *View details* option
		Then I can see the *Topic* pane open on the right 
			And I can see all the details for the <topic> topic

	Scenario: View details for a resource
		When I hover over a <kind> type of <resource> resource
			And I click on a *···* button for more options
			And I select the *View details* option
		Then I can see the <kind> pane for the <resource> resource opens on the right 
			And I can see all the details for the <resource> resource

	Scenario: Copy topic or resource to the clipboard from *···* options
		When I hover over a <resource> resource in the topic tree
			And I click on a *···* button for more options
			And I select the *Copy to clipboard* option
		Then I see the *Creating 1 copy on clipboard* snackbar notification
			And I see the *Cancel* button

	Examples:
	|	topic | kind | resource |