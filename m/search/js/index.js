var validCategories = ["web", "images", "video", "news"];

$.urlParam = function(name){
    // parsing the query string to return the value for a certain key
    var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
    if (!results) {
        return '';
    }
    var result = results[1].replace('/', '').replace(/\+/g, '%20');
    return decodeURIComponent(result);
}

function htmlEscape(str) {
    // Thanks to: https://stackoverflow.com/a/7124052
    return str
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function resetSearch() {
    resetSearchContainers();
    var newUrl = window.location.origin;
    window.history.pushState('', 'mcent Search', newUrl);
}

function resetSearchContainers() {
    // clear out the old search results
    $("#allSearchResults").empty();
    $("#allSearchResults").append(
        "<div id='topResults' hidden></div>" +
        "<div id='mainResults' hidden></div>" +
        "<div id='bottomResults' hidden></div>" +
        "<div id='relatedResults' hidden></div>" +
        "<div id='pagination'></div>"
    );
}

function generateInfospaceAccessId(placement) {
    switch (placement) {
      case 'homepage':
          return 'jana.jana3';
      case 'banner':
          return 'jana.jana4';
      case 'homepage_in':
          return 'jana.jana5';
      case 'banner_in':
          return 'jana.jana6';
      default:
          return 'jana.jana1';
    }

}

function getInfospaceAccessId() {
    return _MCENT_EXPERIMENTS.infospaceAccessId;
}

function searchRequest(query, category, page) {
    page = parseInt(page);
    if (!Number.isInteger(page)) {
        page = 1;
    }

    if ($.inArray(category, validCategories) < 0) {
        category = "web";
    }

    $.ajax({
        type: "POST",
        url: "https://browser.mcent.com/get_infospace_signature",
        data: {query_term: query},
        success: function (data) {
            var signature = data.signature;
            if (signature === null || signature.length === 0) {
                resetSearch();
                return;
            }

            resetSearchContainers();
            insp.search.doSearch({
                query: query,
                accessId: getInfospaceAccessId(),
                signature: signature,
                page: page,
                country: readCookie('country'),
                linkTarget: '_top',
                containers: {
                    top: {id:'topResults'},
                    main: {id:'mainResults'},
                    bottom: {id:'bottomResults'},
                    related: {id:'relatedResults'}
                },
                category: category,
                searchUrlFormat: '/?q={searchTerm}',
                onComplete: function(details) {
                    // basic pagination logic
                    var maxPagesToShow = 10;
                    var paginationHtml = "";
                    var start, count = 0;
                    if (page < 6) {
                        start = 1;
                        count = Math.min(maxPagesToShow, details.maxAlgoPage)
                    } else if (details.maxAlgoPage - page < 5) {
                        start = details.maxAlgoPage - maxPagesToShow + 1;
                        count = details.maxAlgoPage;
                    } else {
                        start = page - 4;
                        count = page + 5;
                    }
                    for (var i = start; i <= count; ++i) {
                        var extra = '';
                        if (page === i) {
                            extra = ' class="current-page"';
                        }
                        var link = '  <a href="/?q=' + query + '&page=' + i + '&category=' + category + '"' + extra + '>' + i + '</a>';
                        paginationHtml = paginationHtml + link;
                    }
                    $('#pagination').html(paginationHtml);

                    if (details.topResultCount > 0) {
                        $('#topResults').prepend("<div class='ad-section-title'>Ads related to: " + htmlEscape(query) + "</div>");
                        $('#topResults').show();
                    }
                    if (details.mainResultCount > 0) {
                        $('#mainResults').prepend("<div class='search-result-title'>Search results</div>");
                        $('#mainResults').show();
                    }
                    if (details.bottomResultCount > 0) {
                        $('#bottomResults').prepend("<div class='ad-section-title'>Ads related to: " + htmlEscape(query) + "</div>");
                        $('#bottomResults').show();
                    }
                    if (details.relatedResultCount > 0) {
                        $('#relatedResults').prepend("<div class='search-result-title'>Related searches</div>");
                        $('#relatedResults').show();
                    }
                }
            });
            $('#blank-search-top').hide(200);
            $('#popular-searches').hide();
            if ($('#category-tabs').is(':hidden')) {
                activateTab(category);
            }
        }
    });
}

function doSearch() {
    var category = findActiveTab();
    doSearchForCategory(category);
}

function doSearchForCategory(category) {
    // this is needed to get rid of the soft keyboard on android
    $('#search-text').blur();

    // get the query term from the search input field
    var query = $("#search-text").val();

    if (query.length > 0) {
        // modify the url to reflect the new search
        var newUrl = (
            window.location.origin +
            "?q=" + encodeURIComponent(query) +
            '&page=1' +
            '&category=' + category
        );
        window.history.pushState('', 'mcent Search', newUrl);
        // execute the search
        searchRequest(query, category, 1);
    } else {
        resetSearch();
    }
}

function findActiveTab() {
    return $('#category-tabs').find('.tabs').find('.active').attr('id').replace('Tab', '');
}

function initialzePopularSearches() {
    $.ajax({
        type: "GET",
        url: "https://browser.mcent.com/get_suggested_searches",
        success: function (data) {
            var terms = data.suggested_searches;
            if (!terms || terms.length === 0) {
                return;
            }

            $.each(terms, function(_, term) {
                $("#search-term-container").append(
                    "<a class='popular-search-term' href='/?q=" + encodeURIComponent(term) + "'>" + htmlEscape(term) + "</a>"
                );
            });
            $('#popular-searches').show();
        }
    });
}

function activateTab(category) {
    // currently disabled
   return;
    $("#category-tabs").show();
    var tabId = category + 'Tab';
    $('#category-tabs').find('.tab').each(function() {
        $(this).find('a').removeClass('active');
        if ($(this).find('a').attr('id') === tabId) {
            $(this).find('a').addClass('active');
        }
    });
    $('#category-tabs').find('ul.tabs').tabs();
}

function createCookie(name,value,days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + value + expires + "; path=/";
}

function readCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for (var i=0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') {
            c = c.substring(1,c.length);
        }
        if (c.indexOf(nameEQ) == 0) {
            return c.substring(nameEQ.length,c.length);
        }
    }
    return null;
}

function eraseCookie(name) {
    createCookie(name,"",-1);
}

$(document).ready(function() {
    // get query, page, category from query string
    var query = $.urlParam('q');
    var page = $.urlParam('page');
    var category = $.urlParam('category');
    var country = $.urlParam('country');
    // use cookie to store the country
    if (country.length == 2) {
        createCookie('country', country.toLowerCase(), 100);
    }
    var placement = $.urlParam('placement');

    // initialize category selection
    if ($.inArray(category, validCategories) < 0) {
        category = 'web';
    }
    // TODO:mj:2017-08-08:Use a cookie for experiments.
    _MCENT_EXPERIMENTS = {
        infospaceAccessId: generateInfospaceAccessId(placement)
    };

    // if query is specified, fetch results
    if (query.length > 0) {
        // set search inbox to be the specified query
        $("#landing-search").show();
        activateTab(category);
        $('#search-text').val(query);
        searchRequest(query, category, page);
    } else {
        $("#blank-search-top").show();
        $("#landing-search").show();
        initialzePopularSearches();
    }
});