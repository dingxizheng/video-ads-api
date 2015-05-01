class PromotionPolicy < ApplicationPolicy

  class Scope < Scope
    def resolve
      if user.is_admin?
        scope.all
      else
        user.promotions
      end
    end
  end

  def create?
    # only admin and customer has to premision to add a promotion
    user.has_any_role? :admin, :customer, :user
  end

  def update?
    user.has_role? :moderator, record
  end

  def destory?
    user.has_role? :moderator, record
  end

end