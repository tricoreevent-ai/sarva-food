import { type NextRequest } from "next/server";
import { handleModuleLogin } from "@/lib/server/module-auth";

export async function POST(request: NextRequest) {
  return handleModuleLogin(request, "admin");
}
