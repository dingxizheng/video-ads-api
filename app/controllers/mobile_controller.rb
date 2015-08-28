class MobileController < ApplicationController

	def current_version
		'1.0.8'
	end

	# GET /app
	def app

		if request.user_agent.include? 'iPhone'
			
			redirect_to "/app/#{ current_version }/ios/www/index.html"
		
		elsif request.user_agent.include? 'Android'
			
			redirect_to "/app/#{ current_version }/android/www/index.html"
		
		else
			redirect_to "/404.html"
		end

	end

end