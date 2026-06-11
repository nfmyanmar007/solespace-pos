import { supabase } from './supabase'

const STORE_ID    = 'a0000000-0000-0000-0000-000000000001'
const REGISTER_ID = 'c0000000-0000-0000-0000-000000000001'

function generateRef() {
  const d = new Date().toISOString().slice(0,10).replace(/-/g,'')
  const r = Math.floor(Math.random() * 9000) + 1000
  return `SS-${d}-${r}`
}

export async function saveTransaction({
  staffId,
  customerId,
  items,
  subtotal,
  discountAmt,
  total,
  paymentMethod,
  cashTendered,
  changeGiven,
}) {
  try {
    const refNumber = generateRef()

    // 1. Insert transaction
    const { data: txn, error: txnError } = await supabase
      .from('transactions')
      .insert({
        store_id:     STORE_ID,
        register_id:  REGISTER_ID,
        staff_id:     staffId,
        customer_id:  customerId || null,
        ref_number:   refNumber,
        status:       'completed',
        subtotal:     subtotal,
        discount_amt: discountAmt || 0,
        tax_rate:     0,
        tax_amt:      0,
        total:        total,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (txnError) throw txnError

    // 2. Insert line items
    const lineItems = items.map((item) => ({
      transaction_id: txn.id,
      variant_id:     item.variantId,
      qty:            item.qty,
      unit_price:     item.price,
      line_discount:  0,
      line_total:     item.price * item.qty,
    }))

    const { error: itemsError } = await supabase
      .from('transaction_items')
      .insert(lineItems)

    if (itemsError) throw itemsError

    // 3. Insert payment
    const { error: payError } = await supabase
      .from('payments')
      .insert({
        transaction_id: txn.id,
        method:         paymentMethod,
        amount:         total,
        cash_tendered:  cashTendered || null,
        change_given:   changeGiven  || null,
        status:         'approved',
        processed_at:   new Date().toISOString(),
      })

    if (payError) throw payError

    // 4. Decrement inventory
    for (const item of items) {
      const { data: inv } = await supabase
        .from('inventory')
        .select('qty_on_hand')
        .eq('variant_id', item.variantId)
        .eq('store_id', STORE_ID)
        .single()

      if (inv) {
        await supabase
          .from('inventory')
          .update({
            qty_on_hand: Math.max(0, inv.qty_on_hand - item.qty),
            updated_at:  new Date().toISOString(),
          })
          .eq('variant_id', item.variantId)
          .eq('store_id', STORE_ID)
      }
    }

    // 5. Update customer stats
    if (customerId) {
      const { data: cust } = await supabase
        .from('customers')
        .select('lifetime_spend, visit_count')
        .eq('id', customerId)
        .single()

      if (cust) {
        await supabase
          .from('customers')
          .update({
            lifetime_spend: (parseFloat(cust.lifetime_spend) || 0) + total,
            visit_count:    (cust.visit_count || 0) + 1,
          })
          .eq('id', customerId)
      }
    }

    return { success: true, refNumber, transactionId: txn.id }
  } catch (err) {
    console.error('Transaction error:', err)
    return { success: false, error: err.message }
  }
}
