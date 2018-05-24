import datetime
from django.utils.translation import ugettext as _

POLICIES = {
	"privacy_policy": {
		"latest": "2018_5_25",
		"policies": {
			"2018_5_25": {
				"date": datetime.datetime(2018, 5, 25).strftime('%m/%d/%Y'),
				"template": "policies/text/privacy_policy_2018_5_25.html",
			}
		}
	}
}


def check_policies(user):
	"""
		User policy field should be in format:
			{
				"[policy_name]_[date]" : datetime,
				"[policy_name]_[date]" : datetime,
			}
		Where the datetime stores when the user agreed to the policy (None if it hasn't been accepted yet)

		Returns list of policies user needs to accept, None if user is up-to-date
	"""

	policies_to_accept = {}
	for k, v in POLICIES.items():
		policy_name = "{}_{}".format(k, v["latest"])
		if not user.policies.get(policy_name):
			policies_to_accept.update({ policy_name: v["policies"][v["latest"]] })
	return policies_to_accept

def get_latest_policies():
	return {"{}_{}".format(k, v["latest"]): v["policies"][v["latest"]] for k, v in POLICIES.items()}
