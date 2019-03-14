export const Permissions = {
  OWNER: 'manage',
  EDIT: 'edit',
  VIEW_ONLY: 'view'
};

export const PermissionRanks = [
	{
		"shareMode": Permissions.VIEW_ONLY,
		"rank": 0
	},
	{
		"shareMode": Permissions.EDIT,
		"rank": 1
	},
	{
		"shareMode": Permissions.OWNER,
		"rank": 2
	},
]
