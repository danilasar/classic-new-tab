'use strict';

(function(root) {
    function noop() {}

    function clampPageIndex(pageIndex, pageCount) {
        pageCount = Math.max(1, pageCount || 1);
        pageIndex = Number(pageIndex) || 0;

        return Math.max(0, Math.min(pageIndex, pageCount - 1));
    }

    function buildPages(activeIndex, pageCount) {
        var pages = [];
        var included = {};
        var i;
        var previousIndex = -1;

        pageCount = Math.max(1, pageCount || 1);
        activeIndex = clampPageIndex(activeIndex, pageCount);

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

    function getPage(items, pageIndex, pageSize) {
        var pageCount;
        var start;

        items = items || [];
        pageSize = Math.max(1, pageSize || items.length || 1);
        pageCount = Math.max(1, Math.ceil(items.length / pageSize));
        pageIndex = clampPageIndex(pageIndex, pageCount);
        start = pageIndex * pageSize;

        return {
            items: items.slice(start, start + pageSize),
            pageCount: pageCount,
            pageIndex: pageIndex,
            pages: buildPages(pageIndex, pageCount),
            start: start
        };
    }

    function create(config) {
        var actions;
        var pagination;

        config = config || {};
        actions = config.actions || {};
        pagination = config.pagination || {};

        return {
            back: config.back || {},
            toolbar: config.toolbar || {},
            breadcrumbs: config.breadcrumbs || [],
            actions: {
                addBookmark: actions.addBookmark || {},
                addFolder: actions.addFolder || {}
            },
            buttons: config.buttons || [],
            pagination: {
                hasNext: !!pagination.hasNext,
                hasPrevious: !!pagination.hasPrevious,
                nextTitle: pagination.nextTitle || '',
                pages: pagination.pages || [],
                previousTitle: pagination.previousTitle || '',
                show: !!pagination.show
            },
            tileStrategy: config.tileStrategy || {
                name: config.tileMode || 'grid'
            },
            handlers: config.handlers || {},
            on: function(name) {
                return this.handlers[name] || noop;
            }
        };
    }

    root.PagedPanel = {
        buildPages: buildPages,
        clampPageIndex: clampPageIndex,
        create: create,
        getPage: getPage
    };
}(window));
