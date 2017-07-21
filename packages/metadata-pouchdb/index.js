/*!
 metadata-pouchdb v2.0.1-beta.19, built:2017-07-21
 © 2014-2017 Evgeniy Malyarov and the Oknosoft team http://www.oknosoft.ru
 metadata.js may be freely distributed under the MIT
 To obtain commercial license and technical support, contact info@oknosoft.ru
 */


'use strict';

var proto = (constructor) => {
	const {DataManager, DataObj, DocObj, TaskObj, BusinessProcessObj} = constructor.classes;
	Object.defineProperties(DataObj.prototype, {
		new_number_doc: {
			value: function (prefix) {
				if (!this._metadata().code_length) {
					return Promise.resolve(this);
				}
				const {date, organization, _manager} = this;
				const {current_user} = _manager._owner.$p;
				if (!prefix) {
					prefix = ((current_user && current_user.prefix) || '') + ((organization && organization.prefix) || '');
				}
				let obj = this,
					part = '',
					year = (date instanceof Date) ? date.getFullYear() : 0,
					code_length = this._metadata().code_length - prefix.length;
				if (_manager.cachable == 'ram') {
					return Promise.resolve(this.new_cat_id(prefix));
				}
				return _manager.pouch_db.query('doc/number_doc',
					{
						limit: 1,
						include_docs: false,
						startkey: [_manager.class_name, year, prefix + '\ufff0'],
						endkey: [_manager.class_name, year, prefix],
						descending: true,
					})
					.then((res) => {
						if (res.rows.length) {
							const num0 = res.rows[0].key[2];
							for (var i = num0.length - 1; i > 0; i--) {
								if (isNaN(parseInt(num0[i])))
									break;
								part = num0[i] + part;
							}
							part = (parseInt(part || 0) + 1).toFixed(0);
						} else {
							part = '1';
						}
						while (part.length < code_length)
							part = '0' + part;
						if (obj instanceof DocObj || obj instanceof TaskObj || obj instanceof BusinessProcessObj)
							obj.number_doc = prefix + part;
						else
							obj.id = prefix + part;
						return obj;
					});
			},
		},
		new_cat_id: {
			value: function (prefix) {
				const {organization, _manager} = this;
				const {current_user, wsql} = _manager._owner.$p;
				if (!prefix)
					prefix = ((current_user && current_user.prefix) || '') +
						(organization && organization.prefix ? organization.prefix : (wsql.get_user_param('zone') + '-'));
				let code_length = this._metadata().code_length - prefix.length,
					field = (this instanceof DocObj || this instanceof TaskObj || this instanceof BusinessProcessObj) ? 'number_doc' : 'id',
					part = '',
					res = wsql.alasql('select top 1 ' + field + ' as id from ? where ' + field + ' like "' + prefix + '%" order by ' + field + ' desc', [_manager.alatable]);
				if (res.length) {
					const num0 = res[0].id || '';
					for (var i = num0.length - 1; i > 0; i--) {
						if (isNaN(parseInt(num0[i])))
							break;
						part = num0[i] + part;
					}
					part = (parseInt(part || 0) + 1).toFixed(0);
				} else {
					part = '1';
				}
				while (part.length < code_length)
					part = '0' + part;
				this[field] = prefix + part;
				return this;
			},
		},
	});
	Object.defineProperties(DataManager.prototype, {
		pouch_db: {
			get: function () {
				const cachable = this.cachable.replace("_ram", "");
				const {pouch} = this._owner.$p.adapters;
				if(cachable.indexOf("remote") != -1)
					return pouch.remote[cachable.replace("_remote", "")];
				else
					return pouch.local[cachable] || pouch.remote[cachable];
			}
		},
		pouch_find_rows: {
			value: function (selection) {
				return this.adapter.find_rows(this, selection);
			}
		},
		pouch_load_view: {
			value: function (view) {
				return this.adapter.load_view(this, view);
			}
		},
		pouch_load_array: {
			value: function (refs, with_attachments) {
				return this.adapter.load_array(this, refs, with_attachments);
			}
		},
		pouch_selection: {
			value: function (attr) {
				return this.adapter.get_selection(this, attr);
			}
		},
		pouch_tree: {
			value: function (attr) {
				return this.adapter.get_tree(this, attr);
			}
		},
		save_attachment: {
			value: function (ref, att_id, attachment, type) {
				return this.adapter.save_attachment(this, att_id, attachment, type);
			}
		},
		get_attachment: {
			value: function (ref, att_id) {
				return this.adapter.get_attachment(this, ref, att_id);
			}
		},
		delete_attachment: {
			value: function (ref, att_id) {
				return this.adapter.delete_attachment(this, ref, att_id);
			}
		}
	});
};

let PouchDB;
if(typeof process !== 'undefined' && process.versions && process.versions.node){
	PouchDB = require('pouchdb-core')
		.plugin(require('pouchdb-adapter-http'))
		.plugin(require('pouchdb-replication'))
		.plugin(require('pouchdb-mapreduce'))
		.plugin(require('pouchdb-find'))
		.plugin(require('pouchdb-adapter-memory'));
}
else{
	if(window.PouchDB){
		PouchDB = window.PouchDB;
	}
	else{
		PouchDB = require('pouchdb-core')
			.plugin(require('pouchdb-adapter-http'))
			.plugin(require('pouchdb-replication'))
			.plugin(require('pouchdb-mapreduce'))
			.plugin(require('pouchdb-find'))
			.plugin(require('pouchdb-authentication'));
		const ua = (navigator && navigator.userAgent) ? navigator.userAgent.toLowerCase() : '';
		if(ua.match('safari') && !ua.match('chrome')){
			PouchDB.plugin(require('pouchdb-adapter-websql'));
		}else{
			PouchDB.plugin(require('pouchdb-adapter-idb'));
		}
	}
}
var PouchDB$1 = PouchDB;

function adapter({AbstracrAdapter}) {
	return class AdapterPouch extends AbstracrAdapter {
		constructor($p){
			super($p);
			var t = this,
				_paths = {},
				_local, _remote, _auth, _data_loaded;
			Object.defineProperties(this, {
				init: {
					value: function (wsql, job_prm) {
						Object.assign(_paths, {
							path: wsql.get_user_param("couch_path", "string") || job_prm.couch_path || "",
							zone: wsql.get_user_param("zone", "number"),
							prefix: job_prm.local_storage_prefix,
							suffix: wsql.get_user_param("couch_suffix", "string") || "",
							direct: job_prm.couch_direct || wsql.get_user_param("couch_direct", "boolean"),
							user_node: job_prm.user_node,
							noreplicate: job_prm.noreplicate,
						});
						if(_paths.path && _paths.path.indexOf("http") != 0 && typeof location != "undefined"){
							_paths.path = location.protocol + "//" + location.host + _paths.path;
						}
					}
				},
				local: {
					get: function () {
						if(!_local){
							const opts = {auto_compaction: true, revs_limit: 2};
							const bases = this.$p.md.bases();
							_local = {
							  sync: {},
                meta: new PouchDB$1(_paths.prefix + "meta", opts),
							};
							for(const name of ["ram", "doc", "user"]){
                if(bases.indexOf(name) != -1){
                  if(_paths.direct && name != "ram"){
                    _local[name] = this.remote[name];
                  }else{
                    _local[name] = new PouchDB$1(_paths.prefix + _paths.zone + "_" + name, opts);
                  }
                }
              }
              if(_paths.path && !_local._meta){
                _local._meta = new PouchDB$1(_paths.path + "meta", {skip_setup: true});
                setTimeout(() => t.run_sync("meta"));
              }
						}
						return _local;
					}
				},
				remote: {
					get: function () {
						if(!_remote){
							const opts = {skip_setup: true, adapter: 'http'};
							if(_paths.user_node){
								opts.auth = _paths.user_node;
							}
							_remote = { };
              const {superlogin, md} = this.$p;
							function dbpath(name) {
								if(superlogin){
									return superlogin.getDbUrl(_paths.prefix + (name == "meta" ? name : (_paths.zone + "_" + name)))
								}
								else{
									if(name == "meta"){
										return _paths.path + "meta"
									}
									else if(name == "ram"){
										return _paths.path + _paths.zone + "_ram"
									}
									else{
										return _paths.path + _paths.zone + "_" + name + (_paths.suffix ? "_" + _paths.suffix : "")
									}
								}
							}
              md.bases().forEach((name) => {
								if(name == 'e1cib' || name == 'pgsql'){
									return;
								}
								_remote[name] = new PouchDB$1(dbpath(name), opts);
							});
						}
						return _remote;
					}
				},
				db: {
					value: function(_mgr) {
						const dbid = _mgr.cachable.replace('_remote', '').replace('_ram', '');
						if (dbid.indexOf("remote") != -1 || (
								_paths.noreplicate && _paths.noreplicate.indexOf(dbid) != -1
							))
							return this.remote[dbid.replace("_remote", "")];
						else
							return this.local[dbid] || this.remote[dbid];
					}
				},
				log_in: {
					value: function (username, password) {
					  const {job_prm, wsql, aes, md} = this.$p;
						if (username == undefined && password == undefined){
							if(job_prm.guests && job_prm.guests.length) {
								username = job_prm.guests[0].username;
								password = aes.Ctr.decrypt(job_prm.guests[0].password);
							}else{
								return Promise.reject(new Error("username & password not defined"));
							}
						}
						if (_auth) {
							if (_auth.username == username){
								return Promise.resolve();
							} else {
								return Promise.reject(new Error("need logout first"));
							}
						}
						const try_auth = [];
						md.bases().forEach((name) => {
							if(t.remote[name]){
								try_auth.push(
									_paths.user_node ? this.remote[name].info() : this.remote[name].login(username, password)
								);
							}
						});
						return Promise.all(try_auth)
							.then(() => {
								_auth = {username: username};
								setTimeout(() => {
									if(wsql.get_user_param("user_name") != username){
										wsql.set_user_param("user_name", username);
									}
									if(wsql.get_user_param("enable_save_pwd")){
										if(aes.Ctr.decrypt(wsql.get_user_param("user_pwd")) != password){
											wsql.set_user_param("user_pwd", aes.Ctr.encrypt(password));
										}
									}
									else if(wsql.get_user_param("user_pwd") != ""){
										wsql.set_user_param("user_pwd", "");
									}
									t.emit('user_log_in', username);
								});
								const sync = {};
								if(_paths.direct) {
									return t.load_data();
								}
								try_auth.length = 0;
								md.bases().forEach((dbid) => {
									if(t.local[dbid] && t.remote[dbid] && t.local[dbid] != t.remote[dbid]){
										if(_paths.noreplicate && _paths.noreplicate.indexOf(dbid) != -1){
											return
										}
										try_auth.push(t.run_sync(dbid));
									}
								});
								return Promise.all(try_auth);
							})
							.catch(err => {
								t.emit('user_log_fault', err);
							})
					}
				},
				log_out: {
					value: function () {
						if(_auth){
							if(_local.sync.doc){
								try{
									_local.sync.doc.cancel();
								}catch(err){}
							}
							if(_local.sync.ram){
								try{
									_local.sync.ram.cancel();
								}catch(err){}
							}
							_auth = null;
						}
						return _remote.ram.logout()
							.then(() => {
								if(_remote && _remote.doc){
									return _remote.doc.logout()
								}
							})
							.then(() => {
								if(_remote && _remote.ram){
									delete _remote.ram;
								}
								if(_remote && _remote.doc){
									delete _remote.doc;
								}
								_remote = null;
								t.emit('user_log_out');
							})
					}
				},
				reset_local_data: {
					value: function () {
						var destroy_ram = t.local.ram.destroy.bind(t.local.ram),
							destroy_doc = t.local.doc.destroy.bind(t.local.doc),
							do_reload = () => {
								setTimeout(() => {
									location.reload(true);
								}, 1000);
							};
						t.log_out();
						setTimeout(() => {
							destroy_ram()
								.then(destroy_doc)
								.catch(destroy_doc)
								.then(do_reload)
								.catch(do_reload);
						}, 1000);
					}
				},
				load_data: {
					value: function () {
					  const {job_prm} = this.$p;
						var options = {
								limit : 800,
								include_docs: true
							},
							_page = {
								total_rows: 0,
								limit: options.limit,
								page: 0,
								start: Date.now()
							};
						return new Promise((resolve, reject) => {
							function fetchNextPage() {
								t.local.ram.allDocs(options, (err, response) => {
									if (response) {
										_page.page++;
										_page.total_rows = response.total_rows;
										_page.duration = Date.now() - _page.start;
										t.emit('pouch_data_page', Object.assign({}, _page));
										if (t.load_changes(response, options)){
											fetchNextPage();
										}
										else{
											t.call_data_loaded(_page);
											resolve();
										}
									}
									else if(err){
										reject(err);
										t.emit('pouch_data_error', "ram", err);
									}
								});
							}
							t.local.ram.info().then((info) => {
									if(info.doc_count >= (job_prm.pouch_ram_doc_count || 10)){
										t.emit('pouch_load_start', Object.assign(_page, {local_rows: info.doc_count}));
										fetchNextPage();
									}
									else{
										t.emit('pouch_no_data', info);
										resolve();
									}
								});
						});
					}
				},
				authorized: {
					get: function () {
						return _auth && _auth.username;
					}
				},
				data_loaded: {
					get: function () {
						return !!_data_loaded;
					}
				},
				call_data_loaded: {
					value: function (page) {
					  if(!_data_loaded){
              _data_loaded = true;
              if(!page){
                page = _local.sync._page || {};
              }
              t.emit(page.note = 'pouch_data_loaded', page);
              this.authorized && this.load_doc_ram();
            }
					}
				},
				run_sync: {
					value: function (id){
					  const {wsql, job_prm} = this.$p;
						const local = t.local[id];
						const remote = id == 'meta' ? t.local._meta : t.remote[id];
						let linfo, _page;
						return local.info()
							.then((info) => {
								linfo = info;
								return remote.info()
							})
							.then((rinfo) => {
								if(id == "ram"){
                  return remote.get("data_version")
                    .then((v) => {
                      if(v.version != wsql.get_user_param("couch_ram_data_version")){
                        if(wsql.get_user_param("couch_ram_data_version")){
                          rinfo = t.reset_local_data();
                        }
                        wsql.set_user_param("couch_ram_data_version", v.version);
                      }
                      return rinfo;
                    })
                    .catch(this.$p.record_log)
                    .then(() => rinfo);
								}
                return rinfo;
							})
							.then((rinfo) => {
								if(!rinfo){
									return;
								}
								if(id == "ram" && linfo.doc_count < (job_prm.pouch_ram_doc_count || 10)){
									_page = {
										total_rows: rinfo.doc_count,
										local_rows: linfo.doc_count,
										docs_written: 0,
										limit: 300,
										page: 0,
										start: Date.now()
									};
									t.emit('pouch_load_start', _page);
								}else if(id == "doc"){
									setTimeout(() => {
										t.emit('pouch_sync_start');
									});
								}
								var options = {
									live: true,
									retry: true,
									batch_size: 200,
									batches_limit: 6
								};
								if(job_prm.pouch_filter && job_prm.pouch_filter[id]){
									options.filter = job_prm.pouch_filter[id];
								}
								else if(id == "meta"){
									options.filter = "auth/meta";
								}
								if(id == "ram" || id == "meta" || wsql.get_user_param("zone") == job_prm.zone_demo){
									_local.sync[id] = local.replicate.from(remote, options);
								}else{
									_local.sync[id] = local.sync(remote, options);
								}
								_local.sync[id]
									.on('change', (change) => {
										if(id == "ram"){
											t.load_changes(change);
											if(linfo.doc_count < (job_prm.pouch_ram_doc_count || 10)){
												_page.page++;
												_page.docs_written = change.docs_written;
												_page.duration = Date.now() - _page.start;
												t.emit('pouch_data_page', Object.assign({}, _page));
												if(change.docs.length < _page.limit){
													t.call_data_loaded(_page);
												}
											}
										}else{
											change.update_only = true;
											t.load_changes(change);
										}
										t.emit('pouch_sync_data', id, change);
									})
									.on('paused', (info) => {
										t.emit('pouch_sync_paused', id, info);
									})
									.on('active', (info) => {
										t.emit('pouch_sync_resumed', id, info);
									})
									.on('denied', (info) => {
										t.emit('pouch_sync_denied', id, info);
									})
									.on('error', (err) => {
										t.emit('pouch_sync_error', id, err);
									});
								return _local.sync[id];
							});
					}
				}
			});
		}
		load_obj(tObj) {
			const db = this.db(tObj._manager);
			return db.get(tObj._manager.class_name + "|" + tObj.ref)
				.then((res) => {
					delete res._id;
					delete res._rev;
					Object.assign(tObj, res)._set_loaded();
				})
				.catch((err) => {
					if (err.status != 404)
						throw err;
					else
						console.log({tObj, db});
				})
				.then((res) => {
					return tObj;
				});
		}
		save_obj(tObj, attr) {
			const {_manager, _obj, _data, ref, class_name} = tObj;
			if(!_data || (_data._saving && !_data._modified)){
				return Promise.resolve(tObj);
			}
			if(_data._saving && _data._modified){
				return new Promise((resolve, reject) => {
					setTimeout(() => resolve(this.save_obj(tObj, attr)), 100);
				});
			}
			_data._saving = true;
			const db = this.db(_manager);
			const tmp = Object.assign({_id: class_name + "|" + ref, class_name}, _obj);
			delete tmp.ref;
			if (attr.attachments){
				tmp._attachments = attr.attachments;
			}
			return new Promise((resolve, reject) => {
				const getter = tObj.is_new() ? Promise.resolve() : db.get(tmp._id);
				getter.then((res) => {
					if (res) {
						tmp._rev = res._rev;
						for (var att in res._attachments) {
							if (!tmp._attachments)
								tmp._attachments = {};
							if (!tmp._attachments[att])
								tmp._attachments[att] = res._attachments[att];
						}
					}
				})
					.catch((err) => {
						err && err.status != 404 && reject(err);
					})
					.then(() => {
						return db.put(tmp);
					})
					.then(() => {
						tObj.is_new() && tObj._set_loaded(tObj.ref);
						if (tmp._attachments) {
							if (!tObj._attachments)
								tObj._attachments = {};
							for (var att in tmp._attachments) {
								if (!tObj._attachments[att] || !tmp._attachments[att].stub)
									tObj._attachments[att] = tmp._attachments[att];
							}
						}
						delete _data._saving;
						resolve(tObj);
					})
					.catch((err) => {
						delete _data._saving;
						err && err.status != 404 && reject(err);
					});
			});
		}
		get_tree(_mgr, attr){
		}
		get_selection(_mgr, attr){
		}
		load_array(_mgr, refs, with_attachments) {
			if(!refs.length){
				return Promise.resolve(false);
			}
			const options = {
					limit: refs.length + 1,
					include_docs: true,
					keys: refs.map((v) => _mgr.class_name + "|" + v)
				},
				db = this.db(_mgr);
			if (with_attachments) {
				options.attachments = true;
				options.binary = true;
			}
			return db.allDocs(options).then((result) => this.load_changes(result, {}));
		}
		load_view(_mgr, _view) {
			var doc, res = [],
				db = this.db(_mgr),
				options = {
					limit: 1000,
					include_docs: true,
					startkey: _mgr.class_name + "|",
					endkey: _mgr.class_name + '|\ufff0'
				};
			return new Promise((resolve, reject) => {
				function process_docs(err, result) {
					if (result) {
						if (result.rows.length) {
							options.startkey = result.rows[result.rows.length - 1].key;
							options.skip = 1;
							result.rows.forEach((rev) => {
								doc = rev.doc;
								let key = doc._id.split("|");
								doc.ref = key[1];
								res.push(doc);
							});
							_mgr.load_array(res);
							res.length = 0;
							db.query(_view, options, process_docs);
						} else {
							resolve();
						}
					} else if (err) {
						reject(err);
					}
				}
				db.query(_view, options, process_docs);
			});
		}
    load_doc_ram() {
      const res = [];
      const {_m} = this.$p.md;
      ['cat', 'cch', 'ireg'].forEach((kind) => {
        for (let name in _m[kind]) {
          if (_m[kind][name].cachable == 'doc_ram') {
            res.push(kind + '.' + name);
          }
        }
      });
      return this.local.doc.find({
        selector: {class_name: {$in: res}},
        limit: 10000,
      })
        .then((data) => this.load_changes(data))
        .then(() => this.emit('pouch_doc_ram_loaded'));
    }
		find_rows(_mgr, selection) {
		  const {utils} = this.$p;
		  const db = this.db(_mgr);
		  const res = [];
		  const options = {
        limit: 100,
        include_docs: true,
        startkey: _mgr.class_name + "|",
        endkey: _mgr.class_name + '|\ufff0'
      };
			let doc, _raw, _view, _total_count, top, calc_count, top_count = 0, skip = 0, skip_count = 0;
			if (selection) {
				if (selection._top) {
					top = selection._top;
					delete selection._top;
				} else
					top = 300;
				if (selection._raw) {
					_raw = selection._raw;
					delete selection._raw;
				}
				if (selection._total_count) {
					_total_count = selection._total_count;
					delete selection._total_count;
				}
				if (selection._view) {
					_view = selection._view;
					delete selection._view;
				}
				if (selection._key) {
					if (selection._key._order_by == "des") {
						options.startkey = selection._key.endkey || selection._key + '\ufff0';
						options.endkey = selection._key.startkey || selection._key;
						options.descending = true;
					} else {
						options.startkey = selection._key.startkey || selection._key;
						options.endkey = selection._key.endkey || selection._key + '\ufff0';
					}
				}
				if (typeof selection._skip == "number") {
					skip = selection._skip;
					delete selection._skip;
				}
				if (selection._attachments) {
					options.attachments = true;
					options.binary = true;
					delete selection._attachments;
				}
			}
			if (_total_count) {
				calc_count = true;
				_total_count = 0;
				if (Object.keys(selection).length <= 1) {
					if (selection._key && selection._key.hasOwnProperty("_search")) {
						options.include_docs = false;
						options.limit = 100000;
						return db.query(_view, options)
							.then((result) => {
								result.rows.forEach((row) => {
									if (!selection._key._search || row.key[row.key.length - 1].toLowerCase().indexOf(selection._key._search) != -1) {
										_total_count++;
										if (skip) {
											skip_count++;
											if (skip_count < skip)
												return;
										}
										res.push(row.id);
										if (top) {
											top_count++;
											if (top_count >= top){
												return;
											}
										}
									}
								});
								delete options.startkey;
								delete options.endkey;
								if (options.descending)
									delete options.descending;
								options.keys = res;
								options.include_docs = true;
								return db.allDocs(options);
							})
							.then((result) => {
								return {
									rows: result.rows.map((row) => {
										var doc = row.doc;
										doc.ref = doc._id.split("|")[1];
										if (!_raw) {
											delete doc._id;
											delete doc._rev;
										}
										return doc;
									}),
									_total_count: _total_count
								};
							})
					}
				}
			}
			return new Promise((resolve, reject) => {
				function process_docs(err, result) {
					if (result) {
						if (result.rows.length) {
							options.startkey = result.rows[result.rows.length - 1].key;
							options.skip = 1;
							result.rows.forEach((rev) => {
								doc = rev.doc;
								let key = doc._id.split("|");
								doc.ref = key[1];
								if (!_raw) {
									delete doc._id;
									delete doc._rev;
								}
								if (!utils._selection.call(_mgr, doc, selection)){
									return;
								}
								if (calc_count){
									_total_count++;
								}
								if (skip) {
									skip_count++;
									if (skip_count < skip)
										return;
								}
								res.push(doc);
								if (top) {
									top_count++;
									if (top_count >= top){
										return;
									}
								}
							});
							if (top && (top_count >= top || result.rows.length < options.limit) && !calc_count) {
								resolve(_raw ? res : _mgr.load_array(res));
							}
							else{
								fetch_next_page();
							}
						} else {
							if (calc_count) {
								resolve({
									rows: _raw ? res : _mgr.load_array(res),
									_total_count: _total_count
								});
							} else
								resolve(_raw ? res : _mgr.load_array(res));
						}
					} else if (err) {
						reject(err);
					}
				}
				function fetch_next_page() {
					if (_view)
						db.query(_view, options, process_docs);
					else
						db.allDocs(options, process_docs);
				}
				fetch_next_page();
			});
		}
		save_attachment(_mgr, ref, att_id, attachment, type) {
			if (!type)
				type = {type: "text/plain"};
			if (!(attachment instanceof Blob) && type.indexOf("text") == -1)
				attachment = new Blob([attachment], {type: type});
			var _rev,
				db = this.db(_mgr);
			ref = _mgr.class_name + "|" + this.$p.utils.fix_guid(ref);
			return db.get(ref)
				.then((res) => {
					if (res)
						_rev = res._rev;
				})
				.catch((err) => {
					if (err.status != 404)
						throw err;
				})
				.then(() => {
					return db.putAttachment(ref, att_id, _rev, attachment, type);
				});
		}
		get_attachment(_mgr, ref, att_id) {
			return this.db(_mgr).getAttachment(_mgr.class_name + "|" + this.$p.utils.fix_guid(ref), att_id);
		}
		delete_attachment(_mgr, ref, att_id) {
			var _rev,
				db = this.db(_mgr);
			ref = _mgr.class_name + "|" + this.$p.utils.fix_guid(ref);
			return db.get(ref)
				.then((res) => {
					if (res)
						_rev = res._rev;
				})
				.catch((err) => {
					if (err.status != 404)
						throw err;
				})
				.then(() => {
					return db.removeAttachment(ref, att_id, _rev);
				});
		}
		load_changes(changes, options) {
			let docs, doc, res = {}, cn, key, {$p} = this;
			if(!options) {
				if (changes.direction) {
					if (changes.direction != "pull")
						return;
					docs = changes.change.docs;
				}
				else{
					docs = changes.docs;
				}
			}else{
				docs = changes.rows;
			}
			if (docs.length > 0) {
				if (options) {
					options.startkey = docs[docs.length - 1].key;
					options.skip = 1;
				}
				docs.forEach((rev) => {
					doc = options ? rev.doc : rev;
					if (!doc) {
						if ((rev.value && rev.value.deleted))
							doc = {
								_id: rev.id,
								_deleted: true
							};
						else if (rev.error)
							return;
					}
					key = doc._id.split("|");
					cn = key[0].split(".");
					doc.ref = key[1];
					delete doc._id;
					delete doc._rev;
					if (!res[cn[0]])
						res[cn[0]] = {};
					if (!res[cn[0]][cn[1]])
						res[cn[0]][cn[1]] = [];
					res[cn[0]][cn[1]].push(doc);
				});
				for (let mgr in res) {
					for (cn in res[mgr]) {
						if ($p[mgr] && $p[mgr][cn]) {
							$p[mgr][cn].load_array(res[mgr][cn], changes.update_only ? "update_only" : true);
						}
					}
				}
				return true;
			}
			return false;
		}
		backup_database(do_zip){
		}
		restore_database(do_zip){
		}
	}
}
var adapter$1 = (constructor) => {
	const {classes} = constructor;
	classes.PouchDB = PouchDB$1;
	classes.AdapterPouch = adapter(classes);
};

const plugin = {
	proto(constructor) {
		proto(constructor);
		adapter$1(constructor);
	},
	constructor(){
		const {AdapterPouch} = this.classes;
		this.adapters.pouch = new AdapterPouch(this);
	}
};

module.exports = plugin;
