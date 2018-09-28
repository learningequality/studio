var Backbone = require("backbone");
var Models = require("edit_channel/models");
var _ = require("underscore");

const CHANNEL_FILTERS = {
	all: {
		label: "All",
		queryParams: {}
	}, 
	live: {
		label: "Live",
		queryParams: { live: "True"},
	},
	published: {
		label: "Published",
		queryParams: { published: "True"},
	},
	public: {
		label: "Public",
		queryParams: { public: "True"},
	},
	private: {
		label: "Private",
		queryParams: { public: "False" },
	},
	can_edit: {
		label: "My Channels",
		queryParams: { editable: "True" },
	},
	staged: {
		label: "Needs Review",
		queryParams: { staging: "True" },
	},
	ricecooker: {
		label: "Sushi Chef",
		queryParams: { ricecooker: "True" },
	},
	deleted: {
		label: "Deleted",
		queryParams: { deleted: "True" },
	},
}

const CHANNEL_SORT_FILTERS = {
	name: {
		label: "Name",
		// selected: true,
	},
	id: {
		label: "Channel ID",
	},
	priority: {
		label: "Priority",
	},
	users: {
		label: "# of Users",
	},
	items: {
		label: "# of Items",
	},
	modified: {
		label: "Last Updated",
	},
	created: {
		label: "Date Created",
	}
}

const USER_FILTERS = {
	all: {
		label: "All",
		queryParams: {},
		// selected: true,
	},
	activated: {
		label: "Active",
		queryParams: { is_active: "True" },
	},
	not_activated: {
		label: "Inactive",
		queryParams: { is_active: "False" },
	}, 
	admins: {
		label: "Admins",
		queryParams: { is_admin: "True" },
	},
	is_chef: {
		label: "Sushi Chefs",
		queryParams: { ricecooker_version: ">0.0.0" },
	}
}

const USER_SORT_FILTERS = {
	email: {
		label: "Email",
	},
	first_name: {
		label: "First Name",
	},
	last_name: {
		label: "Last Name",
	},
	date_joined: {
		label: "Date Joined",
	},
	channels: {
		label: "# of Channels",
	},
}

var AdministrationRouter = Backbone.Router.extend({

    routes: {
        "users(/filter/:filter)(/sort/:key-:order)(/search/:search)(/p:page)":        "users",    // #users
        "channels(/filter/:filter)(/sort/:key-:order)(/search/:search)(/p:page)":     "channels",    // #channels
    },
	execute(callback, args, name){
		let newRouteParams = {
			name: name,
			filter: args[0],
			sortKey: args[1],
			sortOrder: args[2],
			search: args[3],
			page: Number(args[4]),
		}

		let sameTabNewParams = this.currentRouteParams.name === newRouteParams.name &&
								!_.isEqual(this.currentRouteParams, newRouteParams)

		let switchTabNewParams = this.currentRouteParams.name !== newRouteParams.name &&
								!_.isEqual(this.routeParamsCache[newRouteParams.name], newRouteParams)
		if ( 
			// check to see if we need to reload
			sameTabNewParams || switchTabNewParams
		){
			// if so, execute the route
			if (callback) callback.apply(this, args);
		}

		// update the current state
		this.currentRouteParams = newRouteParams
		this.routeParamsCache[name] = this.currentRouteParams

		// make sure the correct tab is showing, even if we aren't loading anything
		$('a.btn.'+name).tab('show')
		return false
	},
	getRoute({name, filter, sortKey, sortOrder, search, page}){
		return name +
				(filter ? "/filter/" + filter : "") +
				(	
					(sortKey || sortOrder) ? 
					"/sort/" + (sortKey ? sortKey : "name") + "-" +
					(sortOrder ? sortOrder : "descending")
					: ""
				) +
				(search ? "/search/" + search : "") +
				(page ? "/p" + page : "")
	},
	gotoRouteForParams(params){
		if (!params.name) {
			// update existing params with incoming ones
			let currentRouteParams = Object.assign({}, this.currentRouteParams)
			params = Object.assign(currentRouteParams, params)
		}
		let route = this.getRoute(params)
		this.navigate(route, {trigger: true})
	},
	gotoPage(page){
		this.gotoRouteForParams({page: page})
	},
	gotoNextPage(){
		this.gotoPage(this.currentRouteParams.page+1)
	},
	gotoPreviousPage(){
		this.gotoPage(this.currentRouteParams.page-1)
	},
	initialize: function(){
		var AdministrationView = require("./views");
		this.admin_view = new AdministrationView.AdminView ({
			el: $("#admin-container"),
			router: this,
		});
		this.currentRouteParams = {}
		this.routeParamsCache = {
			'users': {name: 'users'},
			'channels': {name: 'channels'},
		};
		let router = this;
		$('.nav-tabs a').click(function(e){
			e.stopImmediatePropagation()
			// console.log(router, e.target.attributes)
			let routeParams = router.routeParamsCache[e.target.attributes['data-href'].value]
			router.gotoRouteForParams(routeParams)
			// console.log("ROUTING TO",  route)
		})
		window.current_user = new Models.UserModel(window.user);
	},
	updateCollectionStateFromParams(collection, filter, sortKey, order, search, page = 1){
		collection.state.currentPage = page ? page : collection.state.currentPage
		collection.state.currentPage = Number(collection.state.currentPage)
		collection.state.search = search

		if (sortKey || order) {
			collection.state.order = order ? (order === "ascending" ? 1 : -1) : collection.state.order
			collection.state.sortKey = sortKey ? sortKey : collection.state.sortKey
		}
		
		if (filter) {
			for (let k in collection.filterOptions){
				collection.filterOptions[k].selected = k === filter
			}
			collection.state.filterQuery = collection.filterOptions[filter].queryParams
		}
	},
    users: function(filter, sortKey, order, search, page = 1) {
		this.updateCollectionStateFromParams(
			this.admin_view.user_collection,
			filter, sortKey, order, search, page
		)
		this.admin_view.user_collection.fetch()
		console.log("ROUTE to USERS", this, this.usersrouteParamsCache, filter, sortKey, order, search, page)
	},
    channels: function(filter, sortKey, order, search, page = 1) {
		this.updateCollectionStateFromParams(
			this.admin_view.channel_collection,
			filter, sortKey, order, search, page
		)
		this.admin_view.channel_collection.fetch()
        console.log("ROUTE to CHANNELS", this, this.channelsrouteParamsCache, filter, sortKey, order, search, page)
	},
	
  });
  
module.exports = {
	Router: AdministrationRouter,
	CHANNEL_FILTERS: CHANNEL_FILTERS,
	CHANNEL_SORT_FILTERS: CHANNEL_SORT_FILTERS,
	USER_FILTERS: USER_FILTERS,
	USER_SORT_FILTERS: USER_SORT_FILTERS,
}

