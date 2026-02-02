Feature: Sync resources
	Studio users need to be able to sync and update the resources in their channels which have been imported from other channels, but have been modified since the original import.

	Background:
		Given I am signed in to Studio
			And I am editing <channel_a>
			And there is a resource in <channel_a> that has been imported from <channel_b>

	Scenario: Sync resource file information
		Given there is a new version of the resource file in <channel_b>
		When I click the *···* button in the top-right corner
			And I select the *Sync resources* option
		Then I see the *Sync resources* modal window
			And I see the *Select what you would like to sync* section with options to sync files, resource details, titles and description, assessment details
		When I select the Files checkbox
			And I click the *Continue* button
		Then I see the *Confirm sync* modal
			And I see the following info: You are about to sync and update the following: Files
			And I see a warning that this will overwrite any changes I've made to copied or imported resources
		When I click the *Sync* button
		Then the modal closes
		When after a period of time I refresh the page
			And inspect the updated resource(s)
		Then I can see that any changes made to the original resource(s) are synced correctly (including thumbnails, subtitles and captions)

	Scenario: Sync resource details
		Given there is a new version of the resource file in <channel_b>
			And I am at the *Sync resources* modal window
		When I select the *Resource details* checkbox
			And click the *Continue* button
		Then I see the *Confirm sync* modal
		When I click *Sync*
		Then the modal closes
		When after a period of time I refresh the page
			And inspect the updated resource(s)
		Then I can see that any changes made to the original resource(s) details are synced correctly (learning activity, level, requirements, category, tags, audience, and source)

	Scenario: Sync resource title and description
		Given there is a new version of the resource file in <channel_b>
			And I am at the *Sync resources* modal window
		When I select the *Titles and descriptions* checkbox
			And click the *Continue* button
		Then I see the *Confirm sync* modal
		When I click *Sync*
		Then the modal closes
		When after a period of time I refresh the page
			And inspect the updated resource(s)
		Then I can see that any changes made to the original resource(s) details are synced correctly (titles and descriptions)

	Scenario: Sync assessment resource details
		Given there is a new version of the resource file in <channel_b>
			And I am at the *Sync resources* modal window
		When I select the *Assessment details* checkbox
			And click the *Continue* button
		Then I see the *Confirm sync* modal
		When I click *Sync*
		Then the modal closes
		When after a period of time I refresh the page
			And inspect the updated resource(s)
		Then I can see that any changes made to the original resource(s) details are synced correctly (questions, answers, and hints in exercises and quizzes)

	Scenario: Edited resource metadata is reverted after syncing
		Given I have edited some of the resource's metadata (title, description or tags) after importing from <channel_b>
			And I am at the *Sync resources* modal window
		When I select the *Resource details* and *Titles and descriptions* checkboxes
			And click the *Continue* button
		Then I see the *Confirm sync* modal
		When I click *Sync*
		Then the modal closes
		When after a period of time I refresh the page
			And inspect the updated resource
		Then I see that my previous edits of the title, description or tags for the resource have been reverted to reflect those in <channel_b>