
import { ListTypes } from './../constants';

const ListValues = _.values(ListTypes);
export function prepChannel(channel) {
	// Set all channel list attributes so vue will listen to them
	_.each(ListValues, (type) => {
		channel[type] = false;
	});
}
