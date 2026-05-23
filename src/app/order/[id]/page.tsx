import { OrderTrackingFlow } from "@/components/flows/order-tracking-flow";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <OrderTrackingFlow orderId={id} />;
}
