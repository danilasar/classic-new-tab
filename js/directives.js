'use strict';
/*global chrome*/
var directives = angular.module('newTab.directives', []);

['dragstart', 'dragover', 'dragleave', 'drop', 'dragend'].forEach(function(eventName) {
    var directiveName = 'ont' + eventName.charAt(0).toUpperCase() +
        eventName.slice(1);

    directives.directive(directiveName, ['$parse', function($parse) {
        return {
            restrict: 'A',
            link: function($scope, $element, $attrs) {
                var handler = $parse($attrs[directiveName]);

                $element.bind(eventName, function(event) {
                    $scope.$apply(function() {
                        handler($scope, {
                            $event: event
                        });
                    });
                });
            }
        };
    }]);
});

directives.directive('chromeApp', function(){
    return {
        // element only
        restrict: 'E',

        // app: http://developer.chrome.com/extensions/management#type-ExtensionInfo
        scope: {
            app: '='
        },

        // replace the directive html with template html
        replace: true,

        // use the html in this template
        templateUrl: 'js/partials/application.html'
    };
});

directives.directive('chromeLaunch', ['$log', 'Apps', function($log, Apps){
    return {
        // attribute only
        restrict: 'A',

        scope: {
            app: '=chromeLaunch'
        },

        link: function($scope, $element, $attrs) {
            if($scope.app){
                $element.bind('click', function(e){
                    var url;

                    e.preventDefault();

                    if($scope.app.type === 'packaged_app') {
                        Apps.launch($scope.app.id)
                            .then(function(){
                                $log.debug("launched app id %s", $scope.app.id);
                            });
                    } else {
                        url = Apps.appUrl($scope.app);
                        if(url) {
                            Apps.navigate(url)
                                .then(function(){
                                    $log.debug("opened app id %s", $scope.app.id);
                                });
                        } else {
                            Apps.launch($scope.app.id)
                                .then(function(){
                                    $log.debug("launched app id %s", $scope.app.id);
                                });
                        }
                    }
                });
            }
        }
    };
}]);

directives.directive('chromePinned', ['$log', 'Apps', function($log, Apps){
    return {
        // attribute only
        restrict: 'A',

        scope: {
            app: '=chromePinned'
        },

        link: function($scope, $element, $attrs) {
            if($scope.app){
                $element.bind('click', function(e){
                    var url = Apps.appUrl($scope.app);

                    e.preventDefault();
                    if(url) {
                        Apps.pinned(url)
                            .then(function(tab){
                                $log.debug("Opened app id %s in pinned tab #%d", $scope.app.id, tab.id);
                            });
                    }
                });
            }
        }
    };
}]);

directives.directive('chromeNewTab', ['$log', 'Apps', function($log, Apps){
    return {
        // attribute only
        restrict: 'A',

        scope: {
            app: '=chromeNewTab'
        },

        link: function($scope, $element, $attrs) {
            if($scope.app){
                $element.bind('click', function(e){
                    var url = Apps.appUrl($scope.app);

                    e.preventDefault();
                    if(url) {
                        Apps.tab(url)
                            .then(function(tab){
                                $log.debug("Opened app id %s in tab #%d", $scope.app.id, tab.id);
                            });
                    }
                });
            }
        }
    };
}]);

directives.directive('chromeNewWindow', ['$log', 'Apps', function($log, Apps){
    return {
        // attribute only
        restrict: 'A',

        scope: {
            app: '=chromeNewWindow'
        },

        link: function($scope, $element, $attrs) {
            if($scope.app){
                $element.bind('click', function(e){
                    var url = Apps.appUrl($scope.app);

                    e.preventDefault();
                    if(url) {
                        Apps.newWindow(url)
                            .then(function(win){
                                $log.debug("Opened app id %s in window #%d", $scope.app.id, win.id);
                            });
                    }
                });
            }
        }
    };
}]);

directives.directive('chromeOptions', ['$log', 'Apps', function($log, Apps){
    return {
        // attribute only
        restrict: 'A',

        scope: {
            app: '=chromeOptions'
        },

        link: function($scope, $element, $attrs) {
            if($scope.app){
                $element.bind('click', function(e){
                    e.preventDefault();
                    if($scope.app.optionsUrl) {
                        Apps.tab($scope.app.optionsUrl)
                            .then(function(tab){
                                $log.debug("Opened options for app id %s in tab #%d", $scope.app.id, tab.id);
                            });
                    }
                });
            }
        }
    };
}]);

directives.directive('chromeUninstall', ['$log', 'Apps', function($log, Apps){
    return {
        // attribute only
        restrict: 'A',

        scope: {
            id: '=chromeUninstall'
        },

        link: function($scope, $element, $attrs) {
            if($scope.id){
                $element.bind('click', function(e){
                    e.preventDefault();
                    Apps.uninstall($scope.id)
                        .then(function(){
                            $log.debug("Uninstalled app id %s", $scope.id);
                        });
                });
            }
        }
    };
}]);
