"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var run = require("promisify-tuple");
var pull = require('pull-stream');
var cat = require('pull-cat');
var Notify = require('pull-notify');
var IP = require('ip');
var msNetPlugin = require('multiserver/plugins/net')({});
var msAddress = require('multiserver-address');
var Ref = require('ssb-ref');
var debug = require('debug')('ssb:conn-hub');
function noop() { }
function inferPeerType(address, meta) {
    if (address.startsWith('bt:'))
        return 'bt';
    if (address.startsWith('dht:') || meta === 'dht')
        return 'dht';
    if (address.startsWith('tunnel:'))
        return 'tunnel';
    if (address.startsWith('net:')) {
        var netAddr = address.split('~')[0];
        var parsed = msNetPlugin.parse(netAddr);
        if (parsed && parsed.host) {
          try {
              if (IP.isPrivate(parsed.host))
                  return 'lan';
          } catch (err) {}
          return 'internet';
        }
    }
    return;
}
var ConnHub = (function () {
    function ConnHub(server) {
        var _this = this;
        this._onRpcConnect = function (rpc, isClient) {
            if (rpc.id === _this._server.id)
                return;
            if (_this._server.ready && !_this._server.ready()) {
                rpc.close(true, noop);
                return;
            }
            var peer = _this._getPeerByKey(rpc.id);
            if (!peer && isClient) {
                rpc._connectRetries = rpc._connectRetries || 0;
                if (isClient && rpc._connectRetries < 4) {
                    setTimeout(function () {
                        _this._onRpcConnect(rpc, isClient);
                    }, 200);
                    rpc._connectRetries += 1;
                }
                else if (isClient) {
                    debug('our secret-stack initiated an RPC connection with %s but not ' +
                        'through the ssb-conn-hub connect() API', rpc.id);
                }
                return;
            }
            if (!peer) {
                debug('peer %s initiated an RPC connection with us', rpc.id);
            }
            var _a = __read(!peer
                ? [rpc.stream.address, { key: rpc.id }]
                : peer, 2), address = _a[0], data = _a[1];
            if (!data.type) {
                data.inferredType = inferPeerType(address, rpc.stream.meta);
            }
            var key = data.key;
            var state = 'connected';
            var disconnect = function (cb) { return rpc.close(true, cb || noop); };
            _this._setPeer(address, __assign(__assign({}, data), { state: state, disconnect: disconnect }));
            debug('connected to %s', address);
            _this._notifyEvent({
                type: state,
                address: address,
                key: key,
                details: { rpc: rpc, isClient: isClient },
            });
            _this._updateLiveEntries();
            rpc.on('closed', function () {
                _this._peers.delete(address);
                debug('disconnected from %s', address);
                _this._notifyEvent({ type: 'disconnected', address: address, key: key });
                _this._updateLiveEntries();
            });
        };
        this._server = server;
        this._closed = false;
        this._connectRetries = new Set();
        this._peers = new Map();
        this._notifyEvent = Notify();
        this._notifyEntries = Notify();
        this._init();
    }
    ConnHub.prototype._init = function () {
        this._server.addListener('rpc:connect', this._onRpcConnect);
    };
    ConnHub.prototype._assertNotClosed = function () {
        if (this._closed) {
            throw new Error('This ConnHub instance is closed, create a new one.');
        }
    };
    ConnHub.prototype._assertValidAddress = function (address) {
        if (!msAddress.check(address)) {
            throw new Error('The given address is not a valid multiserver-address');
        }
    };
    ConnHub.prototype._updateLiveEntries = function () {
        this._notifyEntries(Array.from(this._peers.entries()));
    };
    ConnHub.prototype._setPeer = function (address, data) {
        var now = Date.now();
        var hubUpdated = now;
        var previousData = this._peers.get(address);
        if (previousData) {
            Object.keys(data).forEach(function (key) {
                var k = key;
                if (typeof data[k] === 'undefined')
                    delete data[k];
            });
            this._peers.set(address, __assign(__assign(__assign({}, previousData), { hubUpdated: hubUpdated }), data));
        }
        else if (!data.state) {
            debug('unexpected control flow, we cannot add a peer without state');
        }
        else {
            var hubBirth = now;
            this._peers.set(address, __assign({ hubBirth: hubBirth, hubUpdated: hubUpdated }, data));
        }
    };
    ConnHub.prototype._getPeerByKey = function (key) {
        var e_1, _a;
        try {
            for (var _b = __values(this._peers.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var _d = __read(_c.value, 2), address = _d[0], data = _d[1];
                if (data.key === key)
                    return [address, data];
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return undefined;
    };
    ConnHub.prototype.connect = function (address, data) {
        return __awaiter(this, void 0, void 0, function () {
            var peer_1, state, key, _a, err, rpc, peer, state_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this._assertNotClosed();
                        this._assertValidAddress(address);
                        if (this._peers.has(address)) {
                            peer_1 = this._peers.get(address);
                            if (peer_1.state === 'connecting' || peer_1.state === 'connected') {
                                return [2, false];
                            }
                            else if (peer_1.state === 'disconnecting') {
                                this._connectRetries.add(address);
                                return [2, false];
                            }
                            else {
                                debug('unexpected control flow, peer %o has bad state', peer_1);
                            }
                        }
                        state = 'connecting';
                        key = Ref.getKeyFromAddress(address);
                        if (data) {
                            this._setPeer(address, __assign(__assign({}, data), { state: state, key: key }));
                        }
                        else {
                            this._setPeer(address, { state: state, key: key });
                        }
                        debug('connecting to %s', address);
                        this._notifyEvent({ type: state, address: address, key: key });
                        this._updateLiveEntries();
                        return [4, run(this._server.connect)(address)];
                    case 1:
                        _a = __read.apply(void 0, [_b.sent(), 2]), err = _a[0], rpc = _a[1];
                        if (err) {
                            this._peers.delete(address);
                            debug('failed to connect to %s', address);
                            this._notifyEvent({
                                type: 'connecting-failed',
                                address: address,
                                key: key,
                                details: err,
                            });
                            this._updateLiveEntries();
                            throw err;
                        }
                        peer = this._peers.get(address);
                        if (!peer || peer.state !== 'connected') {
                            state_1 = 'connected';
                            this._setPeer(address, { state: state_1, key: key });
                            debug('connected to %s', address);
                            this._notifyEvent({
                                type: state_1,
                                address: address,
                                key: key,
                                details: { rpc: rpc },
                            });
                            this._updateLiveEntries();
                        }
                        return [2, rpc];
                }
            });
        });
    };
    ConnHub.prototype.disconnect = function (address) {
        return __awaiter(this, void 0, void 0, function () {
            var peer, key, prevState, state, _a, err;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this._assertNotClosed();
                        this._assertValidAddress(address);
                        if (!this._peers.has(address))
                            return [2, false];
                        peer = this._peers.get(address);
                        key = Ref.getKeyFromAddress(address);
                        prevState = peer.state;
                        if (prevState !== 'disconnecting') {
                            state = 'disconnecting';
                            this._setPeer(address, { state: state, key: key });
                            debug('disconnecting from %s', address);
                            this._notifyEvent({ type: state, address: address, key: key });
                            this._updateLiveEntries();
                        }
                        if (!peer.disconnect) return [3, 2];
                        return [4, run(peer.disconnect)()];
                    case 1:
                        _a = __read.apply(void 0, [_b.sent(), 1]), err = _a[0];
                        if (err) {
                            debug('failed to disconnect from %s', address);
                            this._notifyEvent({
                                type: 'disconnecting-failed',
                                address: address,
                                key: key,
                                details: err,
                            });
                            this._setPeer(address, { state: prevState, key: key });
                            this._updateLiveEntries();
                            throw err;
                        }
                        _b.label = 2;
                    case 2:
                        this._peers.delete(address);
                        debug('disconnected from %s', address);
                        this._notifyEvent({ type: 'disconnected', address: address, key: key });
                        this._updateLiveEntries();
                        if (this._connectRetries.has(address)) {
                            this._connectRetries.delete(address);
                            this.connect(address);
                        }
                        return [2, true];
                }
            });
        });
    };
    ConnHub.prototype.update = function (address, data) {
        this._assertNotClosed();
        this._assertValidAddress(address);
        if (this._peers.has(address)) {
            this._setPeer(address, data);
            this._updateLiveEntries();
            return true;
        }
        else {
            return false;
        }
    };
    ConnHub.prototype.reset = function () {
        var e_2, _a;
        this._assertNotClosed();
        for (var id in this._server.peers) {
            if (id !== this._server.id) {
                try {
                    for (var _b = (e_2 = void 0, __values(this._server.peers[id])), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var peer = _c.value;
                        peer.close(true, noop);
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
        }
    };
    ConnHub.prototype.entries = function () {
        this._assertNotClosed();
        return this._peers.entries();
    };
    ConnHub.prototype.liveEntries = function () {
        this._assertNotClosed();
        return cat([
            pull.values([Array.from(this._peers.entries())]),
            this._notifyEntries.listen(),
        ]);
    };
    ConnHub.prototype.getState = function (address) {
        this._assertNotClosed();
        this._assertValidAddress(address);
        if (!this._peers.has(address))
            return undefined;
        return this._peers.get(address).state;
    };
    ConnHub.prototype.listen = function () {
        this._assertNotClosed();
        return this._notifyEvent.listen();
    };
    ConnHub.prototype.close = function () {
        this._server.removeListener('rpc:connect', this._onRpcConnect);
        this._closed = true;
        this._peers.clear();
        this._notifyEvent.end();
        this._notifyEntries.end();
        debug('closed the ConnHub instance');
    };
    return ConnHub;
}());
module.exports = ConnHub;
