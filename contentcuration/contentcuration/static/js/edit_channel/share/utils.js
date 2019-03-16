import _ from 'underscore';
import { Permissions, PermissionRanks } from './constants';

export function getPermission(user, channel) {
	if(user.is_admin) {
		return Permissions.OWNER;
	}
	else if(_.find(channel.editors, (editor) => { return editor === user.id; })) {
		return Permissions.EDIT;
	}
	return Permissions.VIEW_ONLY;
}

export function getHighestPermission() {
	return _.chain(PermissionRanks)
          .filter((rank) => { return rank.field; })
          .max('rank')
          .value();
}
