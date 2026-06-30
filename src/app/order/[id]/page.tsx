import { OrderTrackingFlow } from "@/components/flows/order-tracking-flow";
import { TableQrOrderingFlow } from "@/components/flows/table-qr-ordering-flow";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (id.includes(".")) return <TableQrOrderingFlow token={id} />;

  return <OrderTrackingFlow orderId={id} />;
}
