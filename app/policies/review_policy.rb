class ReviewPolicy < ApplicationPolicy

  class Scope < Scope
    def resolve
      if user.is_admin?
        scope.all
      else
        user.reviews
      end
    end
  end

  def create?
    # only admin has the premision to add a promotion
    user.id != record.reviewee.id
  end

  def update?
    user.has_role? :moderator, record
  end

  def destory?
    user.has_role? :moderator, record
  end

end