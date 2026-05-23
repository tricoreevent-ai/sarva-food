import { OrderSuccessFlow } from "@/components/flows/order-success-flow";

export default async function OrderSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;

  return <OrderSuccessFlow orderId={orderId} />;
}
