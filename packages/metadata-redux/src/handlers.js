/**
 * Action Handlers - обработчики событий - вызываются из корневого редюсера
 * Задача обработчиков - измеять state
 * Активные действия и работа с данными происходит в actions
 */

import {META_LOADED, PRM_CHANGE} from './actions_base';
import {DATA_LOADED, DATA_PAGE, DATA_ERROR, LOAD_START, NO_DATA, SYNC_START, SYNC_DATA} from './actions_pouch';
import {DEFINED, LOG_IN, TRY_LOG_IN, LOG_OUT, LOG_ERROR} from './actions_auth';
import {ADD, CHANGE} from './actions_obj';


export default {

  [META_LOADED]: (state, action) => {
    const {wsql, job_prm} = $p;
    const {user} = state;
    let has_login;
    if (wsql.get_user_param('zone') == job_prm.zone_demo && !wsql.get_user_param('user_name') && job_prm.guests.length) {
      wsql.set_user_param('enable_save_pwd', true);
      wsql.set_user_param('user_name', job_prm.guests[0].username);
      wsql.set_user_param('user_pwd', job_prm.guests[0].password);
      has_login = true;
    }
    else if (wsql.get_user_param('enable_save_pwd') && wsql.get_user_param('user_name') && wsql.get_user_param('user_pwd')) {
      has_login = true;
    }
    else {
      has_login = false;
    }

    return Object.assign({}, state, {
      couch_direct: wsql.get_user_param('couch_direct', 'boolean'),
      meta_loaded: true,
      user: Object.assign({}, user, {has_login}),
    });
  },

  [PRM_CHANGE]: (state, action) => state,

  [DATA_LOADED]: (state, action) => {
    const payload = {data_loaded: true, fetch: false};
    if(action.payload == 'doc_ram'){
      payload.doc_ram_loaded = true;
    }
    return Object.assign({}, state, payload);
  },

  [DATA_PAGE]: (state, action) => Object.assign({}, state, {page: action.payload}),

  [DATA_ERROR]: (state, action) => Object.assign({}, state, {err: action.payload, fetch: false}),

  [LOAD_START]: (state, action) => Object.assign({}, state, {sync_started: true, data_empty: false, fetch: true}),

  [NO_DATA]: (state, action) => Object.assign({}, state, {data_empty: true, fetch: false}),

  [SYNC_START]: (state, action) => Object.assign({}, state, {sync_started: true}),

  [SYNC_DATA]: (state, action) => Object.assign({}, state, {fetch: !!action.payload}),

  [DEFINED]: (state, action) => {
    const user = Object.assign({}, state.user);
    user.name = action.payload;
    return Object.assign({}, state, {user});
  },

  [LOG_IN]: (state, action) => {
    const user = Object.assign({}, state.user);
    user.logged_in = true;
    user.try_log_in = false;
    return Object.assign({}, state, {user});
  },

  [TRY_LOG_IN]: (state, action) => {
    const user = Object.assign({}, state.user);
    user.try_log_in = true;
    return Object.assign({}, state, {user});
  },

  [LOG_OUT]: (state, action) => {
    const user = Object.assign({}, state.user);
    user.logged_in = false;
    user.has_login = false;
    user.try_log_in = false;
    return Object.assign({}, state, {user});
  },

  [LOG_ERROR]: (state, action) => {
    const user = Object.assign({}, state.user);
    user.logged_in = false;
    user.has_login = false;
    user.try_log_in = false;
    return Object.assign({}, state, {user});
  },

  [ADD]: (state, action) => state,

  [CHANGE]: (state, action) => Object.assign({}, state, {obj_change: action.payload}),

};
