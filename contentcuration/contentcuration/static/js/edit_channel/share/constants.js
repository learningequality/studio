export const Permissions = {
  OWNER: 'manage',
  EDIT: 'edit',
  VIEW_ONLY: 'view'
};

export const PermissionRanks = [
	{
		"shareMode": Permissions.VIEW_ONLY,
		"rank": 0,
		"field": 'viewers'
	},
	{
		"shareMode": Permissions.EDIT,
		"rank": 1,
		"field": 'editors'
	},
	{
		"shareMode": Permissions.OWNER,
		"rank": 2,
		"field": null
	},
]
