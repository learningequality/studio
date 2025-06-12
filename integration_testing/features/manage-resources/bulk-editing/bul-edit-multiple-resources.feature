Feature: Bulk edit multiple resources

	Background:
		Given I am signed in to Studio
			And I am at the channel editor page
			And there are available resources of different types

	Scenario: Bulk edit folders
		When I select at least 2 folders
			And I click the *Edit details* icon
		Then I see the *Edit details* modal for the selected folders
			And I see that all the folders are selected in the left section
			And I see the following text at the top: Editing details for N folders, 0 resources
		And I see the *Basic information* section containing the *Tags* field
		And I see the *Audience* section with the *Language* drop-down
		When I enter a new tag
			And I select a new language
			And I click the *Finish* button
		Then I am back at the channel editor
		When I select again the same folders
			And I click the *Edit details* icon
		Then I see the *Edit details* modal for the selected folders
			And I can see that my previously applied changes are saved

	Scenario: Bulk edit exercises
		When I select at least 2 exercises
			And I click the *Edit details* icon
		Then I see the *Edit details* modal for the selected exercises
			And I see that all the exercises are selected in the left section
			And I see the following text at the top: Editing details for 0 folders, N resources
			And I see the *Basic information* section containing the *Tags* field
			And I see the *Assessment options* section with the *Randomize question order for learners* checkbox
			And I see the *Completion* section with the *Allow learners to mark as complete* checkbox, the *Completion* and *Goal* drop-downs
			And I see the *Audience* section with the *Language* and *Visible to* drop-downs
			And I see the *Source* section with *Author*, *Provider*, *Aggregator*, *License* and *Copyright* holder fields
		When I make any modifications
			And I click the *Finish* button
		Then I am back at the channel editor
		When I select again the same exercises
			And I click the *Edit details* icon
		Then I see the *Edit details* modal for the selected exercises
			And I can see that my previously applied changes are saved

	Scenario: Bulk edit resources of the same type
		When I select at least 2 resources of the same type
			And I click the *Edit details* icon
		Then I see the *Edit details* modal for the selected resources
			And I see that all the resources are selected in the left section
			And I see the following text at the top: Editing details for 0 folders, N resources
			And I see the *Basic information* section containing the *Tags* field
			And I see the *Completion* section with the *Allow learners to mark as complete* checkbox, the *Completion* and *Goal* drop-downs
			And I see the *Audience* section with the *Language* and *Visible to* drop-downs
			And I see the *Source* section with *Author*, *Provider*, *Aggregator*, *License* and *Copyright* holder fields
		When I make any modifications
			And I click the *Finish* button
		Then I am back at the channel editor
		When I select again the same resources
			And I click the *Edit details* icon
		Then I see the *Edit details* modal for the selected resources
			And I can see that my previously applied changes are saved

	Scenario: Bulk edit resources of different types
		When I select at least 2 resources of different types
			And I click the *Edit details* icon
		Then I see the *Edit details* modal for the selected resources
			And I see that all the resources are selected in the left section
			And I see the following text at the top: Editing details for 0 folders, N resources
			And I see the *Basic information* section containing the *Tags* field
			And I see the *Audience* section with the *Language* and *Visible to* drop-downs
			And I see the *Source* section with *Author*, *Provider*, *Aggregator*, *License* and *Copyright* holder fields
		When I make any modifications
			And I click the *Finish* button
		Then I am back at the channel editor
		When I select again the same resources
			And I click the *Edit details* icon
		Then I see the *Edit details* modal for the selected resources
			And I can see that my previously applied changes are saved

	Scenario: Bulk edit folders and resources
		When I select at least 1 resource and 1 folder
			And I click the *Edit details* icon
		Then I see the *Edit details* modal for the selected folders and resources
			And I see that all the folders and resources are selected in the left section
			And I see the following text at the top: Editing details for N folders, N resources
			And I see the *Basic information* section containing the *Tags* field
			And I see the *Audience* section with the *Language* drop-down
		When I make any modifications
			And I click the *Finish* button
		Then I am back at the channel editor
		When I select again the same resources
			And I click the *Edit details* icon
		Then I see the *Edit details* modal for the selected folders and resources
			And I can see that my previously applied changes are saved
