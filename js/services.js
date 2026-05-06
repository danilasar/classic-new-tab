'use strict';
/*global chrome*/
var services = angular.module('newTab.services', []);

services.service('Apps', ['$rootScope', '$q', function ($rootScope, $q) {
    return {
        getAll: function () {
            var deferred = $q.defer();

            chrome.management.getAll(function (results) {
                $rootScope.$apply(function(){
                    deferred.resolve(results);
                });
            });

            return deferred.promise;
        },

        launch: function(id){
            var deferred = $q.defer();
            chrome.management.launchApp(id, function(){
                deferred.resolve();
            });
            return deferred.promise;
        },

        appUrl: function(app) {
            return app && (app.appLaunchUrl || app.homepageUrl || '');
        },

        pinned: function(url){
            var deferred = $q.defer();
            chrome.tabs.create({pinned:true, url: url}, function(tab){
                deferred.resolve(tab);
            });
            return deferred.promise;
        },

        newWindow: function(url){
            var deferred = $q.defer();
            chrome.windows.create({focused:true, url: url}, function(window){
                deferred.resolve(window);
            });
            return deferred.promise;
        },

        uninstall: function(id){
            var deferred = $q.defer();
            chrome.management.uninstall(id, {showConfirmDialog: true}, function(){
                $rootScope.$broadcast('UninstalledApp');
                deferred.resolve();
            });
            return deferred.promise;
        },

        tab: function(url){
            var deferred = $q.defer();
            chrome.tabs.create({active:true, url: url}, function(tab){
                deferred.resolve(tab);
            });
            return deferred.promise;
        },

        navigate: function(url){
            var deferred = $q.defer();
            chrome.tabs.update({active:true, url: url}, function(tab){
                deferred.resolve(tab);
            });
            return deferred.promise;
        },

        topSites: function(){
            var deferred = $q.defer();
            chrome.topSites.get(function(sites){
                // sites is [{url:"",title:""}]
                $rootScope.$apply(function(){
                    deferred.resolve(sites);
                });
            });
            return deferred.promise;
        },

        topSitePreviews: function(){
            var deferred = $q.defer();

            chrome.storage.local.get(['old_ntp.top_site_previews'], function(result) {
                $rootScope.$apply(function(){
                    deferred.resolve(result['old_ntp.top_site_previews'] || {});
                });
            });

            return deferred.promise;
        },

        saveSetting: function(obj){
            var deferred = $q.defer();
            if(angular.isObject(obj) === false || Object.keys(obj).length === 0) {
                deferred.reject();
            } else {
                chrome.storage.sync.set(obj, function() {
                    deferred.resolve();
                });
            }
            return deferred.promise;
        },

        getSetting: function(obj) {
            var query = [];
            var deferred = $q.defer();
            if(angular.isArray(obj) === false && typeof obj === 'string' && obj !== "") {
                query.push(obj);
            } else if (angular.isArray(obj)){
                if(obj.length === 0) { deferred.reject(); }
                else { query = query.concat(obj); }
            }

            chrome.storage.sync.get(query, function(settings) {
                deferred.resolve(settings);
            });
            return deferred.promise;
        },

        getBookmarksFolder: function(folderId, limit){
            var deferred = $q.defer();

            folderId = folderId || '';

            function folderInfo(node) {
                return {
                    id: node.parentId === undefined ? '/' : node.id,
                    parentId: node.parentId,
                    title: node.title,
                    unmodifiable: node.unmodifiable
                };
            }

            function findFolder(node, path) {
                var children = node && node.children;
                var i;
                var found;
                var nextPath;

                if(!node) {
                    return null;
                }

                nextPath = path.concat([folderInfo(node)]);

                if(node.id === folderId) {
                    return {
                        node: node,
                        path: nextPath
                    };
                }

                for(i = 0; children && i < children.length; i++) {
                    if(!children[i].url) {
                        found = findFolder(children[i], nextPath);
                        if(found) {
                            return found;
                        }
                    }
                }

                return null;
            }

            function folderResult(results) {
                var root = results && results[0];
                var rootFolders = root && root.children ? root.children : [];
                var defaultFolder = rootFolders[0];
                var current;

                if(!defaultFolder) {
                    return {
                        folder: null,
                        rootId: root ? root.id : '',
                        rootFolders: [],
                        defaultRootId: '',
                        path: [],
                        items: []
                    };
                }

                if(folderId === '/') {
                    return {
                        folder: {
                            id: '/',
                            title: '/'
                        },
                        rootId: root.id,
                        rootFolders: rootFolders.map(folderInfo),
                        defaultRootId: defaultFolder.id,
                        path: [folderInfo(root)],
                        items: limit ?
                            rootFolders.slice(0, limit) :
                            rootFolders
                    };
                }

                current = folderId ?
                    findFolder(root, []) :
                    {node: defaultFolder, path: [
                        folderInfo(root),
                        folderInfo(defaultFolder)
                    ]};

                if(!current || !current.node || current.node.url) {
                    current = {
                        node: defaultFolder,
                        path: [
                            folderInfo(root),
                            folderInfo(defaultFolder)
                        ]
                    };
                }

                return {
                    folder: folderInfo(current.node),
                    rootId: root.id,
                    rootFolders: rootFolders.map(folderInfo),
                    defaultRootId: defaultFolder.id,
                    path: current.path,
                    items: limit ?
                        (current.node.children || []).slice(0, limit) :
                        (current.node.children || [])
                };
            }

            chrome.bookmarks.getTree(function(results){
                $rootScope.$apply(function(){
                    deferred.resolve(folderResult(results));
                });
            });
            return deferred.promise;
        },

        createBookmark: function(bookmark) {
            var deferred = $q.defer();

            chrome.bookmarks.create(bookmark, function(result) {
                $rootScope.$apply(function(){
                    if(chrome.runtime.lastError) {
                        deferred.reject(chrome.runtime.lastError);
                    } else {
                        deferred.resolve(result);
                    }
                });
            });
            return deferred.promise;
        },

        updateBookmark: function(id, changes) {
            var deferred = $q.defer();

            chrome.bookmarks.update(id, changes, function(result) {
                $rootScope.$apply(function(){
                    if(chrome.runtime.lastError) {
                        deferred.reject(chrome.runtime.lastError);
                    } else {
                        deferred.resolve(result);
                    }
                });
            });
            return deferred.promise;
        },

        removeBookmark: function(id) {
            var deferred = $q.defer();

            chrome.bookmarks.remove(id, function() {
                $rootScope.$apply(function(){
                    if(chrome.runtime.lastError) {
                        deferred.reject(chrome.runtime.lastError);
                    } else {
                        deferred.resolve();
                    }
                });
            });
            return deferred.promise;
        },

        removeBookmarkTree: function(id) {
            var deferred = $q.defer();

            chrome.bookmarks.removeTree(id, function() {
                $rootScope.$apply(function(){
                    if(chrome.runtime.lastError) {
                        deferred.reject(chrome.runtime.lastError);
                    } else {
                        deferred.resolve();
                    }
                });
            });
            return deferred.promise;
        },

        getBookmarksBar: function(limit){
            return this.getBookmarksFolder('', limit)
                .then(function(result) {
                    return result.items.filter(function(item) {
                        return !!item.url;
                    });
                });
        }
    };
}]);
