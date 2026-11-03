Feature: Organization end-to-end workflow
	A group of Studio users needs to be able to create an organization, bring their channels into it and work on those channels together with the right level of access

	Background:
		Given Kolibri Studio is accessible at https://studio.learningequality.org/ or any of the test environments
			And there are three Studio accounts: <admin>, <editor> and <viewer>
			And <admin> is the only editor of a channel <channel> that is not part of any organization
			And I am signed in to Studio as <admin>

	Scenario Outline: Create an organization, invite members, move a channel into it and collaborate on it
		When I click the *My organizations* tab
			And I click the *New organization* button
			And I type <organization> in the *Organization name* field
			And I click the *Create organization* button
		Then I see the *Organization created* message
			And I see the *Details*, *Channels* and *Sharing* tabs of <organization>
		When I click the *Sharing* tab
			And I type the email of <editor> in the *Email* field
			And I select *Editor* in the *Role type* drop-down
			And I click the *Send invitation* button
		Then I see the *Invitation sent* message
			And I see <editor> in the *Users* table with the role *Pending Editor*
		When I invite <viewer> with the *Viewer* role
		Then I see <viewer> in the *Users* table with the role *Pending Viewer*

		When I sign in as <editor>
			And I go to the *My organizations* page
		Then I see the *You have 1 invitation* banner with the text *<admin> has invited you to edit <organization>*
		When I click the accept icon button for <organization>
		Then I see the <organization> card with the role *Editor*
		When I sign in as <viewer> and accept the invitation to <organization> in the same way
		Then I see the <organization> card with the role *Viewer*

		When I sign in as <admin>
			And I open the details of <channel>
			And I select <organization> in the *Channel organization* drop-down
			And I save the channel organization
		Then I see the *Channel organization saved.* message
		When I go to *My organizations* and open the *Channels* tab of <organization>
		Then I see <channel> in the table with its size
			And I see the *Total size* below the table
		When I go to *Settings > Storage*
		Then the storage I am using no longer includes the files of <channel>

		When I sign in as <editor>
			And I go to *My channels*
			And I select <organization> in the *Filter by organization* drop-down
		Then I see <channel> in the list of channels
		When I open <channel>
		Then I can edit its resources
		When I sign in as <viewer>
			And I open <channel> from the *Channels* tab of <organization>
		Then I can view its resources
			And I cannot edit, move, delete or add resources

		When I sign in as <admin>
			And I go to the *Sharing* tab of <organization>
			And I select *Remove from organization* in the options of <viewer>
			And I click the *Remove* button
		Then I see the *User removed from organization* message
		When I sign in as <viewer>
		Then I no longer see <organization> on the *My organizations* page
			And I can no longer open <channel>

		Examples:
		| admin              | editor              | viewer              | organization  | channel        |
		| admin@example.com  | editor@example.com  | viewer@example.com  | Test org      | Org channel    |
