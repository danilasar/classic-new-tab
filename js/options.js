'use strict';
/*global chrome*/

var HIDDEN_TOP_SITES_KEY = 'old_ntp.hidden_top_sites';
var PINNED_TOP_SITES_KEY = 'old_ntp.pinned_top_sites';
var TOP_SITE_PREVIEWS_KEY = 'old_ntp.top_site_previews';
var ENABLED_SCREENS_KEY = 'old_ntp.enabled_screens';

var screenDefs = window.newTabScreens || [
    {
        id: 'apps',
        titleKey: 'appsTab',
        descriptionKey: 'settingsScreenAppsDescription',
        defaultEnabled: true
    },
    {
        id: 'top',
        titleKey: 'mostVisited',
        descriptionKey: 'settingsScreenTopDescription',
        defaultEnabled: true
    }
];
var screenLookup = {};
var i;

for(i = 0; i < screenDefs.length; i++) {
    screenLookup[screenDefs[i].id] = screenDefs[i];
}

var state = {
    hiddenTopSites: [],
    pinnedTopSites: [],
    previews: {},
    enabledScreenIds: [],
    editingIndex: -1
};

function msg(key) {
    return chrome.i18n.getMessage(key) || key;
}

function text(node, value) {
    node.textContent = value;
}

function clearNode(node) {
    while(node.firstChild) {
        node.removeChild(node.firstChild);
    }
}

function storageGet(area, keys, callback) {
    chrome.storage[area].get(keys, function(items) {
        callback(items || {});
    });
}

function storageSet(area, values, callback) {
    chrome.storage[area].set(values, function() {
        if(callback) {
            callback();
        }
    });
}

function normalizeUrl(url) {
    var parser;

    url = (url || '').trim();

    if(url && !/^[a-z]+:\/\//i.test(url)) {
        url = 'https://' + url;
    }

    if(!/^https?:\/\//i.test(url)) {
        return '';
    }

    parser = document.createElement('a');
    parser.href = url;
    parser.hash = '';

    return parser.href;
}

function topSiteKey(url) {
    return normalizeUrl(url);
}

function showStatus(message) {
    var status = document.getElementById('status');

    text(status, message);
    status.classList.add('status-visible');

    window.clearTimeout(showStatus.timer);
    showStatus.timer = window.setTimeout(function() {
        status.classList.remove('status-visible');
    }, 2200);
}

function localizePage() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), function(node) {
        text(node, msg(node.getAttribute('data-i18n')));
    });

    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n-title]'), function(node) {
        node.setAttribute('title', msg(node.getAttribute('data-i18n-title')));
    });

    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n-placeholder]'), function(node) {
        node.setAttribute('placeholder',
                          msg(node.getAttribute('data-i18n-placeholder')));
    });

    document.title = msg('settingsTitle');
}

function savePinnedTopSites(callback) {
    var values = {};

    values[PINNED_TOP_SITES_KEY] = state.pinnedTopSites;
    storageSet('sync', values, callback);
}

function saveHiddenTopSites(callback) {
    var values = {};

    values[HIDDEN_TOP_SITES_KEY] = state.hiddenTopSites;
    storageSet('sync', values, callback);
}

function defaultEnabledScreens() {
    var ids;

    if(window.newTabDefaultEnabledScreenIds) {
        ids = window.newTabDefaultEnabledScreenIds();
        if(ids && ids.length) {
            return ids;
        }
    }

    ids = screenDefs.filter(function(screen) {
        return screen.defaultEnabled !== false;
    }).map(function(screen) {
        return screen.id;
    });

    return ids.length ? ids : (screenDefs[0] ? [screenDefs[0].id] : []);
}

function normalizeEnabledScreens(ids) {
    var map = {};
    var enabled;

    enabled = (ids || []).filter(function(id) {
        return !!screenLookup[id];
    });

    if(!enabled.length) {
        enabled = defaultEnabledScreens();
    }

    enabled.forEach(function(id) {
        map[id] = true;
    });

    enabled = screenDefs.filter(function(screen) {
        return map[screen.id];
    }).map(function(screen) {
        return screen.id;
    });

    return enabled.length ? enabled : defaultEnabledScreens();
}

function saveEnabledScreens(callback) {
    var values = {};

    values[ENABLED_SCREENS_KEY] = state.enabledScreenIds.slice();
    storageSet('sync', values, callback);
}

function renderPreviewCount() {
    var count = Object.keys(state.previews || {}).length;

    text(document.getElementById('previewCount'),
         chrome.i18n.getMessage('settingsPreviewCount', [String(count)]) ||
         String(count));
}

function renderScreens() {
    var container = document.getElementById('screenToggles');
    var error = document.getElementById('screenToggleError');

    clearNode(container);
    error.hidden = true;

    state.enabledScreenIds = normalizeEnabledScreens(state.enabledScreenIds);

    screenDefs.forEach(function(screen) {
        var row = document.createElement('label');
        var checkbox = document.createElement('input');
        var textBlock = document.createElement('span');
        var title = document.createElement('strong');
        var desc = document.createElement('span');

        row.className = 'toggle-row';
        checkbox.type = 'checkbox';
        checkbox.checked = state.enabledScreenIds.indexOf(screen.id) !== -1;
        checkbox.setAttribute('data-screen-id', screen.id);

        title.className = 'toggle-title';
        desc.className = 'toggle-desc';

        text(title, msg(screen.titleKey));
        text(desc, msg(screen.descriptionKey || ''));

        textBlock.appendChild(title);
        if(desc.textContent) {
            textBlock.appendChild(desc);
        }

        row.appendChild(checkbox);
        row.appendChild(textBlock);
        container.appendChild(row);

        checkbox.addEventListener('change', function() {
            toggleScreen(screen.id, checkbox.checked, error);
        });
    });
}

function toggleScreen(screenId, enabled, errorNode) {
    var next = state.enabledScreenIds.filter(function(id) {
        return id !== screenId;
    });

    if(enabled) {
        next.push(screenId);
    }

    next = normalizeEnabledScreens(next);

    if(!next.length) {
        errorNode.hidden = false;
        return;
    }

    state.enabledScreenIds = next;
    saveEnabledScreens(function() {
        renderScreens();
        showStatus(msg('settingsSaved'));
    });
}

function createButton(label, className, callback) {
    var button = document.createElement('button');

    button.type = 'button';
    button.className = className;
    text(button, label);
    button.addEventListener('click', callback);

    return button;
}

function createUrlBlock(title, url) {
    var block = document.createElement('div');
    var titleNode = document.createElement('strong');
    var urlNode = document.createElement('span');

    block.className = 'item-main';
    titleNode.className = 'item-title';
    urlNode.className = 'item-url';

    text(titleNode, title || url);
    text(urlNode, url);

    block.appendChild(titleNode);
    block.appendChild(urlNode);

    return block;
}

function renderPinnedTopSites() {
    var list = document.getElementById('pinnedTiles');
    var empty = document.getElementById('emptyPinned');

    clearNode(list);
    empty.hidden = state.pinnedTopSites.length > 0;

    state.pinnedTopSites.forEach(function(site, index) {
        var row = document.createElement('div');
        var actions = document.createElement('div');

        row.className = 'settings-row';
        actions.className = 'item-actions';

        actions.appendChild(createButton(msg('editSite'), 'secondary-button',
            function() {
                openTileForm(index);
            }));
        actions.appendChild(createButton(msg('settingsRemove'), 'danger-button',
            function() {
                removePinnedTopSite(index);
            }));

        row.appendChild(createUrlBlock(site.title, site.url));
        row.appendChild(actions);
        list.appendChild(row);
    });
}

function renderHiddenTopSites() {
    var list = document.getElementById('hiddenTiles');
    var empty = document.getElementById('emptyHidden');
    var restoreAll = document.getElementById('restoreAllHidden');

    clearNode(list);
    empty.hidden = state.hiddenTopSites.length > 0;
    restoreAll.disabled = state.hiddenTopSites.length === 0;

    state.hiddenTopSites.forEach(function(url, index) {
        var row = document.createElement('div');
        var actions = document.createElement('div');

        row.className = 'settings-row';
        actions.className = 'item-actions';

        actions.appendChild(createButton(msg('settingsRestore'), 'secondary-button',
            function() {
                restoreHiddenTopSite(index);
            }));

        row.appendChild(createUrlBlock(url, url));
        row.appendChild(actions);
        list.appendChild(row);
    });
}

function render() {
    renderScreens();
    renderPinnedTopSites();
    renderHiddenTopSites();
    renderPreviewCount();
}

function closeTileForm() {
    var form = document.getElementById('tileForm');

    state.editingIndex = -1;
    form.hidden = true;
    form.reset();
}

function openTileForm(index) {
    var form = document.getElementById('tileForm');
    var site = index >= 0 ? state.pinnedTopSites[index] : null;

    state.editingIndex = typeof index === 'number' ? index : -1;
    document.getElementById('tileTitle').value = site ? site.title : '';
    document.getElementById('tileUrl').value = site ? site.url : '';
    form.hidden = false;
    document.getElementById('tileTitle').focus();
}

function isDuplicatePinnedUrl(url, ignoreIndex) {
    return state.pinnedTopSites.some(function(site, index) {
        return index !== ignoreIndex && topSiteKey(site.url) === url;
    });
}

function saveTile(event) {
    var title = document.getElementById('tileTitle').value.trim();
    var url = topSiteKey(document.getElementById('tileUrl').value);
    var index = state.editingIndex;
    var original = index >= 0 ? state.pinnedTopSites[index] : null;

    event.preventDefault();

    if(!url) {
        showStatus(msg('settingsInvalidUrl'));
        return;
    }

    if(isDuplicatePinnedUrl(url, index)) {
        showStatus(msg('settingsDuplicateUrl'));
        return;
    }

    if(index >= 0) {
        state.pinnedTopSites[index] = {
            title: title || url,
            url: url,
            custom: !!original.custom,
            sourceUrl: original.sourceUrl || ''
        };
    } else {
        state.pinnedTopSites.push({
            title: title || url,
            url: url,
            custom: true,
            sourceUrl: ''
        });
    }

    savePinnedTopSites(function() {
        closeTileForm();
        renderPinnedTopSites();
        showStatus(msg('settingsSaved'));
    });
}

function removePinnedTopSite(index) {
    var site = state.pinnedTopSites[index];
    var sourceKey = topSiteKey(site && site.sourceUrl);

    if(!site) {
        return;
    }

    state.pinnedTopSites.splice(index, 1);

    if(sourceKey) {
        state.hiddenTopSites = state.hiddenTopSites.filter(function(url) {
            return topSiteKey(url) !== sourceKey;
        });
    }

    savePinnedTopSites(function() {
        saveHiddenTopSites(function() {
            render();
            showStatus(msg('settingsSaved'));
        });
    });
}

function restoreHiddenTopSite(index) {
    state.hiddenTopSites.splice(index, 1);

    saveHiddenTopSites(function() {
        renderHiddenTopSites();
        showStatus(msg('settingsSaved'));
    });
}

function restoreAllHiddenTopSites() {
    state.hiddenTopSites = [];

    saveHiddenTopSites(function() {
        renderHiddenTopSites();
        showStatus(msg('settingsSaved'));
    });
}

function clearPreviews() {
    chrome.storage.local.remove(TOP_SITE_PREVIEWS_KEY, function() {
        state.previews = {};
        renderPreviewCount();
        showStatus(msg('settingsCleared'));
    });
}

function loadState(callback) {
    storageGet('sync', [HIDDEN_TOP_SITES_KEY, PINNED_TOP_SITES_KEY],
        function(syncItems) {
            storageGet('local', [TOP_SITE_PREVIEWS_KEY], function(localItems) {
                storageGet('sync', [ENABLED_SCREENS_KEY], function(screenItems) {
                    state.hiddenTopSites = syncItems[HIDDEN_TOP_SITES_KEY] || [];
                    state.pinnedTopSites = syncItems[PINNED_TOP_SITES_KEY] || [];
                    state.previews = localItems[TOP_SITE_PREVIEWS_KEY] || {};
                    state.enabledScreenIds = screenItems[ENABLED_SCREENS_KEY] ||
                        defaultEnabledScreens();
                    callback();
                });
            });
        });
}

function bindEvents() {
    document.getElementById('addTile').addEventListener('click', function() {
        openTileForm(-1);
    });
    document.getElementById('cancelTile').addEventListener('click', closeTileForm);
    document.getElementById('tileForm').addEventListener('submit', saveTile);
    document.getElementById('restoreAllHidden')
        .addEventListener('click', restoreAllHiddenTopSites);
    document.getElementById('clearPreviews').addEventListener('click', clearPreviews);
}

function init() {
    localizePage();
    bindEvents();
    loadState(render);
}

window.addEventListener('DOMContentLoaded', init, true);
