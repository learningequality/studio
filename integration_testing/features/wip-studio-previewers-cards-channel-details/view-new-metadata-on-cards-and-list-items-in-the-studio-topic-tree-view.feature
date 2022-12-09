Feature: View new metadata on cards and list items in the Studio topic tree view

	Background:
		Given I am signed into Studio
			And I am in an editable channel with all resource types

	Scenario: See new metadata for .pdf, .epub, .mp3, .mp4, .mov, .zip
		Given *View* is set to *Default view*
			And <resource> has <categories>, <learning activity>, and <levels> options set
		Then I see <categories>, <learning activity>, and <levels> on the <resource> in the topic tree
			And I see the thumbnail, description, and title

	Scenario: See new metadata for exercises
		Given *View* is set to *Default view*
			And <exercise> has <categories>, <learning activity>, and <levels> options set
		Then I see <categories>, <learning activity>, and <levels> on the <resource> in the topic tree
			And I see the thumbnail, description, title, and number of questions

	Scenario: See metadata for *Comfortable view*
		Given *View* is set to *Comfortable view*
		Then I see the title, thumbnail, and learning activity
			And I do not see any other metadata

	Scenario: See metadata for *Compact view*
		Given *View* is set to *Compact view*
		Then I see The title and learning activity
			And I do not see any other metadata

	Scenario: See metadata for .pdf, .epub, .mp3, .mp4, .mov, .zip while importing from a channel
		Given *View* is set to *Default view*
			 And <resource> has <categories>, <learning activity>, and <levels> options set
		Then I see <categories>, <learning activity>, and <levels> on the <resource> in the topic tree
			And I see the thumbnail, description, and title

	Scenario: See metadata for exercises while importing from a channle
		Given *View* is set to *Default view*
			And <resource> has <categories>, <learning activity>, and <levels> options set
		Then I see <categories>, <learning activity>, and <levels> on the <resource> in the topic tree
			And I see the thumbnail, description, and title
