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
    $scope.tileModal = {
        open: false
    };

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
            custom: !!site.custom,
            sourceUrl: site.sourceUrl || ''
        };
    }

    function savePinnedTopSites() {
        var obj = {};
        obj[pinned_top_key] = $scope.pinnedTopSites;
        Apps.saveSetting(obj);
    }

    function saveHiddenTopSites() {
        var obj = {};
        obj[hidden_top_key] = $scope.hiddenTopSites;
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

    function findPinnedTopSiteIndex(url) {
        var key = topSiteKey(url);
        var i;

        for(i = 0; i < $scope.pinnedTopSites.length; i++) {
            if(topSiteKey($scope.pinnedTopSites[i].url) === key) {
                return i;
            }
        }

        return -1;
    }

    $scope.removeTopSite = function(site, event) {
        var pinnedIndex;
        var sourceUrl;

        if(event) {
            event.preventDefault();
            event.stopPropagation();
        }

        if(!site || !site.url) {
            return;
        }

        if(site.pinned) {
            pinnedIndex = findPinnedTopSiteIndex(site.url);
            sourceUrl = pinnedIndex >= 0 ?
                $scope.pinnedTopSites[pinnedIndex].sourceUrl : '';

            if(pinnedIndex >= 0) {
                $scope.pinnedTopSites.splice(pinnedIndex, 1);
            }

            if(sourceUrl) {
                $scope.hiddenTopSites = $scope.hiddenTopSites.filter(function(url) {
                    return topSiteKey(url) !== topSiteKey(sourceUrl);
                });
                saveHiddenTopSites();
            }

            savePinnedTopSites();
            loadTopSites();
            return;
        }

        $scope.hideTopSite(site, event);
    };

    function openTileModal(mode, site) {
        $scope.tileModal = {
            mode: mode,
            open: true,
            originalUrl: site ? site.url : '',
            sourceUrl: site ? site.sourceUrl : '',
            title: site ? site.title : '',
            url: site ? site.url : ''
        };
    }

    $scope.openAddTopSite = function(event) {
        if(event) {
            event.preventDefault();
        }

        openTileModal('add');
    };

    $scope.openEditTopSite = function(site, event) {
        if(event) {
            event.preventDefault();
            event.stopPropagation();
        }

        openTileModal('edit', site);
    };

    $scope.closeTileModal = function() {
        $scope.tileModal = {
            open: false
        };
    };

    $scope.saveTileModal = function(event) {
        var url;
        var title;
        var originalUrl;
        var pinnedIndex;

        if(event) {
            event.preventDefault();
        }

        url = normalizeUrl($scope.tileModal.url);
        title = ($scope.tileModal.title || '').trim();
        originalUrl = $scope.tileModal.originalUrl;
        pinnedIndex = findPinnedTopSiteIndex(originalUrl);

        if(!url || $scope.pinnedTopSites.some(function(site) {
            return topSiteKey(site.url) === url &&
                topSiteKey(site.url) !== topSiteKey(originalUrl);
        })) {
            return;
        }

        if($scope.tileModal.mode === 'edit' && pinnedIndex >= 0) {
            $scope.pinnedTopSites[pinnedIndex].title = title || url;
            $scope.pinnedTopSites[pinnedIndex].url = url;
        } else {
            $scope.pinnedTopSites.push({
                title: title || url,
                url: url,
                custom: true,
                sourceUrl: $scope.tileModal.mode === 'edit' ? originalUrl : ''
            });

            if($scope.tileModal.mode === 'edit' &&
               $scope.hiddenTopSites.indexOf(originalUrl) === -1) {
                $scope.hiddenTopSites.push(originalUrl);
                saveHiddenTopSites();
            }
        }

        $scope.closeTileModal();
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
