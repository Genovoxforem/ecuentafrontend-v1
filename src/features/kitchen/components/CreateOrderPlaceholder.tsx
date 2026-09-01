import { ClipboardPlus, LayoutGrid, ShoppingCart, Table2 } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

// Native replacement for linking out to takeposnew/waiter_order.php — a
// full waiter/POS order-creation terminal backed by a large real endpoint
// (takeposnew/ajax/waiter_ajax.php: cart/draft-order/edit/delete actions,
// confirmed by reading it directly). This is a full interactive terminal
// (table selector, product grid, live cart), not a simple form — the 3
// real panels are shown below as an inert structural preview rather than
// a rebuilt POS terminal, which is well beyond this pass's scope.
export function CreateOrderPlaceholder() {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <ClipboardPlus size={20} className="text-brand" /> Create Orders
      </h2>

      <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
        <p className="text-xs text-info-fg">
          Real page: <code className="font-mono">takeposnew/waiter_order.php</code> — a full waiter/POS order-creation terminal backed by{' '}
          <code className="font-mono">takeposnew/ajax/waiter_ajax.php</code>. Its 3 real panels are shown below as an inert preview; rebuilding the full interactive terminal is out of scope for
          this pass.
        </p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="!h-auto space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text!">
            <Table2 size={16} className="text-brand" /> Table / Place
          </h3>
          <div className="grid grid-cols-4 gap-1.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-md border border-border bg-input-bg" />
            ))}
          </div>
        </Card>
        <Card className="!h-auto space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text!">
            <LayoutGrid size={16} className="text-brand" /> Product Grid
          </h3>
          <div className="grid grid-cols-3 gap-1.5">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-md border border-border bg-input-bg" />
            ))}
          </div>
        </Card>
        <Card className="!h-auto space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text!">
            <ShoppingCart size={16} className="text-brand" /> Cart
          </h3>
          <div className="space-y-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 rounded-md border border-border bg-input-bg" />
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
