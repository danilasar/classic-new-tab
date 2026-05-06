'use strict';

(function (root) {
    var screens = [
        {
            id: 'apps',
            titleKey: 'appsTab',
            descriptionKey: 'settingsScreenAppsDescription',
            templateUrl: 'js/partials/screen-apps.html',
            defaultEnabled: true
        },
        {
            id: 'top',
            titleKey: 'mostVisited',
            descriptionKey: 'settingsScreenTopDescription',
            templateUrl: 'js/partials/screen-top-sites.html',
            defaultEnabled: true
        }
    ];

    function screenIds(filterFn) {
        return screens.filter(filterFn || function() {
            return true;
        }).map(function(screen) {
            return screen.id;
        });
    }

    root.newTabScreens = screens;
    root.newTabScreenIds = function() {
        return screenIds();
    };
    root.newTabDefaultEnabledScreenIds = function() {
        var ids = screenIds(function(screen) {
            return screen.defaultEnabled !== false;
        });

        return ids.length ? ids : screenIds(function() {
            return true;
        }).slice(0, 1);
    };
    root.newTabScreenById = function(id) {
        var i;

        for(i = 0; i < screens.length; i++) {
            if(screens[i].id === id) {
                return screens[i];
            }
        }

        return null;
    };
}(window));
