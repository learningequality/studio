Feature: Manage collections

	Background:
		Given I am signed in to Studio
			And I am at the *Collections* page

	Scenario: Create an empty collection
		When I click the *New collection* button
			And I fill in the *Collection name* field
			And I click the *Create* button
		Then I see the *Collections* tab
			And I see the newly created collection
			And I see that the number of channels is 0

	Scenario: Create a collection by selecting channels
		When I click the *New collection* button
			And I click the *Select channels* button
		Then I see the *Select channels* page
			And I am on the *Content library* tab # alternatively I can select *My channels* or the *View-only* tab
		When I select one or several channels
			And I click the *Finish* button
		Then I see the the *New collection* screen with the added channels
			When I click the *Create* button
		Then I see the *Collections* tab
			And I see the newly created collection
			And I see the correct number of channels in that collection

	Scenario: Create a collection by searching for channels
		When I click the *New collection* button
			And I click the *Select channels* button
		Then I see the *Select channels* page
			And I am on the *Content library* tab # alternatively I can select the *My channels* or *View-only* tab
		When I enter a search term in the *Search for a channel* field
            And I select one or several channels
			And I click the *Finish* button
		Then I see the *New collection* screen with the selected channels
			When I click the *Create* button
		Then I see the *Collections* tab
			And I see the newly created collection
			And I see the correct number of channels in that collection

	Scenario: Edit a collection
		When I click the *Options* drop-down for the collection I want to edit
			And I select the *Edit collection* option
		Then I see the collection's details
			And I can change the collection name
		When I click the *Select channels* button
		Then I am on the *Content library* tab # alternatively I can select the *My channels* or *View-only* tab
		When I select one or several channels
			And I click the *Finish* button
		Then I see the the *New collection* screen with the selected channels
		When I click the *Remove* button
			Then I see a *Channel removed* snackbar message
		When I click the *Save and close* button
		Then I see the *Collections* tab
			And I see the edited collection
			And I see the number of channels in that collection

	Scenario: Delete a collection
		When I click the *Options* drop-down for the collection I want to edit
			And I select the *Delete collection* option
		Then I see the *Delete collection* modal window
		When I click the *Delete collection* button
		Then I see the *Collections* tab
			And I see that the deleted collection is no longer displayed

	Scenario: Learn about collections
		When I click the *Learn about collections* link
		Then I see the *About collections* modal
			And I see the following info text: A collection contains multiple Kolibri Studio channels that can be imported at one time to Kolibri with a single collection token. You can make a collection by selecting the channels you want to be imported together. You will need Kolibri version 0.12.0 or higher to import channel collections
		When I click the *Close* button
