class Subscription
  include Mongoid::Document
  include Mongoid::Timestamps

  before_save :set_expire_and_status

  # after_create :set_expire_status, :set_activate_status

  field :status,      type: String,   default: 'requested'
  field :product,     type: Hash
  field :start_at,    type: DateTime, default: DateTime.now
  field :expire_at,   type: DateTime
  field :admin_token_for_cancellation, type: String
  field :admin_token_for_approval, type: String

  belongs_to :user
  has_one    :payment

  def set_expire_status
    if !self.cancel? and self.expire?
      self.expire
      self.save
    end
  end

  def set_activated_status
    if !self.cancel? and !self.expire? and self.start?
      self.activate
      self.save
    end
  end

  def when_to_expire_subscription
    time_diff = 10000
    if self.product.present?
      time_diff = self.expire_at.to_i - DateTime.now.to_i >= 0 ? self.expire_at.to_i - DateTime.now.to_i : 0
    end
    time_diff.seconds.from_now
  end

  def when_to_activate_subscription
    time_diff = 100
    if self.product.present?
      time_diff = self.start_at.to_i - DateTime.now.to_i >= 0 ? self.start_at.to_i - DateTime.now.to_i : 0
    end
    time_diff.seconds.from_now
  end

  def expire?
    DateTime.now > self.expire_at
  end

  def start?
    DateTime.now > self.start_at
  end

  def cancel?
    self.status == 'canceled'
  end

  def activate?
    self.status == 'activated'
  end

  def approve
    self.status = 'unactivated'
    self.start_at = DateTime.now 
    self.reindex
  end

  def expire
    self.status = 'expired'
    self.reindex
  end

  def activate
    self.status = 'activated'
    self.reindex
  end

  def cancel
    self.status = 'canceled'
    self.reindex
  end

  def reindex
    Sunspot.index! [self.user]
    Sunspot.index! self.user.promotions
  end

  def get_id
  	self.id.to_s
  end 

  def set_expire_and_status
    if self.product.present?
        self.expire_at = self.start_at + self.product[:time].seconds
    end
  end

  def start_to_set_expire_status
    if self.product.present? and self.user.present?
      self.set_expire_status
      self.delay(:run_at => self.when_to_expire_subscription).set_expire_status
    end
  end

  def start_to_set_activate_status
    if self.product.present? and self.user.present?
      self.set_activated_status
      self.delay(:run_at => self.when_to_activate_subscription).set_activated_status
    end
  end

end