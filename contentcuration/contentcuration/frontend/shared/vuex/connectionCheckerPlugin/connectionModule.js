import axios from "axios"

export default {
  state: () => ({
    online: true,
    timeLastWentOffline: null,
    timeLastCameOnline: null,
    polling: false
  }),
  getters: {
    online(state) {
      return state.online && navigator.onLine
    },
  },
  mutations: {
    SET_ONLINE_STATUS(state, online) {
      if (state.online != online) {// the state has changed
        state.timeLastWentOffline = !online ? new Date() : null
        state.timeLastCameOnline = online ? new Date() : null
        state.online = online
      }
    },
    START_POLLING(state) {
      state.polling = true
    },
    STOP_POLLING(state) {
      state.polling = false
    }
  },
  actions: {
    handleBrokenConnection({ commit, dispatch }){
      commit('SET_ONLINE_STATUS', false)
      dispatch('checkConnection')
    },
    handleReconnection({ commit, state }) {
      if(!state.online) commit('SET_ONLINE_STATUS', true)
      if(state.polling) commit('STOP_POLLING')
    },
    checkConnection({ state, commit }) {
      // used https://github.com/Aupajo/backoff-calculator to tune this
      let maximumPollingDelay = 30 * 60 // 30 minutes
      let initialPollingDelay = 1 // 1 second
      let delaySeconds = i =>
        Math.min(i ** 2 + initialPollingDelay, maximumPollingDelay)

      if (state.polling) {
        return // polling has already been initiated
      } else {
        commit("START_POLLING")
      }

      const stealth = window.Urls.stealth()
      const connectionChecker = axios.create()

      let attempt = 0
      connectionChecker.interceptors.request.use(request => {
        attempt++
        return request
      })

      connectionChecker.interceptors.response.use(
        response => dispatch('handleReconnection'),
        error => {
          if (state.polling) {
            setTimeout(
              () => connectionChecker.get(stealth),
              1000*delaySeconds(attempt)
            )
          }
          Promise.reject(error)
        }
      )

      connectionChecker.get(stealth)
    }
  },
}
