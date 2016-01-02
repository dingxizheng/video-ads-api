angular.module('starter.controllers', [])

.controller('AppCtrl', function($scope, Flash, Loading) {
    $scope.loading = Loading;
    $scope.flash = Flash;
})

// Menu Controller
.controller('MenuCtrl', function($scope, $injector, $state, Auth, Session, $cordovaInAppBrowser, $ionicActionSheet, reloadedSession) {
    $scope.lang = $injector.get('englishLang');

    $scope.goToProfile = '#/app/loginas';
    $scope.goToStore = '#/app/loginas?jump_to=' + encodeURIComponent('/app/store');
    $scope.logoImage = false;

    if (Session.user().id) {
        $scope.isLoggedin = true;
        Session.user().logo && ($scope.logoImage = Session.user().logo.thumb_url);
        $scope.goToProfile = '#/app/users/' + Session.user().id;
        $scope.goToStore = '#/app/store';
    }

    var options = {
      location: 'yes',
      clearcache: 'yes',
      toolbar: 'yes'
    };

    $scope.openlink = function(link) {
        $cordovaInAppBrowser.open(link, '_system', options)
              .then(function(event) {
                // success
              })
              .catch(function(event) {
                // error
              });
    };

    Auth.onLoggedIn(function() {
        $scope.isLoggedin = true;
        $scope.goToProfile = '#/app/users/' + Session.user().id;
        $scope.goToStore = '#/app/store';
        if (Session.user().logo) {
            $scope.logoImage = Session.user().logo.thumb_url;
        }
    });

    Auth.onLoggedOut(function() {
        $scope.isLoggedin = false;
        $scope.goToProfile = '#/app/loginas';
        $scope.goToStore = '#/app/loginas?jump_to=' + encodeURIComponent('/app/store');
        $scope.logoImage = false;
    });

    $scope.logout = function() {
        Auth.logout();
    };

    var socialButtons = [
        {
            text: 'Twitter',
            link: 'https://twitter.com/vicinitydeals',
            icon: 'icon fa fa-twitter-square',
        },{
            text: 'Facebook',
            link: 'https://www.facebook.com/vicinitydeals',
            icon: 'icon fa fa-facebook-square',        
        }, {
            text: 'Instagram',
            link: 'https://instagram.com/vicinitydeals/',
            icon: 'icon fa fa-instagram'          
        }
    ];

    $scope.goToSocialPage = function() {
        $ionicActionSheet.show({
            buttons: function() {
                if(/Android/.test(navigator.userAgent)){
                    return socialButtons.map(function(b) { b.text = '<i class="'+ b.icon +'"></i> ' + b.text; return b; });
                }
                else
                    return socialButtons;
            }(),
            titleText:  'Go to our page on',
            cancelText: 'Cancel',
            buttonClicked: function(index) {
                $scope.openlink(socialButtons[index].link);
                return true;
            }
        });
    };

})

// Browse all ccategories.
.controller('BrowseCtrl', function($scope, $injector, $ionicActionSheet, $ionicSideMenuDelegate, Catagory, AutoSuggest, SearchParams, $location) {

    $scope.toggleLeft = function(){ $ionicSideMenuDelegate.toggleLeft(); };
    $scope.lang = $injector.get('englishLang');

    $scope.rows = [];

    $scope.goToCategory = function(category) {
        $location.path('/app/category').search('category_id', category.id).search('title', category.name);
    };

    $scope.autoSuggest = function() {

        AutoSuggest.init($scope, {

            query: SearchParams.get().query

        }, function(query) {
            SearchParams.reset();
            SearchParams.set('type', 'promotion');
            SearchParams.set('query', query);
            console.log('SEARCH GO >>>>', 'browse');
            SearchParams.search();
            $location.path('app/search');
        })
        .then(function() {
            AutoSuggest.show();
        });
    };

    var categoryAll = {
        name: 'All',
        id: 'all',
        icon: {
            image_url: 'img/All.png'
        }
    };

    Catagory.query({ sortBy: 'name' }).$promise.then(function(catagorys) {
        
        catagorys.unshift(categoryAll);
        var other_index = 0;
        catagorys.forEach(function(v, i) { if(v.name === 'Other')  other_index = i; });
        var tem_other = catagorys[other_index];
        catagorys[other_index] = catagorys[catagorys.length - 1];
        catagorys[catagorys.length - 1] = tem_other;
       $scope.rows = Array.apply(null, Array(Math.ceil(catagorys.length / 3))).map(function (v, i) {
            var row = catagorys.slice(i * 3, i * 3 + 3);
            while(row.length < 3)
                row.push('placeholder')
            return row;
       });

    });

})

.controller('CategoryCtrl', function($scope, $injector, RuntimeStorage, categoryId, title, $ionicActionSheet, $ionicSlideBoxDelegate, $ionicSideMenuDelegate, $localstorage, $location, Promotion, SearchParams, AutoSuggest, _) {

    var settings = $localstorage.getObject('searchSettings');

    var storedData = RuntimeStorage.get('catagory_' + categoryId);

    $scope.initData = function() {
        storedData.page = 1;
        storedData.per_page = 8;
        storedData.settings = settings;
        storedData.rawResult =  [];
        storedData.ads = [];
        storedData.haveMore = true;
        storedData.sortBy = 'distance';
    };

    if (!storedData.rawResult) {
        $scope.initData();
    }

    $scope.toggleLeft = function(){ $ionicSideMenuDelegate.toggleLeft(); };
    
    $scope.lang = $injector.get('englishLang');

    $scope.title = title || 'Deals';

    $scope.ads = [];

    $scope.rows = [];

    $scope.haveMore = storedData.haveMore;

    var loadMoreBtn = {
        id: 'loadmore',
        title: 'Load More'
    };

    $scope.goToDeal = function(deal) {
        if(deal.id === 'loadmore') {
            $scope.loadNext();
        } else {
            $location.path('app/promotions/' + deal.id)
        }
    };

    $scope.processRawdata = function(data) {
        // if the last ele is 'loadmore' then delete it
        if (_.last(storedData.rawResult) && _.last(storedData.rawResult).id === 'loadmore') {
            storedData.rawResult.pop();
        }
        // store the data
        storedData.rawResult = storedData.rawResult.concat(data || []); 
        storedData.haveMore && storedData.rawResult.push(loadMoreBtn);

        var restResult = [];
        $scope.ads = storedData.ads;
        if ($scope.ads.length < 3) {
            restResult = _.rest(storedData.rawResult, 3 - $scope.ads.length);
            $scope.ads = $scope.ads.concat(_.first(storedData.rawResult, 3 - $scope.ads.length));
            console.log('storedData - ads', $scope.ads.length);
        } else {
            restResult = _.rest(storedData.rawResult, 0);
        }

        $scope.rows = [];
        var indexStr = '';
        restResult.forEach(function(v, i) {
            v.title.length > 30 && (indexStr += '|' + i + '|');
            v.title.length <= 30 && (indexStr += '_' + i + '_'); 
        });
        console.log(indexStr);

        var indexes = indexStr.split(/\|+/).filter(function(item) {
            return item !== '';
        }).map(function(item) {
            return item.split(/_+/).filter(function(item) { return item !== '' });
        }).map(function(item) {
            return item.map(function(item) {
                return restResult[parseInt(item)];
            });
        }).filter(function(item) {
            return item.length !== 0;
        }).map(function(item) {
            return _.chain(item).groupBy(function(v, i) {
                return Math.floor(i / 2);
            }).toArray().value(); 
        });

        $scope.rows = indexes.reduce(function(finalRows, rows){
            return finalRows.concat(rows);
        }, []);

        $ionicSlideBoxDelegate.update();
        setTimeout(function(){
            $ionicSlideBoxDelegate.update();
        }, 300);
    };

    $scope.loadNext = function () {
        if (!$scope.haveMore) {
            return;
        }

        var params = {};

        // search with distance
        if (storedData.settings.distance){
            params.within = storedData.settings.distance;
        }

        // params.within = 10000;

        if (categoryId !== 'all') {
            params.catagory_id = categoryId;
        }

        if (storedData.sortBy != 'distance') {
            params.sortBy = storedData.sortBy;
        }

        var finalResults = null;

        if (storedData.page === 1) {
            params.num = 3;
            params.suggested_paid = true;
            delete params.sortBy;
            finalResults = Promotion.query(params).$promise.then(function(data) {
                storedData.ads = data;
                console.log('storedData', data.length);
                params.page = storedData.page;
                params.per_page = storedData.per_page;
                params._id = '!=' + storedData.ads.map(function(item){ return item.id;}).join(',,');
                if (storedData.sortBy != 'distance') {
                    params.sortBy = storedData.sortBy;
                }
                delete params.num;
                delete params.suggested_paid;
                return Promotion.query(params).$promise;
            })
        } else {
            params.page = storedData.page;
            params.per_page = storedData.per_page;
            params._id = '!=' + storedData.ads.map(function(item){ return item.id; }).join(',,');
            finalResults = Promotion.query(params).$promise;
        }

        finalResults && finalResults.then(function(data) {
            console.log('params', params);
            console.log('loaded', data.length);
            if(data.length < storedData.per_page) {
                storedData.haveMore = false;
            }           
            storedData.page ++;            
            $scope.processRawdata(data);
        });
    };

    if (storedData.page === 1) {
        $scope.loadNext();
    } else {
        $scope.processRawdata();
    }

    $scope.autoSuggest = function() {
        AutoSuggest.init($scope, {
            query: SearchParams.get().query
        }, function(query) {
            SearchParams.reset();
            SearchParams.set('type', 'promotion');
            title !== 'All' && SearchParams.set('catagory', title);
            SearchParams.set('query', query);
            console.log('SEARCH GO >>>>', 'category');
            SearchParams.search();
            $location.path('app/search')
        })
        .then(function() {
            AutoSuggest.show();
        });
    };

    $scope.sort = function(sortby) {
        if (storedData.sortBy !== sortby) {
            $scope.initData();
            storedData.sortBy = sortby;
            $scope.loadNext();
        }    
    };

    $scope.sortBy = function() {
        var buttons = [];    
        buttons.push({
            text: 'Location ' + (storedData.sortBy === 'distance' ? ' (current)' : ''),
            icon: 'icon ion-ios-location-outline',
            action: function() {
                $scope.sort('distance');
            }
        });

        buttons.push({
            text: 'Rating ' + (storedData.sortBy === '-rating' ? ' (current)' : ''),
            icon: 'icon ion-ios-star-outline',
            action: function() {
                $scope.sort('-rating');
            }
        });

        buttons.push({
            text: 'Date ' + (storedData.sortBy === '-updated_at' ? ' (current)' : ''),
            icon: 'icon ion-ios-clock-outline',
            action: function() {
                $scope.sort('-updated_at');
            }
        });

        $ionicActionSheet.show({
            buttons: function() {
                if(/Android/.test(navigator.userAgent))
                    return buttons.map(function(b) { b.text = '<i class="' + b.icon + '"></i> ' + b.text; return b; });
                else
                    return buttons;
            }(),
            titleText:  'Sort By',
            cancelText: 'Cancel',
            buttonClicked: function(index) {
                buttons[index].action();
                return true;
            }
        });
    };

})

.controller('SearchCtrl', function($injector, $ionicHistory, $scope, $ionicTabsDelegate, $ionicSideMenuDelegate, Search, User, Promotion, SearchParams, initQuery, $ionicScrollDelegate, Session, $state, ControllerService, $localstorage, TrackService, AutoSuggest) {
    
    // get scope's uniqe id
    $scope.scopeId = new Date().getTime() + '';
    $scope.lang = $injector.get('englishLang');

    // toggleLeft menus
    $scope.toggleLeft = function(){ $ionicSideMenuDelegate.toggleLeft(); };
    $scope.goBackBtn = false;
    $scope.goBack = function() {
        $scope.goBackBtn = false;
        $ionicHistory.goBack();
    };

    $scope.autoSuggest = function() {
        AutoSuggest.init($scope, {

            query: $scope.query

        }, function(query) {
            // $scope.query = query;
            $scope.search(query);
        })
        .then(function() {
            AutoSuggest.show();
        });
    };

    // prevent the control from loading at the first time
    $scope.search_done = [true, true, true];
    // ids that has to be excluded
    $scope.ids = [];

    $scope.tabIndex = 0;

    $scope.search_type = 'user,,promotion';

    $scope.results =[
        { ads: [], normal: [] },
        { ads: [], normal: [] }
    ];

    $scope.blank_page = [true, true, true];

    $scope.page = [0, 0, 0];

    $scope.isEmpty = function(index) {
       return $scope.results[index].ads.length + $scope.results[index].normal.length === 0;
    };

    $scope.onTabSelect = function(index) {
        $scope.tabIndex = index;
        switch(index) {
            // set it to search only on users
            case 0: $scope.search_type = 'user'; break;
            // set it to search only on promotions
            case 1: $scope.search_type = 'promotion'; break;
            // set it to search on both tables
            default: $scope.search_type = 'user';
        }
    };

    $scope.search = function(query) {
        if ($scope.tabIndex > 1) {
            return;
        }
        $scope.blank_page[$scope.tabIndex] = false;
        $scope.search_done[$scope.tabIndex] = false;
        $scope.query = query;
        $scope.page[$scope.tabIndex] = 1;
        $scope.results[$scope.tabIndex].normal = [];
        $scope.results[$scope.tabIndex].ads = [];
        $ionicScrollDelegate.scrollTop();
        $scope.loadNext($scope.tabIndex);
    };

    $scope.loadNext = function(index) {
        console.log('loadNext >>>>', $scope.scopeId);
        var query_params = { 
            query: $scope.query, 
            page: $scope.page[index],
            query_scope: $scope.search_type
        };

        if ($scope.page[index] > 1) {
            query_params.excludes = $scope.results[index].ads.map(function(hit) { return hit.result.id }).join(',,');
        }

        var settings = $localstorage.getObject('searchSettings');
        console.log('settings:', JSON.stringify(settings));
        if (settings.distance) {
            query_params.distance = settings.distance;
        }

        if (settings.sortBy) {
            query_params.sortBy = settings.sortBy;
        }

        var finalResults = null;
        // if it's the first page query, get the paid ads resutls first
        // 1. query_params.sortBy = 'random' ==> randomly sort results
        // 2. query_params.subscripted = true ==> only paid results
        if ($scope.page[index] === 1) {
            query_params.sortBy = 'random';
            query_params.page = 1;
            query_params.per_page = 2;
            query_params.subscripted = true;

            finalResults = Search.query(query_params).then(function(res) {
               res.data[0] && $scope.results[index].ads.push(res.data[0]); 
               res.data[1] && $scope.results[index].ads.push(res.data[1]); 

               delete query_params.per_page;
               delete query_params.subscripted;
               delete query_params.sortBy;

               if (settings.sortBy) {
                    query_params.sortBy = settings.sortBy;
                }

               query_params.excludes = $scope.results[index].ads.map(function(hit) { return hit.result.id }).join(',,');

               $scope.results[index].normal = $scope.results[index].normal.concat(res.data);
               return Search.query(query_params);
            });
        }
        // if it's not done yet 
        else if (!$scope.search_done[index]) {
            finalResults = Search.query(query_params);
        }

        // process the returned data if there is any
        finalResults && finalResults.then(function(res) {
            // increase the page indicator by 1
            $scope.page[index] ++;
            $scope.results[index].normal = $scope.results[index].normal.concat(res.data.map(function(item){ item.result.subscripted = false; return item }));
            res.data.length < 10 && ($scope.search_done[index] = true);
            res.data.length === 0 && $scope.get_suggested_items(index);
            $scope.$broadcast('scroll.infiniteScrollComplete');
        }, function() {
            $scope.search_done[index] = true;
            $scope.$broadcast('scroll.infiniteScrollComplete');
        });
    };

    $scope.get_suggested_items = function(index) {
        switch(index) {
            case 0: $scope.get_suggested_dealers(); break;
            case 1: $scope.get_suggested_promotions(); break;
            case 2: 
               $scope.get_suggested_dealers(); 
               $scope.get_suggested_promotions(); 
               break;
            default: true;
        }
    };

    // get the suggested dealers
    $scope.suggested_dealers = [];
    $scope.suggested_promotions = [];

    $scope.get_suggested_dealers = function() {
        var duration = 1 * 60 * 60 * 1000;
        var suggestedItems = $localstorage.getObject('suggestedItems');
        if (suggestedItems.dealers && suggestedItems.dealers.time + duration > new Date().getTime()) {
            $scope.suggested_dealers = suggestedItems.dealers.data;
        } else {

            var params = {
                suggested_paid: true,
                user_role: 'customer'
            };

            var settings = $localstorage.getObject('searchSettings');
            if (settings.enable){
                params.within = settings.distance;
            }

            User.query(params).$promise.then(function(data) {
               $scope.suggested_dealers = data;
               suggestedItems.dealers = {
                    time: new Date().getTime(),
                    data: data
               };
               $localstorage.setObject('suggestedItems', suggestedItems);
            });
        }
    };

    $scope.get_suggested_promotions = function() {
        var duration = 1 * 60 * 60 * 1000;
        var suggestedItems = $localstorage.getObject('suggestedItems');
        if (suggestedItems.promotions && suggestedItems.promotions.time + duration > new Date().getTime()) {
            $scope.suggested_promotions = suggestedItems.promotions.data;
        } else {
            var params = {
                suggested_paid: true
            };

            var settings = $localstorage.getObject('searchSettings');
            if (settings.enable){
                params.within = settings.distance;
            }

            Promotion.query(params).$promise.then(function(data) {
               $scope.suggested_promotions = data; 
               suggestedItems.promotions = {
                    time: new Date().getTime(),
                    data: data
               };
               $localstorage.setObject('suggestedItems', suggestedItems);
            });
        }
    };


    var searchParams = SearchParams.get();
    var searchByParams = function(searchParams) {
        console.log('SEARCH ONCE >>>', $scope.scopeId);
        $scope.goBackBtn = true;
        if (searchParams.type === 'user') {
            setTimeout(function(){
                $ionicTabsDelegate.$getByHandle('searchTabs').select(0);
            }, 0);
        } else if (searchParams.type === 'promotion') {
            setTimeout(function(){
                $ionicTabsDelegate.$getByHandle('searchTabs').select(1);
            }, 0);
        }
        setTimeout(function(){
            searchParams.query && $scope.search(searchParams.query);
        }, 5);
        SearchParams.reset();
    }
    searchParams.query && searchByParams(searchParams);
    SearchParams.onSearch(function(params) {
        searchByParams(params);
    });

    $scope.get_suggested_items(2);

    // release callbacks
    $scope.$on('$destroy', function () {
      searchByParams = function() {};
    })
})

.controller('SearchSetttingsCtrl', function($injector, $scope, $localstorage) {

    $scope.settingslang = $injector.get('englishLang');

    $scope.settings = $localstorage.getObject('searchSettings');

    $scope.settings.distance = $scope.settings.distance || 25;

    // $scope.settings.enable = $scope.settings.enable || true;

    $scope.settings.sortBy = $scope.settings.sortBy || 'score';

    $scope.update = function() {
        $localstorage.setObject('searchSettings', $scope.settings);
    };

})

.controller('SettingsCtrl', function($scope) {

})

.controller('ProfileCtrl', function($ionicSideMenuDelegate, $rootScope, $scope, MapImg, $ionicActionSheet, loadedUser, $state, $location, SearchParams, Auth, Session, Promotion, User, $cordovaSocialSharing, $cordovaEmailComposer, $cordovaToast, EditPromotion, NewPassword, TrackService, MakeReview, Review) {

    // to check if back button shown currently.
    // show menu button if not.
    $rootScope.$on('$ionicView.beforeEnter', function(e, data){
        $scope.isBackButtonShown = data.enableBack;
    });


    // toggleLeft menus
    $scope.toggleLeft = function() { $ionicSideMenuDelegate.toggleLeft(); };

    // get the user
    $scope.customer = loadedUser;

    // if the page editiable to the current user
    $scope.editiable = Auth.owns(loadedUser.id) || Auth.isAuthorized('admin');

    // if the current user a customer
    $scope.isCustomer = loadedUser.roles.indexOf('customer') !== -1;

    Auth.onLoggedIn(function() {
        // set profile as editiable, if user owns this or user's role is admin
        $scope.editiable = Auth.owns(loadedUser.id) || Auth.isAuthorized('admin');
    });

    Auth.onLoggedOut(function() {
        // set profile as editiable, if user owns this or user's role is admin
        $scope.editiable = false;
    });    

    $scope.keywords = loadedUser.keywords.reduce(function(pre, next) {
        return pre += '<span style="color: #C57477">#' + next + '<span>  '
    }, '');

    $scope.hours = Object.keys(loadedUser.hours || {});

    $scope.showMore = false;

    // get background picture
    $scope.mapurl = new MapImg().center(loadedUser.address).zoom(17).size(800, 400).markers('red', 'S', loadedUser.address).get();

    Promotion.query({
        customer_id: loadedUser.id,
        page: 1,
        per_page: 1,
        status: 'reviewed',
        expire_at: '>' + new Date().toString(),
        sortBy: '-created_at'
    }).$promise.then(function(promotions) {
        if (promotions[0])
            $scope.latestPromotion = promotions[0];
    });

    // navigate to the user's address
    $scope.navigate = function() {
        launchnavigator.navigate(
          loadedUser.address,
          null,
          function(){
            
          },
          function(error){
            
          },
          {
            preferGoogleMaps: true,
            enableDebug: true
        });
    };

    // show tags menu
    $scope.showTagsMenu = function(list) {
        var data = list.map(function(item) {
            return { text: '#' + item };
        });
        $ionicActionSheet.show({
            buttons: function() {
                if(/Android/.test(navigator.userAgent))
                    return data.map(function(b) { b.text = '<i class="icon ion-ios-pricetag-outline"></i> ' + b.text; return b; });
                else
                    return data;
            }(),
            titleText:  'Search by Tag',
            cancelText: 'Cancel',
            buttonClicked: function(index) {
                SearchParams.reset();
                SearchParams.set('type', 'user');
                SearchParams.set('query', list[index]);
                $location.path('/app/search');
                SearchParams.search();
                return true;
            }
        });
    };

    $scope.doRefresh = function() {
        User.get({userId: loadedUser.id}).$promise.then(function(user) {
            $scope.customer = user;
            $scope.$broadcast('scroll.refreshComplete');
        }, function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };


    $scope.emailUser = function() {
        var email = {
            to: loadedUser.email,
            subject: loadedUser.name,
            body: 'Hi, ' + loadedUser.name + ' <br>',
            isHtml: true
        };

        $cordovaEmailComposer.open(email);
    };

    $scope.review = function() {
        MakeReview.init($scope, {
            rating: 0
        }, function(rating, comment) {

            $scope.customer.$rate({ rating: rating }).then(function(res) {
                
                $scope.customer.rating = res.rating;
                $scope.customer.rates = res.rates;
                $cordovaToast.showShortBottom('Rated successfully!');
                // return !!comment && !!comment.length;

            }).finally(function(arg) {

                if (!comment || !comment.length) 
                    return;

                var review = new Review();
                review.review = {
                    body: comment,
                    customer_id: $scope.customer.id
                };
                review.$save().then(function() {
                    $cordovaToast.showShortBottom('Commented successfully!');
                });

            });

        })
        .then(function() {
            MakeReview.show();
        });
    };

    $scope.showMoreMenu = function() {
        var buttons = $scope.isCustomer ? [
            {
                text: 'Make a review',
                icon: 'icon ion-ios-chatbubble',
                action: $scope.review
            },
            {
                text: 'Share This',
                icon: 'icon ion-share',
                action: $scope.share
            },{
                text: 'View All Deals',
                icon: 'icon ion-eye',
                action: $scope.viewAllPromotions
            }
        ] : [];

        $scope.editiable && buttons.push({
            text: 'Edit Profile',
            icon: 'icon ion-edit',
            action: function() {
                $location.path('/app/users/' + loadedUser.id + '/profile-edit');
            }
        });

        $scope.isCustomer && $scope.editiable && buttons.push({
            text: 'New Promotion',
            icon: 'icon ion-plus-round',
            action: $scope.newPromotion
        });

        Auth.owns(loadedUser.id) && buttons.push({
            text: 'Change Password',
            icon: 'icon ion-lock-combination',
            action: $scope.newPassword
        });

        $ionicActionSheet.show({
            buttons: function() {
                if(/Android/.test(navigator.userAgent))
                    return buttons.map(function(b) { b.text = '<i class="' + b.icon + '"></i>' + b.text; return b; });
                else
                    return buttons;
            }(),
            titleText:  'Options',
            cancelText: 'Cancel',
            buttonClicked: function(index) {
                buttons[index].action();
                return true;
            }
        });
    };

    $scope.newPassword = function() {
        NewPassword.init($scope, function(c, n) {
            
            loadedUser.$newpassword({
                current_password: c,
                new_password: n
            }).then(function() {
                $cordovaToast.showShortBottom('Password has been changed successfully!');
                NewPassword.hide();
                NewPassword.remove();

                Session.destory();
                $location.path('/login');

            });

        }).then(function() {
            NewPassword.show();
        });
    };

    $scope.viewAllPromotions = function() {
        $location.path('/app/promotions').search('customer_id', loadedUser.id);
    };

    $scope.newPromotion = function() {
        EditPromotion.init($scope, {
            title: 'New Promotion',
            promotion: new Promotion({})
        }, function(deal) {
            deal.$save({ user_id: loadedUser.id }).then(function() {
                $cordovaToast.showShortBottom('Deal created successfully');
                EditPromotion.hide();
                EditPromotion.remove();
            });
            return false;
        }).then(function() {
            EditPromotion.show();
        }); 
    };

    $scope.share = function() {
        $cordovaSocialSharing
            .share('[Vicinity Deals][' + loadedUser.name + '][' + loadedUser.address + ']', loadedUser.description, null, loadedUser.url + '?format=html')
            .then(function(result) {
              TrackService.isReady() && TrackService.track.trackEvent('share', 'business [' + loadedUser.id  + ']', loadedUser.name);
            }, function(err) {
              // An error occured. Show a message to the user
            });
    };
})

.controller('EditProfileCtrl', function($scope, loadedUser, FileUploader, Session, Flash, SimpleEdit, SimpleListEdit, BusinessHours,  gampConfig, $cordovaToast, Flash, $cordovaDialogs, $rootScope, $location) {

    $scope.save = false;

    $scope.customer = loadedUser;

    $scope.customer.isCustomer = loadedUser.roles.indexOf('customer') !== -1;

    $scope.tags = function() {
        return '#' + $scope.customer.keywords.join(' #');
    };

    $scope.hours = Object.keys(loadedUser.hours || {});

    $scope.options = {

        name: function(name) {
            return {
                value: name,
                title: 'Name',
                placeholder: 'edit name here',
                field: 'name'   
            };
        },

        address: function(address) {
            return {
                value: address,
                title: 'Address',
                placeholder: '# Street Name, City, Province, Postal Code',
                field: 'address'
            };
        },

        phone: function(phone) {
            return {
                value: phone,
                title: 'Phone Number',
                placeholder: 'edit phone number',
                validator: function(data) {
                    return /\(?([0-9]{3})\)?([ .-]?)([0-9]{3})\2([0-9]{4})/.test(data);
                },
                error: 'This is not a phone number',
                field: 'phone'
            };
        },

        email: function(email) {
            return {
                value: email,
                title: 'Email',
                placeholder: 'edit email',
                validator: function(data) { 
                    return /\S+@\S+\.\S+/.test(data);
                },
                error: 'This is not a email address',
                field: 'email'
            };
        },

        description: function(description) {
            return {
                value: description,
                title: 'Description',
                placeholder: 'edit description',
                field: 'description'
            };
        }

    };

    $scope.editValue = function(params) {
        
        SimpleEdit.init($scope, params, function(value) {
            $scope.customer[params.field] = value;
            $scope.save = true;
        }).then(function() {
            SimpleEdit.show();
        });

        return false;
    };

    $scope.editHours = function() {
        BusinessHours.init($scope, {

            hours: loadedUser.hours || {}

        }, function(hours) {

            $scope.customer.hours = hours;
            $scope.save = true;

        }).then(function() {
            BusinessHours.show();
        });
    };

    $scope.editKeywords = function() {
        SimpleListEdit.init($scope, 
            {
                title: 'Edit Keywords',
                list: $scope.customer.keywords.map(function(k) { return { name: '# ' + k, value: k }; })
            }, 
            // when a new keyword is to add
            function(newItem) {
                return $scope.customer.$addTag({ keyword: newItem }).then(function() {
                    $scope.customer.keywords.push(newItem);
                    return { name: '# ' + newItem, value: newItem };
                });
            },
            // when a keyword is to delete
            function(itemToRemove) {
                return $scope.customer.$deleteTag({ keyword: itemToRemove }).then(function() {
                    $scope.customer.keywords = $scope.customer.keywords.filter(function(key){
                        return itemToRemove !== key;
                    });
                    return itemToRemove;
                });
            })
        .then(function() {
            SimpleListEdit.show();
        });
    };

    $scope.update = function() {

        var msg = false;
        if ($scope.customer.isCustomer) {
            if ($scope.customer.address === null || $scope.customer.address.length < 5)
                msg = 'Please type correct address';
            else if ($scope.customer.description === null || $scope.customer.description.length < 5)
                msg = 'Please type correct description';
            else if ($scope.customer.phone === null || $scope.customer.phone.length < 5)
                msg = 'Please type correct phone number';
        } else {
            $scope.customer.description = null;
        }

        if (msg) {
            Flash.setMessage(msg);
            return;
        }

        return $scope.customer.$update().then(function() {
            $scope.save = false;
            $cordovaToast.showShortBottom('Updated successfully!');  
        });

    };

    // get the picture from the system storage
    $scope.getPicture = function(type) {
        navigator.camera.getPicture(function(imageUri) {          

            var promise = FileUploader('image', imageUri, gampConfig.baseUrl + '/images?apitoken=' + Session.session.apitoken);
            
            promise.then(function(data) {
                // set customer's logo_id when the new image was successfully uploaded.
                $scope.customer[type + '_id'] = JSON.parse(data.response).id;
                $scope.customer[type] = JSON.parse(data.response);
                $cordovaToast.showShortBottom('Photo uploaded successfully!');
                $scope.save = true;

            }, function(err) {
                Flash.setMessage('Failed to upload photo, please try agin!');
            });
        }, function(err) {          
            // Flash.setMessage('failed to select photo');
        }, {
            quality: 50,
            destinationType: Camera.DestinationType.FILE_URI,
            sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
            encodingType: Camera.EncodingType.JPEG,
            allowEdit: true
        });
    };

    // remind user to save the changes made
    $scope.$on('$locationChangeStart', function(event, next, current) {
        if ($scope.save) {
            $cordovaDialogs.confirm('You have unsaved changes, do you want to save it?', 'Confirm', ['Save', 'No']).then(function(index) {
                if (index === 1) {
                    $scope.update();
                }
            });
        }
    });

})

.controller('PromotionCtrl', function($ionicSideMenuDelegate, $rootScope, $scope, $injector, $state, MapImg, $ionicHistory, loadedPromotion, Auth, MakeReview, Review, EditPromotion, $ionicActionSheet,  $cordovaSocialSharing, $cordovaToast, $cordovaDialogs, SimpleEdit, TrackService) {
    $scope.lang = $injector.get('englishLang');

    $rootScope.$on('$ionicView.beforeEnter', function(e, data){
        $scope.isBackButtonShown = data.enableBack;
    });

    // toggleLeft menus
    $scope.toggleLeft = function() {$ionicSideMenuDelegate.toggleLeft();};

    $scope.goToCustomer = function() {
        alert('good');
    };

    Auth.onLoggedIn(function() {
        // set profile as editiable, if user owns this or user's role is admin
        $scope.editiable = Auth.owns(loadedPromotion.customer.id) || Auth.isAuthorized('admin');
    });

    Auth.onLoggedOut(function() {
        // set profile as editiable, if user owns this or user's role is admin
        $scope.editiable = false;
    }); 

    $scope.editiable = Auth.owns(loadedPromotion.customer.id) || Auth.isAuthorized('admin');

    $scope.promotion = loadedPromotion;

    $scope.customer = loadedPromotion.customer;

    $scope.mapurl = new MapImg().center($scope.customer.address).zoom(17).size(1000, 300).markers('red', 'S', $scope.customer.address).get();

    $scope.navigate = function() {
        launchnavigator.navigate(
          loadedPromotion.customer.address,
          null,
          function(){
            
          },
          function(error){
            
          },
          {
            preferGoogleMaps: true,
            enableDebug: true
        });
    };

    $scope.edit = function() {
        EditPromotion.init($scope, {
            title: 'Edit Promotion',
            promotion: loadedPromotion
        }, function(deal) {
            return deal.$update().then(function() {
                $cordovaToast.showShortBottom('Saved successfully!');
            });
            // return false;
        }).then(function() {
            EditPromotion.show();
        }); 
    };

    $scope.review = function() {
        MakeReview.init($scope, {
            rating: 0
        }, function(rating, comment) {

            $scope.promotion.$rate({ rating: rating }).then(function(res) {
                
                $scope.promotion.rating = res.rating;
                $scope.promotion.rates = res.rates;
                $cordovaToast.showShortBottom('Rated successfully!');
                // return !!comment && !!comment.length;

            }).finally(function(arg) {

                if (!comment || !comment.length) 
                    return;

                var review = new Review();
                review.review = {
                    body: comment,
                    promotion_id: $scope.promotion.id
                };
                review.$save().then(function() {
                    $cordovaToast.showShortBottom('Commented successfully!');
                });

            });

        })
        .then(function() {
            MakeReview.show();
        });
    };

    $scope.share = function() {
        $cordovaSocialSharing
            .share('Share the latest Deal from ' + $scope.customer.name + ': ' + loadedPromotion.title + ' --- ' + loadedPromotion.description + '[From Vicinity Deals]', '', loadedPromotion.customer.logo.thumb_url, loadedPromotion.url + '?format=html'  )
            // .share(loadedPromotion.title + ': ' + loadedPromotion.description, 'Promotion From [Vicinity Deals]', loadedPromotion.customer.logo.thumb_url, loadedPromotion.url)
            .then(function(result) {
               // $cordovaToast.showShortBottom('shared successfully');
               TrackService.isReady() && TrackService.track.trackEvent('share', 'deal [' + loadedPromotion.id  + ']', loadedPromotion.title);
            }, function(err) {
               $cordovaToast.showShortBottom('Failed! please try later.');
            });
    };

    $scope.report = function() {
        SimpleEdit.init($scope, {
            value: '',
            title: 'Report Reason',
            placeholder: 'type reason here'
        }, function(value) {
            
            loadedPromotion.$report({ reason: value }).then(function() {
                $cordovaToast.showShortBottom('Reported successfully!');
            });

        }).then(function() {
            SimpleEdit.show();
        }); 
    };

    $scope.showMoreMenu = function() {
        var buttons = [
            {
                text: 'Show Reviews',
                icon: 'icon ion-ios-chatboxes-outline',
                action: function() {
                    $state.go('app.comments', { promotion_id: $scope.promotion.id })
                }
            },
            {
                text: 'Edit',
                icon: 'icon ion-edit',
                action: function() {
                    $scope.edit();
                }
            }
        ];

        $scope.editiable && buttons.push({
            text: 'Send Notifications',
            icon: 'icon ion-android-notifications-none',
            action: function() {
                loadedPromotion.$notify().then(function() {
                    $cordovaDialogs.alert('Your notification request has been made successfully, we will contact you shortly.', 'Success', 'OK');
                });
            }
        });

        Auth.isAuthorized('admin') && buttons.push({
            text: 'Approve',
            icon: 'icon ion-checkmark-round',
            action: function() {
                loadedPromotion.$approve().then(function() {
                    $cordovaToast.showShortBottom('Approved successfully!');
                });
            }
        });

        Auth.isAuthorized('admin') && buttons.push({
            text: 'Reject',
            icon: 'icon ion-close-round',
            action: function() {
                SimpleEdit.init($scope, {
                    value: '',
                    title: 'Rejection Reason',
                    placeholder: 'type reason here'
                }, function(value) {
                    
                    loadedPromotion.$reject({ reason: value }).then(function() {
                        $cordovaToast.showShortBottom('Rejected successfully!');
                    });

                }).then(function() {
                    SimpleEdit.show();
                });
            }
        });

        $ionicActionSheet.show({
            buttons: function() {
                if(/Android/.test(navigator.userAgent))
                    return buttons.map(function(b) { b.text = '<i class="'+ b.icon +'"></i>' + b.text; return b; });
                else
                    return buttons;
            }(),
            titleText:  'Options',
            cancelText: 'Cancel',
            destructiveText: 'Delete',
            buttonClicked: function(index) {
                buttons[index].action();
                return true;
            },
            destructiveButtonClicked: function() {
                loadedPromotion.$delete().then(function() {
                    $cordovaToast.showShortBottom('Deleted successfully!');
                    $ionicHistory.goBack(-1);
                });
            }
        });
    };
})

.controller('CommentsCtrl', function($scope, Review, $state, formatters) {

    $scope.formatters = formatters;

    $scope.comments = [];

    $scope.page = 1;

    $scope.per_page = 20;

    $scope.params = $state.params;

    $scope.hideInfiniteScroll = true;

    $scope.loadNext = function() {

        $scope.params.page = $scope.page;
        $scope.params.per_page = $scope.per_page;
        $scope.params.sortBy = 'created_at';

        return Review.query($scope.params).$promise.then(function(comments) {
            $scope.hideInfiniteScroll = false;
            $scope.page ++;
            $scope.comments = $scope.comments.concat(comments);
            if(comments.length < $scope.per_page) {
                $scope.hideInfiniteScroll = true;
            }
            $scope.$broadcast('scroll.infiniteScrollComplete');
        }, function() {
            $scope.$broadcast('scroll.infiniteScrollComplete');
        });
    };

    $scope.loadNext();

})

// Promotion List Controller
.controller('PromotionsCtrl', function($scope, $state, $localstorage, loadedUser, EditPromotion, Promotion, Auth, Session, PromotionFilter, $ionicActionSheet, $cordovaToast) {

    Auth.onLoggedIn(function() {
        // set profile as editiable, if user owns this or user's role is admin
        $scope.editiable = Auth.owns($state.params.customer_id) || Auth.isAuthorized('admin');
    });

    Auth.onLoggedOut(function() {
        // set profile as editiable, if user owns this or user's role is admin
        $scope.editiable = false;
    }); 
    
    $scope.promotions = [];

    $scope.customer = loadedUser;

    $scope.hideInfiniteScroll = true;

    $scope.editiable = Auth.owns($state.params.customer_id) || Auth.isAuthorized('admin');

    $scope.page = 1;

    $scope.per_page = 10;

    $scope.params = {};

    $scope.loadNext = function() {
        $scope.params.page = $scope.page;
        return Promotion.query($scope.params).$promise.then(function(promotions) {
            $scope.hideInfiniteScroll = false;
            $scope.page ++;
            $scope.promotions = $scope.promotions.concat(promotions);
            if(promotions.length < $scope.per_page) {
                $scope.hideInfiniteScroll = true;
            }
            $scope.$broadcast('scroll.infiniteScrollComplete');
        }, function() {
            $scope.hideInfiniteScroll = true;
            $scope.$broadcast('scroll.infiniteScrollComplete');
        });
    };

    $scope.new = function() {
        var promotion = new Promotion();
        EditPromotion.init($scope, {
            title: 'New Promotion',
            promotion: promotion
        }, function(deal) {
            deal.$save({ user_id: $state.params.customer_id }).then(function() {
                $cordovaToast.showShortBottom('promotion created successfully');
                EditPromotion.hide();
                EditPromotion.remove();
            });
            return false;
        }).then(function() {
            EditPromotion.show();
        });
    };

    $scope.refresh = function() {
        var settings = $localstorage.getObject('promotionFilterSettings');
        var params = $state.params;
        params.sortBy = settings.sortBy || 'created_at';
        params.status = '';
        if (!$scope.editiable) 
            params.expire_at = '>' + new Date().toString();
        if ($scope.editiable && settings.submitted !== false)
            params.status += 'submitted,,';
        if ($scope.editiable && settings.reviewed !== false)
            params.status += 'reviewed,,';
        if ($scope.editiable && settings.rejected !== false)
            params.status += 'rejected';
        if (!$scope.editiable)
            delete params.status;

        $scope.promotions = [];
        $scope.page = 1;
        $scope.params = params;
        $scope.params.page = $scope.page;
        $scope.params.per_page = $scope.per_page;
        $scope.params.customer_id = loadedUser.id;

        return $scope.loadNext().then(function() {
            $scope.$broadcast('scroll.refreshComplete');
        }, function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };

    $scope.openFilter = function() {
        PromotionFilter.init($scope, $scope.editiable, function(settings) {

        }).then(function() {
            PromotionFilter.show();
        });
    };

    $scope.showMoreMenu = function() {
        var buttons = [
            {
                text: 'Refresh',
                icon: 'icon ion-ios-reload',
                action: $scope.refresh
            }
        ];

        $scope.editiable && buttons.push({
            text: 'New Promotion',
            icon: 'icon ion-plus',
            action: $scope.new
        });

        $ionicActionSheet.show({
            buttons: function() {
                if(/Android/.test(navigator.userAgent))
                    return buttons.map(function(b) { b.text = '<i class="' + b.icon + '"></i>' + b.text; return b; });
                else
                    return buttons;
            }(),
            titleText:  'Options',
            cancelText: 'Cancel',
            buttonClicked: function(index) {
                buttons[index].action();
                return true;
            },
        });
    };

    // initialize
    $scope.refresh();

})

// login controller, handles login operations
.controller('LoginCtrl', function($scope, $injector, Auth, User, $state, $location, $localstorage, Notification, $cordovaDialogs, Flash) {
    $scope.lang = $injector.get('englishLang');

    var emailTester = /\S+@\S+\.\S+/;

    $scope.cancel = function() {
        $state.go('app.search');
    };

    // reset the password
    $scope.reset = function() {
        $cordovaDialogs.confirm('Are you sure?', 'Confirm', ['Sure', 'No']).then(function(index) {
            if (index === 1 && emailTester.test($scope.credentials.email || 'none')) {
              User.query({
                email: $scope.credentials.email
              }).$promise.then(function(data) {
                if(!data[0]) {
                    Flash.setMessage('user does not exist');
                } else {
                    data[0].$reset().then(function() {
                       $cordovaDialogs.alert('You have successfully made a password reset request, we will contact you shortly.', 'Success', 'OK'); 
                    });
                }
              });
            } 
        });
    };

    // on email change,
    // autocomplete password if logged in before
    $scope.onEmailChange = function() {
        // alert($scope.credentials.email);
        var savedUsers = $localstorage.getObject('savedUsers');
        if (savedUsers[$scope.credentials.email]) {
            $scope.credentials.password = savedUsers[$scope.credentials.email].password || '';

            if (savedUsers[$scope.credentials.email].password) {
                $scope.save = true;
            }
        }
    };

    // credentails used to login
    $scope.credentials = {};

    if ($state.params.login_as) {
        $scope.credentials.email = $state.params.login_as;
        $scope.onEmailChange();    
    }
    
    // login
    $scope.login = function() {
        // set up credentials 
        Auth.setCredentials($scope.credentials.email, $scope.credentials.password);
        // attempt to login
        Auth.login().then(function(data) {

            // save the credentials
            var savedUsers = $localstorage.getObject('savedUsers');
            if ($scope.save) {
                data.user.password = $scope.credentials.password;
                savedUsers[$scope.credentials.email] = data.user; 
            }
            else {
                delete savedUsers[$scope.credentials.email];
            }
            $localstorage.setObject('savedUsers', savedUsers);

            if($state.params.jump_to) {
                console.log('[LOGGED IN] jump to ' + $state.params.jump_to);
                $location.path($state.params.jump_to);
            } else {
                console.log('[LOGGED IN] go to profile page');
                $state.go('app.profile', { userid: data.user.id });
            }

        });
    };

})

// login as ...
// If several users have loggedin before on this phone, then list them
// on this page
.controller('LoginasCtrl', function($scope, Auth, $state, $location, $localstorage) {
    
    $scope.users = [];

    var setUsers = function() {
        var savedUsers = $localstorage.getObject('savedUsers');

        for (var key in savedUsers) {

            if ($state.params.jump_to)
                savedUsers[key].loginUrl = '#/login?login_as=' + encodeURIComponent(key) + '&jump_to=' + encodeURIComponent($state.params.jump_to);
            else 
                savedUsers[key].loginUrl = '#/login?login_as=' + encodeURIComponent(key);

            console.log(savedUsers[key].loginUrl);
             
            $scope.users.push(savedUsers[key]);
        }
    };

    setUsers();

    Auth.onLoggedIn(function() {
        setTimeout(function(){
            setUsers();
        }, 2000);
    });

    if ($state.params.jump_to)
        $scope.loginUrl = '#/login?jump_to=' + encodeURIComponent($state.params.jump_to);
    else 
        $scope.loginUrl = '#/login';

    if ($state.params.jump_to)
        $scope.users.length === 0 && $location.path('/login').search('jump_to', $state.params.jump_to);
    else 
        $scope.users.length === 0 && $location.path('/login');
})

// signup controller, handles signup operations
.controller('SignupCtrl', function($scope, $injector, Auth, $state, Flash, $ionicHistory, $cordovaDialogs) {
    $scope.lang = $injector.get('englishLang');

    // user to be registered
    $scope.user = {};
    $scope.signup = function() {
        Auth.signupWithEmail({ user: $scope.user }).then(function(data) {
            $ionicHistory.goBack();
            $cordovaDialogs.alert('Welcome to Vicinity Deals! You may now login and customize your profile. Thank you.', 'Success', 'OK'); 
        });
    };
})

// signup controller, handles signup operations
.controller('StoreCtrl', function($scope, $state, Session, Subscription, $cordovaToast, $ionicSideMenuDelegate, $cordovaDialogs) {

    $scope.subscriptions = [];

    $scope.products = [];

    // get all subscriptions
    Subscription.query({
        user_id: Session.user().id,
        sortBy: 'status', 
        status: 'activated,,expired' // only activated and expired ones will be returned
    }).$promise.then(function(subcriptions) {
        $scope.subscriptions = subcriptions;
    });

    // get currently aviliable products
    Subscription.products().$promise.then(function(products) {
        $scope.products = products;
    });

    // perform a membership request
    $scope.makeRequest = function(product_id) {

        // get a new subscription
        var subscription = new Subscription();

        // set its product id
        subscription.product_id = product_id;
        // set its user id
        subscription.user_id = Session.user().id;

        // get confirmed and submitted
        $cordovaDialogs.confirm('Are you sure?', 'Confirm', ['Sure', 'No']).then(function(index) {
            if (index === 1) {
                subscription.$save().then(function() {
                    $cordovaDialogs.alert('Your request for membership has been successfully sent, we will contact you shortly.', 'Success', 'OK'); 
                });
            } 
        });
    };

        // toggleLeft menus
    $scope.toggleLeft = function() {
        $ionicSideMenuDelegate.toggleLeft();
    };

});
