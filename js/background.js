'use strict';
/*global chrome*/

var TOP_SITE_PREVIEWS_KEY = 'old_ntp.top_site_previews';
var HIDDEN_TOP_SITES_KEY = 'old_ntp.hidden_top_sites';
var PINNED_TOP_SITES_KEY = 'old_ntp.pinned_top_sites';
var PREVIEW_WIDTH = 300;
var PREVIEW_HEIGHT = 200;
var CAPTURE_DELAY = 1500;
var MAX_LOADING_RETRIES = 12;
var captureTimers = {};
var loadingRetries = {};

function canonicalUrl(url) {
    if(!/^https?:\/\//.test(url || '')) {
        return '';
    }

    var parser = document.createElement('a');
    parser.href = url;
    parser.hash = '';

    return parser.href;
}

function shouldCaptureTab(tab) {
    return tab && tab.active && tab.status === 'complete' && canonicalUrl(tab.url);
}

function shouldWaitForTab(tab) {
    return tab && tab.active && tab.status === 'loading' && canonicalUrl(tab.url);
}

function getPreviewKey(url) {
    return canonicalUrl(url);
}

function getVisibleTileKeys(callback) {
    chrome.storage.sync.get([HIDDEN_TOP_SITES_KEY, PINNED_TOP_SITES_KEY],
        function(settings) {
            chrome.topSites.get(function(sites) {
                var hiddenSites = settings[HIDDEN_TOP_SITES_KEY] || [];
                var pinnedSites = settings[PINNED_TOP_SITES_KEY] || [];
                var hiddenKeys = {};
                var tileKeys = {};

                hiddenSites.forEach(function(url) {
                    var key = getPreviewKey(url);
                    if(key) {
                        hiddenKeys[key] = true;
                    }
                });

                pinnedSites.forEach(function(site) {
                    var key = getPreviewKey(site.url);
                    if(key) {
                        tileKeys[key] = true;
                    }
                });

                sites.forEach(function(site) {
                    var key = getPreviewKey(site.url);
                    if(key && !hiddenKeys[key]) {
                        tileKeys[key] = true;
                    }
                });

                callback(tileKeys);
            });
        });
}

function isVisibleTile(url, callback) {
    var key = getPreviewKey(url);

    if(!key) {
        callback(false);
        return;
    }

    getVisibleTileKeys(function(tileKeys) {
        callback(!!tileKeys[key]);
    });
}

function resizePreview(dataUrl, callback) {
    var image = new Image();

    image.onload = function() {
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        var sourceRatio = image.width / image.height;
        var targetRatio = PREVIEW_WIDTH / PREVIEW_HEIGHT;
        var sourceWidth = image.width;
        var sourceHeight = image.height;
        var sourceX = 0;
        var sourceY = 0;

        if(sourceRatio > targetRatio) {
            sourceWidth = image.height * targetRatio;
            sourceX = (image.width - sourceWidth) / 2;
        } else {
            sourceHeight = image.width / targetRatio;
            sourceY = (image.height - sourceHeight) / 2;
        }

        canvas.width = PREVIEW_WIDTH;
        canvas.height = PREVIEW_HEIGHT;
        context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight,
                          0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);

        callback(canvas.toDataURL('image/jpeg', 0.72));
    };

    image.onerror = function() {
        callback(dataUrl);
    };

    image.src = dataUrl;
}

function savePreview(url, dataUrl) {
    var key = getPreviewKey(url);

    if(!key) {
        return;
    }

    chrome.storage.local.get([TOP_SITE_PREVIEWS_KEY], function(result) {
        var previews = result[TOP_SITE_PREVIEWS_KEY] || {};

        previews[key] = {
            image: dataUrl,
            updatedAt: Date.now()
        };

        getVisibleTileKeys(function(tileKeys) {
            Object.keys(previews).forEach(function(previewKey) {
                if(!tileKeys[previewKey]) {
                    delete previews[previewKey];
                }
            });

            var obj = {};
            obj[TOP_SITE_PREVIEWS_KEY] = previews;
            chrome.storage.local.set(obj);
        });
    });
}

function captureTab(tab) {
    if(!shouldCaptureTab(tab)) {
        return;
    }

    isVisibleTile(tab.url, function(found) {
        if(!found) {
            return;
        }

        chrome.tabs.captureVisibleTab(tab.windowId, {
            format: 'jpeg',
            quality: 65
        }, function(dataUrl) {
            if(chrome.runtime.lastError || !dataUrl) {
                return;
            }

            resizePreview(dataUrl, function(previewDataUrl) {
                savePreview(tab.url, previewDataUrl);
            });
        });
    });
}

function scheduleCapture(tabId) {
    clearTimeout(captureTimers[tabId]);

    captureTimers[tabId] = setTimeout(function() {
        delete captureTimers[tabId];

        chrome.tabs.get(tabId, function(tab) {
            if(chrome.runtime.lastError) {
                return;
            }

            if(shouldWaitForTab(tab)) {
                loadingRetries[tabId] = (loadingRetries[tabId] || 0) + 1;

                if(loadingRetries[tabId] <= MAX_LOADING_RETRIES) {
                    scheduleCapture(tabId);
                } else {
                    delete loadingRetries[tabId];
                }

                return;
            }

            delete loadingRetries[tabId];
            captureTab(tab);
        });
    }, CAPTURE_DELAY);
}

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if((changeInfo.status === 'complete' && shouldCaptureTab(tab)) ||
       (changeInfo.status === 'loading' && shouldWaitForTab(tab))) {
        scheduleCapture(tabId);
    }
});

chrome.tabs.onActivated.addListener(function(activeInfo) {
    scheduleCapture(activeInfo.tabId);
});
