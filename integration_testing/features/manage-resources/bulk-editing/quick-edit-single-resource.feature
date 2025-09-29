Feature: Quick edit fields of a single resource

	Background:
		Given I am signed in to Studio
			And I am at the channel editor page
			And there are available resources of different types

	Scenario: Edit the title and description of a resource
		When I click the *⋮* (Options) button for a resource
			And I click the *Edit title and description* option
		Then I see the *Edit title and description* modal
		When I enter a new title and description
			And I click the *Save* button
		Then I am back at the page with the resources
			And I see a message: *Changes saved*
			And I can see that the title and description are changed

	Scenario: Edit the language of a resource
		When I click the *⋮* (Options) button for a resource #alternatively one can select a resource and click the corresponding icon in the top bar
			And I click the *Edit language* option
		Then I see the *Edit language* modal
		When I select a new language
			And I click the *Save* button
		Then I am back at the page with the resources
			And I see a message: *Changes saved*

	Scenario: Edit the categories of a resource
		When I click the *⋮* (Options) button for a resource #alternatively one can select a resource and click the corresponding icon in the top bar
			And I click the *Edit categories* option
		Then I see the *Edit categories* modal
		When I select one or several new categories
			And I click the *Save* button
		Then I am back at the page with the resources
			And I see a message: *Changes saved*

	Scenario: Edit the levels of a resource
		When I click the *⋮* (Options) button for a resource #alternatively one can select a resource and click the corresponding icon in the top bar
			And I click the *Edit levels* option
		Then I see the *What levels* modal
		When I select one or several levels
			And I click the *Save* button
		Then I am back at the page with the resources
			And I see a message: *Changes saved*

	Scenario: Edit the learning activities of a resource
		When I click the *⋮* (Options) button for a resource #alternatively one can select a resource and click the corresponding icon in the top bar
			And I click the *Edit learning activities* option
		Then I see the *Edit learning activities* modal
		When I select one or several activities
			And I click the *Save* button
		Then I am back at the page with the resources
			And I see a message: *Changes saved*

	Scenario: Edit the source of a resource
		When I click the *⋮* (Options) button for a resource #alternatively one can select a resource and click the corresponding icon in the top bar
			And I click the *Edit source* option
		Then I see the *Edit source* modal
		When I fill in the desired fields
			And I click the *Save* button
		Then I am back at the page with the resources
			And I see a message: *Changes saved*

	Scenario: Edit the audience of a resource
		When I click the *⋮* (Options) button for a resource #alternatively one can select a resource and click the corresponding icon in the top bar
			And I click the *Edit audience* option
		Then I see the *Edit audience* modal
		When I select the desired options
			And I click the *Save* button
		Then I am back at the page with the resources
			And I see a message: *Changes saved*

	Scenario: Edit the completion criteria of a resource
		When I click the *⋮* (Options) button for a resource #alternatively one can select a resource and click the corresponding icon in the top bar
			And I click the *Edit completion* option
		Then I see the *Edit completion* modal
		When I select the desired options
			And I click the *Save* button
		Then I am back at the page with the resources
			And I see a message: *Changes saved*

	Scenario: Edit the requirements of a resource
		When I click the *⋮* (Options) button for a resource #alternatively one can select a resource and click the corresponding icon in the top bar
			And I click the *Edit requirements* option
		Then I see the *Edit requirements* modal
		When I select the desired options
			And I click the *Save* button
		Then I am back at the page with the resources
			And I see a message: *Changes saved*
