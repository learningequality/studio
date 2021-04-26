Feature: Sync channel

	Background:
		Given I am signed in to Studio
			And I am on the <channel_a> editor page
			And there is a <resource> in the <channel_a> that has been imported from <channel_b>  

	Scenario: Sync resource file information
		Given there is new version of the <resource> file in the <channel_b>
			Or the thumbnail has been added to the <resource> file in the <channel_b>
		When I click on the *···* button in the top-right corner
			And I select the *Sync channel* option
		Then I see *Sync resources* modal window
		When I activate the *File* checkbox
			And click the *Continue* button
		Then I see the *Confirm sync* modal
		When I click *Sync*
		Then I see the *Syncing channel* modal
			And I see the progress bar
		When I see the *Operation complete!* message
			And I click the *Refresh button*
		Then I see the new file version of the <resource>
			Or I see the new thumbnail 

	Scenario: Sync resource tags
		Given the <resource> in the <channel_b> has a new tag
		When I click on the *···* button in the top-right corner
			And I select the *Sync channel* option
		Then I see *Sync resources* modal window
		When I activate the *Tags* checkbox
			And click the *Continue* button
		Then I see the *Confirm sync* modal
		When I click *Sync*
		Then I see the *Syncing channel* modal
			And I see the progress bar
		When I see the *Operation complete!* message
			And I click the *Refresh button*
		Then I see the new tag of the <resource>

	Scenario: Sync resource title and description
		Given the <resource> in the <channel_b> has a new title and description
		When I click on the *···* button in the top-right corner
			And I select the *Sync channel* option
		Then I see *Sync resources* modal window
		When I activate the *Titles and descriptions* checkbox
			And click the *Continue* button
		Then I see the *Confirm sync* modal
		When I click *Sync*
		Then I see the *Syncing channel* modal
			And I see the progress bar
		When I see the *Operation complete!* message
			And I click the *Refresh button*
		Then I see the new title and description of the <resource>

	Scenario: Sync assessment resource details
		Given the <resource> is an assessment type (exercise)
			And it has new questions, answers or hints in the <channel_b>
		When I click on the *···* button in the top-right corner
			And I select the *Sync channel* option
		Then I see *Sync resources* modal window
		When I activate the *Assessment details* checkbox
			And click the *Continue* button
		Then I see the *Confirm sync* modal
		When I click *Sync*
		Then I see the *Syncing channel* modal
			And I see the progress bar
		When I see the *Operation complete!* message
			And I click the *Refresh button*
		Then I see the new questions, answers or hints in the <resource>

	Scenario: Edited resource metadata is reverted after syncing
		Given I have edited some <resource> metadata (title, description or tags) after importing from <channel_b>
		When I click on the *···* button in the top-right corner
			And I select the *Sync channel* option
		Then I see *Sync resources* modal window
		When I activate the *Tags* or *Titles and descriptions* checkbox
			And click the *Continue* button
		Then I see the *Confirm sync* modal
		When I click *Sync*
		Then I see the *Syncing channel* modal
			And I see a progress bar
		When I see the *Operation complete!* message
			And I click the *Refresh button*
		Then I see that my edits of title, description or tags for the <resource> have been reverted to reflect those on the <channel_b>

	Examples: 
	| channel_a | channel_b | resource |