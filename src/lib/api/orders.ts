import type { CartItem } from '../../types/cart'
import type { CheckoutDetails } from '../../types/checkout'
import type { Tables } from '../../types/database'
import { getSupabase } from '../supabase'

type CreateShopOrderInput = {
  details: CheckoutDetails
  items: CartItem[]
  subtotal: number
}

/**
 * Creates a pending order and its line items. If the items fail to save, the
 * order is deleted so no empty order is left behind. Payment isn't taken yet.
 */
export async function createShopOrder({
  details,
  items,
  subtotal,
}: CreateShopOrderInput): Promise<Tables<'shop_orders'>> {
  const supabase = getSupabase()

  const { data: order, error: orderError } = await supabase
    .from('shop_orders')
    .insert({
      order_number: `TTH-${Date.now()}`,
      customer_name: details.fullName.trim(),
      customer_email: details.email.trim() || null,
      customer_phone: details.phone.trim(),
      county: details.county.trim(),
      town: details.town.trim(),
      delivery_address: details.address.trim(),
      notes: details.notes.trim() || null,
      currency: 'KES',
      subtotal,
      delivery_fee: 0,
      total_amount: subtotal,
      payment_status: 'pending',
      order_status: 'pending',
    })
    .select()
    .single()

  if (orderError) {
    throw orderError
  }

  const { error: itemsError } = await supabase.from('shop_order_items').insert(
    items.map((item) => ({
      order_id: order.id,
      product_id: item.id,
      product_name: item.name,
      quantity: item.quantity,
      unit_price: item.price,
      line_total: item.price * item.quantity,
    })),
  )

  if (itemsError) {
    await supabase.from('shop_orders').delete().eq('id', order.id)
    throw itemsError
  }

  return order
}
