import { OrderTrackingFlow } from "@/components/flows/order-tracking-flow";
import { TableQrOrderingFlow } from "@/components/flows/table-qr-ordering-flow";
import { CustomerRuntimeProviders } from "@/components/layout/customer-shell-runtime";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (id.includes(".")) {
    return (
      <CustomerRuntimeProviders>
        <TableQrOrderingFlow token={id} />
      </CustomerRuntimeProviders>
    );
  }

  return <OrderTrackingFlow orderId={id} />;
}
