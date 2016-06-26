'use strict'

//------------------------------------------------------------------------------
// Models for our locally stored data
//------------------------------------------------------------------------------
var Sequelize = require('sequelize');
var Q = require('q');
var AsyncLock = require('async-lock');


var exports = (function() {
    var _models = {};
    var _lockQueue = [];
    var _lock = new AsyncLock();

    //--------------------------------------------------------------------------
    // A lock that we can use to ensure that any writing to the database is 
    // finished before another writer starts.
    //
    // A donePromise will be passed into the deferred, this donePromise should
    // always be resolved when you are done with the database.
    //--------------------------------------------------------------------------
    function lock() {
        var lockDeferred = Q.defer();
        _lock.acquire("chesster", function() {
            var unlock = Q.defer();
            lockDeferred.resolve(unlock);
            return unlock.promise;
        });
        return lockDeferred.promise;
    }

    //--------------------------------------------------------------------------
    function defineModels(sequelize) {
        module.exports.LichessRating = sequelize.define('LichessRating', {
            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true
            },
            lichessUserName: Sequelize.STRING, // Comes from lichess
            rating: {
                type: Sequelize.INTEGER, allowNull: true
            },
            lastCheckedAt: {
                type: Sequelize.DATE, allowNull: true
            }
        });
        module.exports.Subscription = sequelize.define('Subscription', {
            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true
            },
            requester: {
                type: Sequelize.STRING, unique: "sourceEventTargetIndex"
            },
            source: {
                type: Sequelize.STRING, unique: "sourceEventTargetIndex"
            },
            event: {
                type: Sequelize.String, unique: "sourceEventTargetIndex"
            },
            target: {
                type: Sequelize.String, unique: "sourceEventTargetIndex"
            },
        });
    }

    //--------------------------------------------------------------------------
    // Connection function that ensures we have a connection and the models
    // are defined.
    //
    // Parameters: config - the config option that contains the database
    //                      information.
    //--------------------------------------------------------------------------
    function connect(config) {
        var sequelize = new Sequelize(config.database, config.username, config.password, config);
        var deferred = Q.defer();
        return sequelize.authenticate().then(function() {
            defineModels(sequelize);
            deferred.resolve();
        }).catch(function(error) {
            console.error("Unable to connect to database: " + error);
            deferred.reject(error);
        });
        return deferred.promise;
    }
    return {
        connect: connect,
        lock: lock
    };
})();

module.exports = exports
