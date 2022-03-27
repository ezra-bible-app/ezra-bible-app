#  This file is part of Ezra Bible App.
#
#  Copyright (C) 2019 - 2022 Ezra Bible App Development Team <contact@ezrabibleapp.net>
#
#  Ezra Bible App is free software: you can redistribute it and/or modify
#  it under the terms of the GNU General Public License as published by
#  the Free Software Foundation, either version 2 of the License, or
#  (at your option) any later version.
#
#  Ezra Bible App is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU General Public License for more details.
#
#  You should have received a copy of the GNU General Public License
#  along with Ezra Bible App. See the file LICENSE.
#  If not, see <http://www.gnu.org/licenses/>.

# features/008_tag_groups.feature

Feature: Tag groups
  I can use Tag groups to organize tags in different topical areas.

  Scenario: Creating a tag group
    Given I create the tag "Test"
    And I go to the list of tag groups
    When I create a tag group "New tag group"
    Then the tag group "New tag group" is listed in the tag group list
    When I open the tag selection menu
    And I go the tag group list of the tag selection menu
    Then the tag group "New tag group" is listed in the tag group list
    When I open the tag group "All tags"
    And I open the edit dialog of the tag "Test"
    Then the tag group "New tag group" is listed in the tag group list
