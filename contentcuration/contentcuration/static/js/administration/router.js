var Backbone = require("backbone");
var Models = require("edit_channel/models");
var _ = require("underscore");

// this is a function so that the defaults don't get overwritten
const GET_DEFAULT_ROUTES = () => ({
	'users': {name: 'users', page: 1, sortKey: "email", sortOrder: "ascending"},
	'channels': {name: 'channels', page: 1, sortKey: "name", sortOrder: "ascending"},
})

const CHANNEL_FILTERS = {
	all: {
		label: "All",
		queryParams: { all: "True" }
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
		queryParams: { staged: "True" },
	},
	sushichef: {
		label: "Sushi Chef",
		queryParams: { ricecooker_version__isnull: "False" },
	},
	deleted: {
		label: "Deleted",
		queryParams: { deleted: "True" },
	},
}

const CHANNEL_SORT_FILTERS = {
	name: {
		label: "Name",
		selected: true,
	},
	id: {
		label: "Channel ID",
	},
	priority: {
		label: "Priority",
	},
	editors_count: {
		label: "# of Editors",
	},
	viewers_count: {
		label: "# of Viewers",
	},
	resource_count: {
		label: "# of Items",
	},
	created: {
		label: "Date Created",
	}
}

const USER_FILTERS = {
	all: {
		label: "All",
		queryParams: {},
		selected: true,
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
		queryParams: { chef_channels_count__gt: 0 },
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
	editable_channels_count: {
		label: "# of Editable Channels",
	},
}

const SORT_ORDER_OPTIONS = {
	ascending: {
		label: "Ascending",
		selected: true,
	},
	descending: {
		label: "Descending",
	},
}

var AdministrationRouter = Backbone.Router.extend({

    routes: {
		"": "default",
		"/": "default",
		"users/": "users",
		"channels/": "channels",
        "users(/filter/:filter)(/sort/:key-:order)(/search/:search)(/p:page)(/:pagesize-per-page)":        "users",    // #users
        "channels(/filter/:filter)(/sort/:key-:order)(/search/:search)(/p:page)(/:pagesize-per-page)":     "channels",    // #channels
    },
	execute(callback, args, name){
		let page = args[4] ? Number(args[4]) : 1
		let newRouteParams = {
			name: name,
			filter: args[0],
			sortKey: args[1],
			sortOrder: args[2],
			search: args[3],
			page: page,
			pageSize: Number(args[5]),
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

		// trigger an event we can listen to if we need to update anything on the view side
		this.collections[name].trigger('showingTab')
		return false
	},
	getRoute({name, filter, sortKey, sortOrder, search, page, pageSize}){
		// takes an object of route parameters and builds a route string
		let route = name
		if (filter) {
			route += `/filter/${filter}`
		}
		if (sortKey || sortOrder){
			let resultingSortKey = sortKey ? sortKey : GET_DEFAULT_ROUTES()[name]['sortKey']
			let resultingSortOrder = sortOrder ? sortOrder : "ascending"
			route += `/sort/${resultingSortKey}-${resultingSortOrder}`
		}
		if (search) {
			route += `/search/${search}`
		}
		if (page) {
			route += `/p${page}`
		}
		if (pageSize) {
			route += `/${pageSize}-per-page`
		}
		return route
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
		this.collections = {}
		this.currentRouteParams = GET_DEFAULT_ROUTES()['channels']
		this.routeParamsCache = GET_DEFAULT_ROUTES()
		let router = this;
		$('.nav-tabs a').click(function(e){
			e.stopImmediatePropagation()
			let routeParams = router.routeParamsCache[e.currentTarget.attributes['data-href'].value]
			router.gotoRouteForParams(routeParams)
		})
		window.current_user = new Models.UserModel(window.user);
	},
	getSelected(opts) {
		for (let k in opts){
			if (opts[k].selected === true) {
				return k
			}
		}
	},
	updateCollectionStateFromParams(collection, filter, sortKey, order, search, page = 1, pageSize){
		// updates a collection's state with given route parameters
		
		// default to page 1 and the collection's currently set pageSize
		collection.state.currentPage = page ? Number(page) : 1
		collection.state.pageSize = pageSize ? Number(pageSize) : collection.state.pageSize

		// default to view all
		filter = filter ? filter : 'all'
		for (let k in collection.filterOptions){
			collection.filterOptions[k].selected = k === filter
		}
		collection.state.filterQuery = collection.filterOptions[filter].queryParams
		collection.state.search = search
		collection.state.filterQuery.search = search

		// update the collection's sortOrderOptions to reflect the new state
		if (order) {
			for (let k in collection.sortOrderOptions){
				collection.sortOrderOptions[k].selected = k === order
			}
		}

		// update the collection's sortFilterOptions to reflect the new state
		if (sortKey) {
			for (let k in collection.sortFilterOptions){
				collection.sortFilterOptions[k].selected = k === sortKey
			}
		}

		if (sortKey || order) {
			let oldSortKey
			try {
				// fall back to the collection's previous sort key
				oldSortKey = collection.state.sortKey
			} catch (error) {
				// if it hasn't been set before, default to the one set in its sortFilterOptions
				oldSortKey = this.getSelected(collection.sortFilterOptions)
			}
						
			collection.state.order = order ? (order === "ascending" ? -1 : 1) : collection.state.order
			collection.state.sortKey = sortKey ? sortKey : oldSortKey
		}
	},
	default: function(){
		// redirect to channels on the next frame ... (a slight hack to ensure state is initialized)
		window.requestAnimationFrame(() => this.gotoRouteForParams({name: "channels"}));
	},
    users: function(filter, sortKey, order, search, page = 1, pageSize) {
		let collection = this.admin_view.user_collection
		this.collections['users'] = this.admin_view.user_collection
		this.updateCollectionStateFromParams(
			collection, filter, sortKey, order, search, page, pageSize
		)
		collection.fetch()
	},
    channels: function(filter, sortKey, order, search, page = 1, pageSize) {
		let collection = this.admin_view.channel_collection
		this.collections['channels'] = this.admin_view.channel_collection
		this.updateCollectionStateFromParams(
			collection, filter, sortKey, order, search, page, pageSize
		)
		collection.fetch()
	},
	
  });
  
module.exports = {
	Router: AdministrationRouter,
	CHANNEL_FILTERS: CHANNEL_FILTERS,
	CHANNEL_SORT_FILTERS: CHANNEL_SORT_FILTERS,
	USER_FILTERS: USER_FILTERS,
	USER_SORT_FILTERS: USER_SORT_FILTERS,
	SORT_ORDER_OPTIONS: SORT_ORDER_OPTIONS,
}

