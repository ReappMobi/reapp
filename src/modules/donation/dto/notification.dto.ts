type NotificationType =
  | 'payment'
  | 'subscription_preapproval'
  | 'subscription_preapproval_plan'
  | 'subscription_authorized_payment'
  | 'point_integration_wh'
  | 'topic_claims_integration_wh'
  | 'topic_merchant_order_wh'
  | 'topic_chargebacks_wh'

export abstract class NotificationRequestDto {
  id: number
  live_mode: boolean
  type: NotificationType
  date_created: string
  user_id: number
  api_version: string
  action: string
  data: {
    id: string
  }
}
