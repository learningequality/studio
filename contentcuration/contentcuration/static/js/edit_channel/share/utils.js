
import { Permissions } from './constants';

export function getPermission(user, channel) {
	if(user.is_admin) {
		return Permissions.OWNER;
	}
	else if(_.find(channel.editors, (editor) => { return editor === user.id; })) {
		return Permissions.EDIT;
	}
	return Permissions.VIEW_ONLY;
}
