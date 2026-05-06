'use strict';
var controllers = angular.module('newTab.controllers', ['newTab.services']);

controllers.controller('MainController',
                       ['$scope', 'Apps',
                        function ($scope, Apps) {
    var enabled_screens_key = 'old_ntp.enabled_screens';
    var active_screen_key = 'old_ntp.active_screen';
    var cycle_screens_key = 'old_ntp.cycle_screens';
    var screen_order_key = 'old_ntp.screen_order';
    var show_top_key = 'old_ntp.show_top';
    var hidden_top_key = 'old_ntp.hidden_top_sites';
    var pinned_top_key = 'old_ntp.pinned_top_sites';
    var top_site_order_key = 'old_ntp.top_site_order';

    var screenDefs = window.newTabScreens || [];
    var screenLookup = {};
    var defaultEnabledScreenIds = (window.newTabDefaultEnabledScreenIds &&
        window.newTabDefaultEnabledScreenIds()) || [];
    var i;

    for(i = 0; i < screenDefs.length; i++) {
        screenLookup[screenDefs[i].id] = screenDefs[i];
    }

    $scope.screens = [];
    $scope.enabledScreenIds = [];
    $scope.activeScreenId = '';
    $scope.cycleScreens = false;
    $scope.screenOrder = [];
    $scope.draggedScreenId = '';
    $scope.dragOverScreenId = '';
    $scope.suppressScreenTabClick = false;
    $scope.apps = [];
    $scope.allBookmarks = [];
    $scope.bookmarks = [];
    $scope.bookmarkFolderId = '';
    $scope.bookmarkPageCount = 1;
    $scope.bookmarkPageIndex = 0;
    $scope.bookmarkPageSize = 12;
    $scope.bookmarkPages = [];
    $scope.bookmarkPath = [];
    $scope.bookmarkRootFolders = [];
    $scope.bookmarkRootId = '';
    $scope.bookmarkDefaultRootId = '';
    $scope.bookmarkModal = {
        open: false
    };
    $scope.hiddenTopSites = [];
    $scope.pinnedTopSites = [];
    $scope.topSiteOrder = [];
    $scope.draggedTopSiteIndex = null;
    $scope.dragOverTopSiteIndex = null;
    $scope.suppressTopSiteClick = false;
    $scope.tileModal = {
        open: false
    };

    $scope.msg = function(key, substitutions) {
        return chrome.i18n.getMessage(key, substitutions) || key;
    };

    document.title = $scope.msg('newTabTitle');

    function getEnabledScreens() {
        return $scope.enabledScreenIds.map(function(id) {
            return screenLookup[id];
        }).filter(function(item) {
            return !!item;
        });
    }

    function normalizeScreenOrder(ids) {
        var seen = {};
        var ordered = [];

        (ids || []).forEach(function(id) {
            if(screenLookup[id] && !seen[id]) {
                seen[id] = true;
                ordered.push(id);
            }
        });

        screenDefs.forEach(function(screen) {
            if(!seen[screen.id]) {
                seen[screen.id] = true;
                ordered.push(screen.id);
            }
        });

        return ordered;
    }

    function getOrderedScreenDefs() {
        var order = normalizeScreenOrder($scope.screenOrder);

        $scope.screenOrder = order;

        return order.map(function(id) {
            return screenLookup[id];
        }).filter(function(screen) {
            return !!screen;
        });
    }

    function refreshScreens() {
        var enabled = {};

        $scope.enabledScreenIds = ($scope.enabledScreenIds || [])
            .filter(function(id) {
                return !!screenLookup[id];
            });

        if(!$scope.enabledScreenIds.length) {
            $scope.enabledScreenIds = defaultEnabledScreenIds.slice();
        }

        for(i = 0; i < $scope.enabledScreenIds.length; i++) {
            enabled[$scope.enabledScreenIds[i]] = true;
        }

        $scope.screens = getOrderedScreenDefs().filter(function(def) {
            return enabled[def.id];
        });

        if(!$scope.activeScreenId || !enabled[$scope.activeScreenId]) {
            $scope.activeScreenId = $scope.screens.length ?
                $scope.screens[0].id : '';
        }
    }

    function saveScreenPreferences() {
        var obj = {};

        obj[enabled_screens_key] = $scope.enabledScreenIds.slice();
        obj[active_screen_key] = $scope.activeScreenId;
        obj[cycle_screens_key] = $scope.cycleScreens === true;
        obj[screen_order_key] = $scope.screenOrder.slice();
        obj[show_top_key] = $scope.activeScreenId === 'top';

        Apps.saveSetting(obj);
    }

    function saveScreenOrder() {
        var obj = {};

        $scope.screenOrder = normalizeScreenOrder($scope.screenOrder);
        obj[screen_order_key] = $scope.screenOrder.slice();
        Apps.saveSetting(obj);
    }

    function setActiveScreenInternal(screenId, persist) {
        if(!screenLookup[screenId]) {
            return;
        }

        if($scope.enabledScreenIds.indexOf(screenId) === -1) {
            return;
        }

        $scope.activeScreenId = screenId;
        if(persist !== false) {
            saveScreenPreferences();
        }
    }

    function cycleScreen(direction) {
        var enabled = getEnabledScreens();
        var index = -1;
        var nextIndex;

        if(enabled.length < 2) {
            return;
        }

        for(i = 0; i < enabled.length; i++) {
            if(enabled[i].id === $scope.activeScreenId) {
                index = i;
                break;
            }
        }

        if(index === -1) {
            setActiveScreenInternal(enabled[0].id);
            return;
        }

        nextIndex = index + direction;

        if($scope.cycleScreens) {
            nextIndex = (nextIndex + enabled.length) % enabled.length;
        } else if(nextIndex < 0 || nextIndex >= enabled.length) {
            return;
        }

        setActiveScreenInternal(enabled[nextIndex].id);
    }

    function canSwitchScreen(direction) {
        var enabled = getEnabledScreens();
        var index = -1;

        if(enabled.length < 2) {
            return false;
        }

        if($scope.cycleScreens) {
            return true;
        }

        for(i = 0; i < enabled.length; i++) {
            if(enabled[i].id === $scope.activeScreenId) {
                index = i;
                break;
            }
        }

        if(index === -1) {
            return true;
        }

        return index + direction >= 0 && index + direction < enabled.length;
    }

    $scope.setActiveScreen = function(screenId) {
        if($scope.suppressScreenTabClick) {
            return;
        }

        setActiveScreenInternal(screenId);
    };

    $scope.canShowPreviousScreen = function() {
        return canSwitchScreen(-1);
    };

    $scope.canShowNextScreen = function() {
        return canSwitchScreen(1);
    };

    $scope.showPreviousScreen = function() {
        cycleScreen(-1);
    };

    $scope.showNextScreen = function() {
        cycleScreen(1);
    };

    $scope.startScreenDrag = function(screen, event) {
        var dataTransfer;

        if(!screen || !screen.id) {
            return;
        }

        $scope.draggedScreenId = screen.id;
        $scope.dragOverScreenId = screen.id;
        $scope.suppressScreenTabClick = false;

        dataTransfer = eventDataTransfer(event);
        if(dataTransfer) {
            dataTransfer.effectAllowed = 'move';
            dataTransfer.setData('text/plain', screen.id);
        }
    };

    $scope.dragOverScreen = function(screen, event) {
        var dataTransfer;

        if(!$scope.draggedScreenId || !screen || !screen.id) {
            return;
        }

        if(event) {
            event.preventDefault();
            dataTransfer = eventDataTransfer(event);
            if(dataTransfer) {
                dataTransfer.dropEffect = 'move';
            }
        }

        $scope.dragOverScreenId = screen.id;
    };

    $scope.dropScreen = function(screen, event) {
        var fromIndex;
        var toIndex;
        var moved;

        if(event) {
            event.preventDefault();
            event.stopPropagation();
        }

        if(!$scope.draggedScreenId || !screen || !screen.id ||
           $scope.draggedScreenId === screen.id) {
            $scope.endScreenDrag();
            return;
        }

        $scope.screenOrder = normalizeScreenOrder($scope.screenOrder);
        fromIndex = $scope.screenOrder.indexOf($scope.draggedScreenId);
        toIndex = $scope.screenOrder.indexOf(screen.id);

        if(fromIndex === -1 || toIndex === -1) {
            $scope.endScreenDrag();
            return;
        }

        moved = $scope.screenOrder.splice(fromIndex, 1)[0];
        $scope.screenOrder.splice(toIndex, 0, moved);
        refreshScreens();
        saveScreenOrder();
        $scope.endScreenDrag();
    };

    $scope.endScreenDrag = function() {
        $scope.draggedScreenId = '';
        $scope.dragOverScreenId = '';
        $scope.suppressScreenTabClick = true;

        window.setTimeout(function() {
            $scope.suppressScreenTabClick = false;
        }, 250);
    };

    $(window).on("keydown", function (e) {
        if (e.which == 37) { // Left arrow key
            cycleScreen(-1);
        } else if (e.which == 39) { // Right arrow key
            cycleScreen(1);
        } else {
            return;
        }

        $scope.$apply();
    });

    $(window).on("mousewheel", function (e) {
        var delta = e.originalEvent.wheelDelta;

        if (delta > 0) { // Scrolling up/left
            cycleScreen(-1);
        } else { // Scrolling down/right
            cycleScreen(1);
        }

        $scope.$apply();
    });

    if(chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener(function(changes, areaName) {
            if(areaName !== 'sync') {
                return;
            }

            if(changes[cycle_screens_key]) {
                $scope.cycleScreens = changes[cycle_screens_key].newValue === true;
            }

            if(changes[screen_order_key]) {
                $scope.screenOrder = normalizeScreenOrder(
                    changes[screen_order_key].newValue || []);
                refreshScreens();
            }

            if(changes[cycle_screens_key] || changes[screen_order_key]) {
                $scope.$apply();
            }
        });
    }

    function normalizeBookmarkPath(path) {
        path = path || [];

        if(path.length && !path[0].title) {
            path[0].title = $scope.msg('bookmarksRootFallback');
        }

        return path;
    }

    function currentBookmarkRoot() {
        return ($scope.bookmarkPath || [])[0] ||
            ($scope.bookmarkRootFolders || [])[0] || null;
    }

    function isBookmarkRootOverview() {
        return $scope.bookmarkFolderId === '/';
    }

    $scope.isBookmarkRootOverview = function() {
        return isBookmarkRootOverview();
    };

    function buildBookmarkPages(activeIndex, pageCount) {
        var pages = [];
        var included = {};
        var i;
        var previousIndex = -1;

        function include(index) {
            if(index >= 0 && index < pageCount) {
                included[index] = true;
            }
        }

        include(0);
        include(pageCount - 1);
        include(activeIndex - 1);
        include(activeIndex);
        include(activeIndex + 1);

        for(i = 0; i < pageCount; i++) {
            if(!included[i]) {
                continue;
            }

            if(previousIndex !== -1 && i - previousIndex > 1) {
                pages.push({
                    separator: true,
                    label: '...'
                });
            }

            pages.push({
                index: i,
                label: String(i + 1)
            });
            previousIndex = i;
        }

        return pages;
    }

    function updateBookmarkPage(pageIndex) {
        var total = ($scope.allBookmarks || []).length;
        var start;

        $scope.bookmarkPageCount = Math.max(
            1, Math.ceil(total / $scope.bookmarkPageSize));
        $scope.bookmarkPageIndex = Math.max(
            0, Math.min(pageIndex || 0, $scope.bookmarkPageCount - 1));
        $scope.bookmarkPages = buildBookmarkPages(
            $scope.bookmarkPageIndex, $scope.bookmarkPageCount);

        start = $scope.bookmarkPageIndex * $scope.bookmarkPageSize;
        $scope.bookmarks = $scope.allBookmarks.slice(
            start, start + $scope.bookmarkPageSize);
    }

    function loadBookmarks(folderId) {
        return Apps.getBookmarksFolder(folderId || '')
            .then(function (result) {
                return Apps.topSitePreviews().then(function(previews) {
                    $scope.allBookmarks = (result.items || []).map(function(item) {
                        var preview;

                        if(item.url) {
                            preview = previews[topSiteKey(item.url)];
                            if(preview && preview.image) {
                                item.preview = preview.image;
                            }
                        }

                        return item;
                    });
                    $scope.bookmarkFolderId = result.folder ? result.folder.id : '';
                    $scope.bookmarkRootId = result.rootId || '';
                    $scope.bookmarkRootFolders = result.rootFolders || [];
                    $scope.bookmarkDefaultRootId = result.defaultRootId || '';
                    $scope.bookmarkPath = normalizeBookmarkPath(result.path);
                    updateBookmarkPage(0);
                });
            }, function() {
                $scope.allBookmarks = [];
                $scope.bookmarks = [];
                $scope.bookmarkFolderId = '';
                $scope.bookmarkPageCount = 1;
                $scope.bookmarkPageIndex = 0;
                $scope.bookmarkPages = [];
                $scope.bookmarkPath = [];
                $scope.bookmarkRootFolders = [];
                $scope.bookmarkRootId = '';
                $scope.bookmarkDefaultRootId = '';
            });
    }

    $scope.canShowPreviousBookmarkPage = function() {
        return $scope.bookmarkPageIndex > 0;
    };

    $scope.canShowNextBookmarkPage = function() {
        return $scope.bookmarkPageIndex < $scope.bookmarkPageCount - 1;
    };

    $scope.showPreviousBookmarkPage = function(event) {
        if(event) {
            event.preventDefault();
            event.stopPropagation();
        }

        if($scope.canShowPreviousBookmarkPage()) {
            updateBookmarkPage($scope.bookmarkPageIndex - 1);
        }
    };

    $scope.showNextBookmarkPage = function(event) {
        if(event) {
            event.preventDefault();
            event.stopPropagation();
        }

        if($scope.canShowNextBookmarkPage()) {
            updateBookmarkPage($scope.bookmarkPageIndex + 1);
        }
    };

    $scope.setBookmarkPage = function(page, event) {
        if(event) {
            event.preventDefault();
            event.stopPropagation();
        }

        if(page && page.separator !== true) {
            updateBookmarkPage(page.index);
        }
    };

    $scope.openBookmarkFolder = function(bookmark, event) {
        if(event) {
            event.preventDefault();
            event.stopPropagation();
        }

        if(!bookmark || bookmark.url) {
            return;
        }

        loadBookmarks(bookmark.id);
    };

    $scope.openBookmarkPath = function(pathItem, event) {
        if(event) {
            event.preventDefault();
            event.stopPropagation();
        }

        if(!pathItem || !pathItem.id ||
           pathItem.id === $scope.bookmarkFolderId) {
            return;
        }

        loadBookmarks(pathItem.id);
    };

    $scope.showDefaultBookmarkRoot = function(event) {
        if(event) {
            event.preventDefault();
            event.stopPropagation();
        }

        loadBookmarks($scope.bookmarkDefaultRootId || '');
    };

    $scope.showBookmarkParent = function(event) {
        var parent;

        if(event) {
            event.preventDefault();
            event.stopPropagation();
        }

        if(isBookmarkRootOverview()) {
            loadBookmarks($scope.bookmarkDefaultRootId || '');
            return;
        }

        if(($scope.bookmarkPath || []).length < 2) {
            return;
        }

        parent = $scope.bookmarkPath[$scope.bookmarkPath.length - 2];
        loadBookmarks(parent.id);
    };

    $scope.openAddBookmark = function(event) {
        if(event) {
            event.preventDefault();
            event.stopPropagation();
        }

        $scope.bookmarkModal = {
            open: true,
            mode: 'add',
            type: 'bookmark',
            title: '',
            url: ''
        };
    };

    $scope.openAddBookmarkFolder = function(event) {
        if(event) {
            event.preventDefault();
            event.stopPropagation();
        }

        $scope.bookmarkModal = {
            open: true,
            mode: 'add',
            type: 'folder',
            root: isBookmarkRootOverview(),
            title: ''
        };
    };

    $scope.openEditBookmark = function(bookmark, event) {
        if(event) {
            event.preventDefault();
            event.stopPropagation();
        }

        if(!bookmark) {
            return;
        }

        $scope.bookmarkModal = {
            open: true,
            mode: 'edit',
            type: bookmark.url ? 'bookmark' : 'folder',
            id: bookmark.id,
            title: bookmark.title || '',
            url: bookmark.url || ''
        };
    };

    $scope.closeBookmarkModal = function() {
        $scope.bookmarkModal.open = false;
    };

    $scope.saveBookmarkModal = function(event) {
        var modal = $scope.bookmarkModal;
        var title;
        var url;
        var action;

        if(event) {
            event.preventDefault();
        }

        title = (modal.title || '').trim();

        if(modal.type === 'bookmark') {
            url = normalizeUrl(modal.url);
            if(!url) {
                return;
            }

            action = modal.mode === 'edit' ?
                Apps.updateBookmark(modal.id, {
                    title: title || url,
                    url: url
                }) :
                Apps.createBookmark({
                    parentId: isBookmarkRootOverview() ?
                        $scope.bookmarkRootId : $scope.bookmarkFolderId,
                    title: title || url,
                    url: url
                });
        } else {
            if(!title) {
                return;
            }

            action = modal.mode === 'edit' ?
                Apps.updateBookmark(modal.id, {
                    title: title
                }) :
                Apps.createBookmark({
                    parentId: modal.root ? $scope.bookmarkRootId :
                        $scope.bookmarkFolderId,
                    title: title
                });
        }

        action.then(function(result) {
            $scope.closeBookmarkModal();
            loadBookmarks(modal.root ? '/' : $scope.bookmarkFolderId);
        }, function() {
            window.alert($scope.msg('bookmarkOperationFailed'));
        });
    };

    $scope.removeBookmark = function(bookmark, event) {
        var action;
        var message;

        if(event) {
            event.preventDefault();
            event.stopPropagation();
        }

        if(!bookmark || !bookmark.id) {
            return;
        }

        message = bookmark.url ?
            $scope.msg('deleteBookmarkConfirm') :
            $scope.msg('deleteBookmarkFolderConfirm');

        if(!window.confirm(message)) {
            return;
        }

        action = bookmark.url ?
            Apps.removeBookmark(bookmark.id) :
            Apps.removeBookmarkTree(bookmark.id);

        action.then(function() {
            loadBookmarks($scope.bookmarkFolderId);
        }, function() {
            window.alert($scope.msg('bookmarkOperationFailed'));
        });
    };

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

    function eventDataTransfer(event) {
        return event && (event.dataTransfer ||
            (event.originalEvent && event.originalEvent.dataTransfer));
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

    function saveTopSiteOrder() {
        var obj = {};

        $scope.topSiteOrder = ($scope.top || []).map(function(site) {
            return topSiteKey(site.url);
        }).filter(function(url) {
            return !!url;
        });

        obj[top_site_order_key] = $scope.topSiteOrder;
        Apps.saveSetting(obj);
    }

    function applyTopSiteOrder(sites) {
        var order = {};

        ($scope.topSiteOrder || []).forEach(function(url, index) {
            var key = topSiteKey(url);

            if(key && order[key] === undefined) {
                order[key] = index;
            }
        });

        return sites.map(function(site, index) {
            return {
                site: site,
                index: index,
                order: order[topSiteKey(site.url)]
            };
        }).sort(function(left, right) {
            var leftOrdered = left.order !== undefined;
            var rightOrdered = right.order !== undefined;

            if(leftOrdered && rightOrdered) {
                return left.order - right.order;
            }

            if(leftOrdered) {
                return -1;
            }

            if(rightOrdered) {
                return 1;
            }

            return left.index - right.index;
        }).map(function(item) {
            return item.site;
        });
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

                $scope.top = applyTopSiteOrder(pinned.concat(visibleSites))
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
                    return result.isApp === true ||
                        (/^(hosted_app|packaged_app|legacy_packaged_app)$/)
                            .test(result.type);
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

    $scope.openTopSite = function(event) {
        if($scope.suppressTopSiteClick && event) {
            event.preventDefault();
            event.stopPropagation();
        }
    };

    $scope.startTopSiteDrag = function(site, index, event) {
        var dataTransfer;

        if(!site || !site.url) {
            return;
        }

        $scope.draggedTopSiteIndex = index;
        $scope.dragOverTopSiteIndex = index;
        $scope.suppressTopSiteClick = false;

        dataTransfer = eventDataTransfer(event);
        if(dataTransfer) {
            dataTransfer.effectAllowed = 'move';
            dataTransfer.setData('text/plain', site.url);
        }
    };

    $scope.dragOverTopSite = function(index, event) {
        var dataTransfer;

        if($scope.draggedTopSiteIndex === null ||
           $scope.draggedTopSiteIndex === undefined) {
            return;
        }

        if(event) {
            event.preventDefault();
            dataTransfer = eventDataTransfer(event);
            if(dataTransfer) {
                dataTransfer.dropEffect = 'move';
            }
        }

        $scope.dragOverTopSiteIndex = index;
    };

    $scope.leaveTopSiteDrag = function(index) {
        if($scope.dragOverTopSiteIndex === index) {
            $scope.dragOverTopSiteIndex = null;
        }
    };

    $scope.dropTopSite = function(index, event) {
        var moved;
        var fromIndex = $scope.draggedTopSiteIndex;

        if(event) {
            event.preventDefault();
            event.stopPropagation();
        }

        if(fromIndex === null || fromIndex === undefined ||
           fromIndex === index || !$scope.top ||
           !$scope.top[fromIndex] || !$scope.top[index]) {
            $scope.endTopSiteDrag();
            return;
        }

        moved = $scope.top[fromIndex];
        $scope.top[fromIndex] = $scope.top[index];
        $scope.top[index] = moved;
        saveTopSiteOrder();
        $scope.endTopSiteDrag();
    };

    $scope.endTopSiteDrag = function() {
        $scope.draggedTopSiteIndex = null;
        $scope.dragOverTopSiteIndex = null;
        $scope.suppressTopSiteClick = true;

        window.setTimeout(function() {
            $scope.suppressTopSiteClick = false;
        }, 250);
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

    // initial page setup
    var querySettings = [enabled_screens_key, active_screen_key, cycle_screens_key,
                         screen_order_key, show_top_key, hidden_top_key,
                         pinned_top_key, top_site_order_key];

    Apps.getSetting(querySettings)
        .then(function(settings) {
            var enabled = settings[enabled_screens_key];

            if(!enabled || !enabled.length) {
                enabled = defaultEnabledScreenIds.slice();
            }

            $scope.enabledScreenIds = enabled.filter(function(id) {
                return !!screenLookup[id];
            });

            $scope.hiddenTopSites = settings[hidden_top_key] || [];
            $scope.pinnedTopSites = settings[pinned_top_key] || [];
            $scope.topSiteOrder = settings[top_site_order_key] || [];
            $scope.cycleScreens = settings[cycle_screens_key] === true;
            $scope.screenOrder = normalizeScreenOrder(settings[screen_order_key]);

            if(settings[active_screen_key] && screenLookup[settings[active_screen_key]]) {
                $scope.activeScreenId = settings[active_screen_key];
            } else if(settings[show_top_key] !== undefined) {
                $scope.activeScreenId = settings[show_top_key] ? 'top' : 'apps';
            }

            refreshScreens();
            saveScreenPreferences();
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
