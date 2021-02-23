Feature: View support links 

	Background:
		Given I am signed in to Studio as a non-admin user
			And I am on Studio *Settings > About Studio* page

	Scenario: View resources
		When I click the *Kolibri Studio User Guide* link
		Then a new browser tab opens with the ReadTheDocs page
		# Privacy Policy page not yet implemented
		
	Scenario: View notable issues
		When I click one of the notable issue hyperlinks
		Then a new browser tab opens with the GitHub issue in question