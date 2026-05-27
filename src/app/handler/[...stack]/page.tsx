import { StackHandler } from "@stackframe/stack";

export default function CustomerStackAuthHandler(props: unknown) {
  return <StackHandler fullPage {...(props as Record<string, unknown>)} />;
}
