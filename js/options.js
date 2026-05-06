'use strict';
/*global chrome*/

var HIDDEN_TOP_SITES_KEY = 'old_ntp.hidden_top_sites';
var PINNED_TOP_SITES_KEY = 'old_ntp.pinned_top_sites';
var TOP_SITE_PREVIEWS_KEY = 'old_ntp.top_site_previews';
var LEGACY_KEYS = ['syncOptions', 'showWelcome', 'url'];

var state = {
    hiddenTopSites: [],
    pinnedTopSites: [],
    previews: {},
    legacyOptions: {
        syncOptions: false,
        showWelcome: true,
        url: ''
    },
    editingIndex: -1
};

var legacyCustomPages = {
    'New Tab Redirect Apps': ''
};

var legacyChromePages = {
    Apps: 'chrome://apps/',
    Extensions: 'chrome://extensions/',
    History: 'chrome://history/',
    Downloads: 'chrome://downloads/',
    Bookmarks: 'chrome://bookmarks/',
    Internals: 'chrome://net-internals'
};

var legacyAboutPages = {
    'about:blank': 'about:blank',
    'about:version': 'about:version',
    'about:plugins': 'about:plugins',
    'about:cache': 'about:cache',
    'about:memory': 'about:memory',
    'about:histograms': 'about:histograms',
    'about:dns': 'about:dns',
    'about:terms': 'about:terms',
    'about:credits': 'about:credits',
    'about:net-internals': 'about:net-internals'
};

var legacyPopularPages = {
    'Google+': 'https://plus.google.com',
    Facebook: 'https://www.facebook.com',
    Twitter: 'https://twitter.com',
    Yahoo: 'https://www.yahoo.com',
    Wikipedia: 'http://www.wikipedia.org',
    Digg: 'http://digg.com',
    Delicious: 'https://delicious.com',
    Slashdot: 'http://www.slashdot.org'
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

function legacyUrlPasses(url) {
    var protocols = [
        'http://',
        'https://',
        'about:',
        'file://',
        'file:\\',
        'file:///',
        'chrome://',
        'chrome-internal://',
        'chrome-extension://'
    ];
    var i;

    if(!url) {
        return true;
    }

    for(i = 0; i < protocols.length; i++) {
        if(url.indexOf(protocols[i]) === 0) {
            return true;
        }
    }

    return false;
}

function normalizeLegacyUrl(url) {
    var parts;

    url = (url || '').trim();

    if(!url) {
        return '';
    }

    if(legacyUrlPasses(url) && url.length > 8) {
        return url;
    }

    parts = url.split('://');
    if(parts.length > 1) {
        return 'http://' + parts[1];
    }

    return 'http://' + url;
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

function renderPreviewCount() {
    var count = Object.keys(state.previews || {}).length;

    text(document.getElementById('previewCount'),
         chrome.i18n.getMessage('settingsPreviewCount', [String(count)]) ||
         String(count));
}

function renderLegacyOptions() {
    document.getElementById('legacyUrl').value = state.legacyOptions.url || '';
    document.getElementById('legacySync').checked =
        state.legacyOptions.syncOptions !== undefined ?
            !!state.legacyOptions.syncOptions : false;
    document.getElementById('legacyShowWelcome').checked =
        state.legacyOptions.showWelcome !== undefined ?
            !!state.legacyOptions.showWelcome : true;
}

function createQuickLink(label, url) {
    return createButton(label || msg('settingsOriginalNewTab'), 'secondary-button',
        function() {
            document.getElementById('legacyUrl').value = url || '';
            saveLegacyOptions();
        });
}

function renderQuickLinks(containerId, pages) {
    var container = document.getElementById(containerId);

    clearNode(container);

    Object.keys(pages).forEach(function(label) {
        container.appendChild(createQuickLink(label, pages[label]));
    });
}

function renderLegacyQuickLinks() {
    renderQuickLinks('legacyCustomPages', legacyCustomPages);
    renderQuickLinks('legacyChromePages', legacyChromePages);
    renderQuickLinks('legacyAboutPages', legacyAboutPages);
    renderQuickLinks('legacyPopularPages', legacyPopularPages);
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
    renderLegacyOptions();
    renderLegacyQuickLinks();
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

function readLegacyOptionsFromForm() {
    return {
        url: normalizeLegacyUrl(document.getElementById('legacyUrl').value),
        syncOptions: document.getElementById('legacySync').checked,
        showWelcome: document.getElementById('legacyShowWelcome').checked
    };
}

function saveLegacyOptions(event) {
    var values;

    if(event) {
        event.preventDefault();
    }

    values = readLegacyOptionsFromForm();
    state.legacyOptions = values;

    storageSet('local', values, function() {
        if(values.syncOptions) {
            storageSet('sync', values, function() {
                renderLegacyOptions();
                showStatus(msg('settingsSaved'));
            });
            return;
        }

        renderLegacyOptions();
        showStatus(msg('settingsSaved'));
    });
}

function restoreLegacyOptions() {
    storageGet('local', LEGACY_KEYS, function(items) {
        state.legacyOptions = {
            url: items.url || '',
            syncOptions: items.syncOptions !== undefined ?
                !!items.syncOptions : false,
            showWelcome: items.showWelcome !== undefined ?
                !!items.showWelcome : true
        };
        renderLegacyOptions();
    });
}

function loadLegacySyncOptions() {
    storageGet('sync', LEGACY_KEYS, function(items) {
        if(items.url !== undefined) {
            state.legacyOptions = {
                url: items.url || '',
                syncOptions: true,
                showWelcome: items.showWelcome !== undefined ?
                    !!items.showWelcome : true
            };
            renderLegacyOptions();
            saveLegacyOptions();
        }
    });
}

function loadState(callback) {
    storageGet('sync', [HIDDEN_TOP_SITES_KEY, PINNED_TOP_SITES_KEY],
        function(syncItems) {
            storageGet('local', [TOP_SITE_PREVIEWS_KEY], function(localItems) {
                storageGet('local', LEGACY_KEYS, function(legacyItems) {
                    state.hiddenTopSites = syncItems[HIDDEN_TOP_SITES_KEY] || [];
                    state.pinnedTopSites = syncItems[PINNED_TOP_SITES_KEY] || [];
                    state.previews = localItems[TOP_SITE_PREVIEWS_KEY] || {};
                    state.legacyOptions = {
                        url: legacyItems.url || '',
                        syncOptions: legacyItems.syncOptions !== undefined ?
                            !!legacyItems.syncOptions : false,
                        showWelcome: legacyItems.showWelcome !== undefined ?
                            !!legacyItems.showWelcome : true
                    };
                    callback();
                });
            });
        });
}

function bindEvents() {
    document.getElementById('legacyForm')
        .addEventListener('submit', saveLegacyOptions);
    document.getElementById('legacyCancel')
        .addEventListener('click', restoreLegacyOptions);
    document.getElementById('legacyLoadSync')
        .addEventListener('click', loadLegacySyncOptions);
    document.getElementById('legacySync')
        .addEventListener('change', saveLegacyOptions);
    document.getElementById('legacyShowWelcome')
        .addEventListener('change', saveLegacyOptions);
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
