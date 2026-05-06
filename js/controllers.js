'use strict';
var controllers = angular.module('newTab.controllers', ['newTab.services']);

controllers.controller('MainController',
                       ['$scope', 'Apps',
                        function ($scope, Apps) {
    var show_top_key = 'old_ntp.show_top';
    var hidden_top_key = 'old_ntp.hidden_top_sites';
    var pinned_top_key = 'old_ntp.pinned_top_sites';

    $scope.tabs = {
        show_top: false
    };
    $scope.hiddenTopSites = [];
    $scope.pinnedTopSites = [];
    $scope.newTopSite = {};
    $scope.showAddTopSite = false;

    $(window).on("keydown", function (e) {
        if (e.which == 37) { // Left arrow key
            if (!$scope.tabs.show_top) {
                $scope.tabs.show_top = true;
            }
        } else if (e.which == 39) { // Right arrow key
            if ($scope.tabs.show_top) {
                $scope.tabs.show_top = false;
            }
        } else {
            return;
        }

        $scope.$apply();
    });

    $(window).on("mousewheel", function (e) {
        var delta = e.originalEvent.wheelDelta;

        if (delta > 0) { // Scrolling up/left
            if (!$scope.tabs.show_top) {
                $scope.tabs.show_top = true;
            }
        } else { // Scrolling down/right
            if ($scope.tabs.show_top) {
                $scope.tabs.show_top = false;
            }
        }

        $scope.$apply();
    });

    function savePreferences() {
        var obj = {};

        obj[show_top_key] = $scope.tabs.show_top;

        Apps.saveSetting(obj);

        // reload bookmarks and topSites
        loadBookmarks();
        loadTopSites();
    };

    function loadBookmarks() {
        return Apps.getBookmarksBar(12)
            .then(function (results) {
                $scope.bookmarks = results;
            });
    }

    function topSiteKey(url) {
        if(!/^https?:\/\//.test(url || '')) {
            return '';
        }

        var parser = document.createElement('a');
        parser.href = url;
        parser.hash = '';

        return parser.href;
    }

    function normalizeUrl(url) {
        url = (url || '').trim();

        if(url && !/^[a-z]+:\/\//i.test(url)) {
            url = 'https://' + url;
        }

        return topSiteKey(url);
    }

    function siteFromPinned(site) {
        return {
            title: site.title || site.url,
            url: site.url,
            pinned: true,
            custom: !!site.custom
        };
    }

    function savePinnedTopSites() {
        var obj = {};
        obj[pinned_top_key] = $scope.pinnedTopSites;
        Apps.saveSetting(obj);
    }

    function loadTopSites() {
        return Apps.topSites().then(function (sites) {
            return Apps.topSitePreviews().then(function(previews) {
                var usedUrls = {};
                var pinned = $scope.pinnedTopSites.filter(function(site) {
                    return !!topSiteKey(site.url);
                }).map(function(site) {
                    var pinnedSite = siteFromPinned(site);
                    usedUrls[topSiteKey(pinnedSite.url)] = true;
                    return pinnedSite;
                });
                var visibleSites = sites.filter(function(site) {
                    var key = topSiteKey(site.url);

                    return $scope.hiddenTopSites.indexOf(site.url) === -1 &&
                        !usedUrls[key];
                });

                $scope.top = pinned.concat(visibleSites)
                    .slice(0, 12)
                    .map(function(site) {
                        var preview = previews[topSiteKey(site.url)];

                        if(preview && preview.image) {
                            site.preview = preview.image;
                        }

                        return site;
                    });
            });
        });
    }

    function loadApps() {
        return Apps.getAll()
            .then(function(results){
                $scope.apps = results.filter(function(result){
                    return (/^(extension|theme)$/).test(result.type) === false;
                });
            });
    }

    $scope.$on('UninstalledApp', loadApps);

    $scope.hideTopSite = function(site, event) {
        if(event) {
            event.preventDefault();
            event.stopPropagation();
        }

        if(!site || !site.url ||
           $scope.hiddenTopSites.indexOf(site.url) !== -1) {
            return;
        }

        $scope.hiddenTopSites.push(site.url);
        $scope.top = $scope.top.filter(function(topSite) {
            return topSite.url !== site.url;
        });

        var obj = {};
        obj[hidden_top_key] = $scope.hiddenTopSites;
        Apps.saveSetting(obj);
    };

    $scope.pinTopSite = function(site, event) {
        var url;

        if(event) {
            event.preventDefault();
            event.stopPropagation();
        }

        if(!site || site.pinned) {
            return;
        }

        url = topSiteKey(site.url);
        if(!url || $scope.pinnedTopSites.some(function(pinned) {
            return topSiteKey(pinned.url) === url;
        })) {
            return;
        }

        $scope.pinnedTopSites.push({
            title: site.title,
            url: url
        });
        savePinnedTopSites();
        loadTopSites();
    };

    $scope.removeTopSite = function(site, event) {
        if(event) {
            event.preventDefault();
            event.stopPropagation();
        }

        if(!site || !site.url) {
            return;
        }

        if(site.pinned) {
            $scope.pinnedTopSites = $scope.pinnedTopSites.filter(function(pinned) {
                return topSiteKey(pinned.url) !== topSiteKey(site.url);
            });
            savePinnedTopSites();
            loadTopSites();
            return;
        }

        $scope.hideTopSite(site, event);
    };

    $scope.addTopSite = function(event) {
        var url;
        var title;

        if(event) {
            event.preventDefault();
        }

        url = normalizeUrl($scope.newTopSite.url);
        title = ($scope.newTopSite.title || '').trim();

        if(!url || $scope.pinnedTopSites.some(function(site) {
            return topSiteKey(site.url) === url;
        })) {
            return;
        }

        $scope.pinnedTopSites.push({
            title: title || url,
            url: url,
            custom: true
        });

        $scope.newTopSite = {};
        $scope.showAddTopSite = false;
        savePinnedTopSites();
        loadTopSites();
    };

    $scope.$watch("tabs.show_top", function () {
        savePreferences();
    });

    // initial page setup
    var querySettings = [show_top_key, hidden_top_key, pinned_top_key];

    Apps.getSetting(querySettings)
        .then(function(settings) {
            $scope.tabs.show_top = settings[show_top_key];
            $scope.hiddenTopSites = settings[hidden_top_key] || [];
            $scope.pinnedTopSites = settings[pinned_top_key] || [];
        })
        .then(function(){
            loadApps()
                .then(function(){
                    loadBookmarks();
                    loadTopSites();
                });
        })
        .then(function setupWatches(){
            $scope.$watch('bookmark_count', loadBookmarks);
            $scope.$watch('top_count', loadTopSites);
        });
}]);
