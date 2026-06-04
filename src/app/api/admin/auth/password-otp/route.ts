import { type NextRequest } from "next/server";
import { handleModulePasswordOtp } from "@/lib/server/module-auth";

export async function POST(request: NextRequest) {
  return handleModulePasswordOtp(request, "admin");
}
