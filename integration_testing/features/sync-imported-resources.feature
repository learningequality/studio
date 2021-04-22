Feature: Sync resources
	Resources imported from other channels can change over time. Non-admin users should be able to sync and update their imported channel resources with their original source resources.

	Background:
		Given I am signed in to Studio as a non-admin user
			And I have at least two test channels #assuming this is tested with the same user account
			And I’ve imported some content in my channel B from my channel A
			And I’ve modified the original content in channel A
			And I am on the channel editor page of channel B #the channel with imported resources
		When I click on the ellipsis button at the top-right corner
			And I click on the *Sync resources* menu option
		Then a *Sync resources* modal appears

	Scenario: Sync all properties of the imported resources
		When I select all the available checkboxes - *Files*, *Tags*, *Titles and descriptions*, *Assessment details*
			And I click the *Continue* button
		Then a *Syncing channel* modal with a progress bar is displayed
		When I see the following message: "Operation complete! Click "Refresh" to update the page."
			And I click the *Refresh* button
		Then I can see that the imported content in channel B is synced and updated with the original source resources #files, tags, titles, descriptions, assessment details (questions, answers and hints)

	Scenario: Sync only *Files*
		When I select only the *Files* checkbox
			And I click the *Continue* button
		Then a *Syncing channel* modal with a progress bar is displayed
		When I see the following message: "Operation complete! Click "Refresh" to update the page."
			And I click the *Refresh* button
		Then I can see that only the imported files in channel B are synced and updated with the original resource files
			And I can see that the tags, titles, descriptions, assessment details (questions, answers and hints) of the imported resources are not synced 

	Scenario: Sync only *Tags*
		When I select only the *Tags* checkbox
			And I click the *Continue* button
		Then a *Syncing channel* modal with a progress bar is displayed
		When I see the following message: "Operation complete! Click "Refresh" to update the page."
			And I click the *Refresh* button
		Then I can see that only the tags of the imported resources in channel B are synced and updated with the original resource tags
			And I can see that the files, titles, descriptions, assessment details (questions, answers and hints) of the imported resources are not synced

	Scenario: Sync only *Titles and descriptions*
		When I select only the *Titles and descriptions* checkbox
			And I click the *Continue* button
		Then a *Syncing channel* modal with a progress bar is displayed
		When I see the following message: "Operation complete! Click "Refresh" to update the page."
			And I click the *Refresh* button
		Then I can see that only the titles and descriptions of the imported resources in channel B are synced and updated with the original resource titles and descriptions
			And I can see that the files, tags, assessment details (questions, answers and hints) of the imported resources are not synced

	Scenario: Sync only *Assessment details* #questions, answers and hints
		When I select only the *Assessment details* checkbox
			And I click the *Continue* button
		Then a *Syncing channel* modal with a progress bar is displayed
		When I see the following message: "Operation complete! Click "Refresh" to update the page."
			And I click the *Refresh* button
		Then I can see that only the assessment details (questions, answers and hints) of the imported resources in channel B are synced and updated with the original resource assessment details
			And I can see that the files, tags, titles and descriptions of the imported resources are not synced


