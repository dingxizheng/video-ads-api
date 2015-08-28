angular.module('starter.interceptors', [])

.factory('uncacheInterceptor', function($cacheFactory) {
	var cache = $cacheFactory.get('$http');

	return {
		response: function(response) {
			if (response.config.params && response.config.params.uncache) {
				cache.remove(response.config.url);
			}
			return response;
		}
	};
})

// set everyrequest's time to 10 s' 
.factory('timeoutInterceptor', function() {

	return {
		request: function(config) {
			config.timeout = 10000;
			return config;
		}
	};

})

// wrap data with model name.
// for example:
// { id:'123', age: 34, country: 'china' } => 
// 			{ user: { id:'123', age: 34, country: 'china' } }
.factory('modelWraperInterceptor', function() {
	
	return {
		request: function(config) {
			if (config.params && config.params.modelWraper) {
				console.log('modelWraper', config.params.modelWraper);
				var data = config.data;
				config.data = {};
				config.data[config.params.modelWraper] = data;
				delete config.params.modelWraper;
			}
			return config;
		}
	};
})

// append query params to each request if avaliable
.factory('queryParamsInterceptor', function(Session, GeoService, TrackService, $localstorage) {

	return {

		request: function(config) {
			
			TrackService.isReady() && TrackService.track.trackEvent('request', config.url, JSON.stringify(config.params));

			config.url += '?';
			var params = [];
			
			if (!!Session.session && !!Session.session.apitoken) {
				params.push('apitoken=' + Session.session.apitoken);
			}

			if (GeoService.location()) {
				params.push('lat=' + GeoService.location().latitude);
				params.push('long=' + GeoService.location().longitude);
			}

			config.url += params.join('&');

			return config;
		}
	};

})

// interceptor request with loading page
.factory('loadingInterceptor', function($rootScope, gampConfig) {

	return {

		request: function(config) {
			
			var show = gampConfig.loadingInterceptorMatchers.reduce(function(prev, curr) {
				var regexp = new RegExp(curr);
				return regexp.test(config.url) || prev;
			}, false);

			console.log('request url: ', config.url);
			console.log('should show standby?: ', show);

			show && $rootScope.$broadcast('loading:show');
			config.show = show;

			return config;
		},

		response: function(response) {
			response.config.show && $rootScope.$broadcast('loading:hide');
			return response;
		}
	};

})


.factory('errorInterceptor', function($q, $location, $rootScope, Flash, $cordovaToast, Session, TrackService) {

	return {

		responseError: function(rejection) {

			console.log(JSON.stringify(rejection));

			// hide the standing by mask when ever a error happens
			rejection.config.show && $rootScope.$broadcast('loading:hide');

			if (rejection.status === 422) {
				var msg = '';
				if (rejection.data.fields && Object.keys(rejection.data.fields).length > 0) {
					for (var key in rejection.data.fields) {
						msg += key + ':: ' + rejection.data.fields[key] + '\n';
						break;
					}
				} else if (rejection.data.error){
					msg += rejection.data.error + '\n';
				}

				TrackService.isReady() && TrackService.track.trackEvent('http error', rejection.status, '[ '+ rejection.config.url + ' ]  ' + msg);
				Flash.setMessage(msg);

				return $q.reject(rejection);

			// destory sesion if session expired
			} else if (rejection.status === 401) {

				Session.destory();
				$location.path('/app/search');
				return $q.reject(rejection);
			}

			// $cordovaToast.showLongBottom(rejection.data && rejection.data.error || 'unknown error, please try later.');
			TrackService.isReady() && TrackService.track.trackEvent('http error', rejection.status, '[ '+ rejection.config.url + ' ]  ' +(rejection.data.error || 'unknown error, please try later.'));

			Flash.setMessage(rejection.data && rejection.data.error || 'unknown error, please try later.');
			return $q.reject(rejection);
		}

	};

});